import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("centralized Knightly entitlements", () => {
  const originalDirectory = process.cwd();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDevelopmentUnlock = process.env.ANALYSIS_DEV_UNLOCK;
  let temporaryDirectory = "";
  let store: typeof import("@/lib/billing/subscriptionStore");

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "knightly-entitlements-"));
    process.chdir(temporaryDirectory);
    delete process.env.DATABASE_URL;
    process.env.ANALYSIS_DEV_UNLOCK = "false";
    vi.resetModules();
    store = await import("@/lib/billing/subscriptionStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalDevelopmentUnlock === undefined) delete process.env.ANALYSIS_DEV_UNLOCK;
    else process.env.ANALYSIS_DEV_UNLOCK = originalDevelopmentUnlock;
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("does not create a trial when an account is merely read", async () => {
    const entitlement = await store.getAnalysisEntitlement("new-player@example.test");
    expect(entitlement.hasAccess).toBe(false);
    expect(entitlement.status).toBe("inactive");
    expect(entitlement.trialEndsAt).toBeNull();
    expect(entitlement.knightly).toMatchObject({ plan: "free", canPlay: true, canUseDailySession: true, canEvolveNox: true });
    await expect(access(path.join(temporaryDirectory, ".data", "analysis-trials.json"))).rejects.toThrow();
  });

  it("keeps the visitor useful without granting premium server access", async () => {
    const guest = await store.getAnalysisEntitlement(null);
    expect(guest.hasAccess).toBe(false);
    expect(guest.knightly.canUseNox).toBe(true);
    expect(guest.knightly.canUseFreeExercises).toBe(true);
    expect(guest.knightly.competitiveAdvantages).toBe(false);
  });
});
