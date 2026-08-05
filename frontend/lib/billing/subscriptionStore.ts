import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import { isStripeConfigured } from "@/lib/billing/stripeClient";
import { hasLifetimeAnalysisAccess } from "@/lib/billing/lifetimeAccess";
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

const dataDirectory = path.join(process.cwd(), ".data");
const subscriptionsFile = path.join(dataDirectory, "subscriptions.json");
let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;
let localQueue: Promise<unknown> = Promise.resolve();

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  databaseReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS billing_subscriptions (
        user_id TEXT PRIMARY KEY,
        customer_id TEXT UNIQUE NOT NULL,
        subscription_id TEXT UNIQUE NOT NULL,
        status VARCHAR(30) NOT NULL,
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined);
  return pool;
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
  const hasPaidAccess =
    subscription?.status === "active" || subscription?.status === "trialing";
  const commercial =
    getCommercialReadiness();

  return {
    hasAccess:
      developmentUnlock ||
      previewUnlock ||
      lifetimeUnlock ||
      hasPaidAccess,
    status: lifetimeUnlock
      ? "lifetime"
      : developmentUnlock || previewUnlock
        ? "active"
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
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
  };
}
