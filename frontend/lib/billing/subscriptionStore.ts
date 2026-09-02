import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";

import { isStripeConfigured } from "@/lib/billing/stripeClient";
import { hasLifetimeAnalysisAccess } from "@/lib/billing/lifetimeAccess";
import {
  ensureDatabaseMigrations,
  getPostgresPool,
} from "@/lib/database/postgres";
import type {
  AnalysisEntitlement,
  BillingSubscription,
  SubscriptionStatus,
} from "@/lib/billing/types";
import {
  getAnalysisPriceAnnualCents,
  getAnalysisPriceMonthlyCents,
  getCommercialReadiness,
  hasPreviewAnalysisAccess,
} from "@/lib/commercial/config";
import { getKnightlyEntitlements, type KnightlyAccessState } from "@/lib/billing/knightlyPolicy";
import { getKnightlyPricing } from "@/lib/billing/pricing";

const dataDirectory = path.join(process.cwd(), ".data");
const subscriptionsFile = path.join(dataDirectory, "subscriptions.json");
const trialsFile = path.join(dataDirectory, "analysis-trials.json");
let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;
let localQueue: Promise<unknown> = Promise.resolve();

function getPool(): Pool | null {
  pool ??= getPostgresPool();
  if (!pool) return null;
  databaseReady ??= ensureDatabaseMigrations(pool);
  return pool;
}

type AnalysisTrial = {
  startedAt: string;
  endsAt: string;
};

function getTrialUserHash(userId: string): string {
  return createHash("sha256")
    .update(userId.trim().toLocaleLowerCase("fr"))
    .digest("hex");
}

async function getAnalysisTrial(
  userId: string,
): Promise<AnalysisTrial | null> {
  const userHash = getTrialUserHash(userId);
  const database = getPool();
  if (!database) {
    try {
      const trials = JSON.parse(await readFile(trialsFile, "utf8")) as Record<string, AnalysisTrial>;
      return trials[userHash] ?? null;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  }

  await databaseReady;
  const result = await database.query<{
    started_at: Date;
    ends_at: Date;
  }>(
    `SELECT started_at, ends_at
     FROM analysis_trial_claims
     WHERE user_hash = $1
     LIMIT 1`,
    [userHash],
  );
  return result.rows[0] ? {
    startedAt: result.rows[0].started_at.toISOString(),
    endsAt: result.rows[0].ends_at.toISOString(),
  } : null;
}

async function readLocalSubscriptions(): Promise<
  Record<string, BillingSubscription>
> {
  try {
    const contents = await readFile(subscriptionsFile, "utf8");
    const parsed: unknown = JSON.parse(contents);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, BillingSubscription>)
      : {};
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeLocalSubscriptions(
  subscriptions: Record<string, BillingSubscription>,
): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(
    subscriptionsFile,
    JSON.stringify(subscriptions, null, 2),
    "utf8",
  );
}

function withLocalLock<T>(
  operation: (
    subscriptions: Record<string, BillingSubscription>,
  ) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(async () => {
    const subscriptions = await readLocalSubscriptions();
    const result = await operation(subscriptions);
    await writeLocalSubscriptions(subscriptions);
    return result;
  });
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function getBillingSubscription(
  userId: string,
): Promise<BillingSubscription | null> {
  const database = getPool();
  if (!database) {
    const subscriptions = await readLocalSubscriptions();
    return subscriptions[userId] ?? null;
  }

  await databaseReady;
  const result = await database.query<{
    user_id: string;
    customer_id: string;
    subscription_id: string;
    status: SubscriptionStatus;
    current_period_end: Date | null;
    cancel_at_period_end: boolean;
    updated_at: Date;
  }>(
    `SELECT user_id, customer_id, subscription_id, status,
            current_period_end, cancel_at_period_end, updated_at
     FROM billing_subscriptions
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );
  const row = result.rows[0];
  return row
    ? {
        userId: row.user_id,
        customerId: row.customer_id,
        subscriptionId: row.subscription_id,
        status: row.status,
        currentPeriodEnd: row.current_period_end?.toISOString() ?? null,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        updatedAt: row.updated_at.toISOString(),
      }
    : null;
}

export async function saveBillingSubscription(
  subscription: Omit<BillingSubscription, "updatedAt">,
): Promise<void> {
  const record: BillingSubscription = {
    ...subscription,
    updatedAt: new Date().toISOString(),
  };
  const database = getPool();
  if (!database) {
    await withLocalLock((subscriptions) => {
      subscriptions[record.userId] = record;
    });
    return;
  }

  await databaseReady;
  await database.query(
    `INSERT INTO billing_subscriptions (
       user_id, customer_id, subscription_id, status,
       current_period_end, cancel_at_period_end, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       customer_id = EXCLUDED.customer_id,
       subscription_id = EXCLUDED.subscription_id,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = NOW()`,
    [
      record.userId,
      record.customerId,
      record.subscriptionId,
      record.status,
      record.currentPeriodEnd,
      record.cancelAtPeriodEnd,
    ],
  );
}

export async function getAnalysisEntitlement(
  userId: string | null,
): Promise<AnalysisEntitlement> {
  const developmentUnlock =
    process.env.NODE_ENV !== "production" &&
    process.env.ANALYSIS_DEV_UNLOCK === "true";
  const previewUnlock =
    hasPreviewAnalysisAccess(userId);
  const lifetimeUnlock = hasLifetimeAnalysisAccess(userId);
  const subscription = userId
    ? await getBillingSubscription(userId)
    : null;
  const trial = userId
    ? await getAnalysisTrial(userId)
    : null;
  const trialIsActive = Boolean(
    trial && new Date(trial.endsAt).getTime() > Date.now(),
  );
  const hasPaidAccess =
    subscription?.status === "active" || subscription?.status === "trialing";
  const commercial =
    getCommercialReadiness();
  const pricing = getKnightlyPricing();
  const hasPlusAccess = developmentUnlock || previewUnlock || lifetimeUnlock || hasPaidAccess || trialIsActive;
  const accessState: KnightlyAccessState = hasPlusAccess
    ? "plus_active"
    : subscription?.status === "canceled"
      ? "plus_cancelled"
      : subscription && ["past_due", "unpaid", "paused"].includes(subscription.status)
        ? "plus_expired"
        : "free";

  return {
    hasAccess: hasPlusAccess,
    status: lifetimeUnlock
      ? "lifetime"
      : developmentUnlock || previewUnlock
        ? "active"
        : hasPaidAccess
          ? subscription!.status
          : trialIsActive
            ? "trialing"
            : subscription?.status ?? "inactive",
    priceMonthlyCents:
      getAnalysisPriceMonthlyCents(),
    priceAnnualCents:
      getAnalysisPriceAnnualCents(),
    billingConfigured:
      isStripeConfigured() &&
      commercial.ready &&
      commercial.launchEnabled,
    commercialLaunchEnabled:
      commercial.launchEnabled,
    canManage: Boolean(subscription?.customerId),
    currentPeriodEnd:
      subscription?.currentPeriodEnd ??
      (trialIsActive ? trial?.endsAt ?? null : null),
    trialEndsAt: trial?.endsAt ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    knightly: getKnightlyEntitlements(hasPlusAccess ? "plus" : "free", accessState),
    pricingAvailability: pricing.availability,
  };
}
