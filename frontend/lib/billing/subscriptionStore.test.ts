import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("analysis trial entitlement", () => {
  const originalDirectory = process.cwd();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDevelopmentUnlock = process.env.ANALYSIS_DEV_UNLOCK;
  let temporaryDirectory = "";
  let store: typeof import("@/lib/billing/subscriptionStore");

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "chess-clan-trial-"),
    );
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
    if (originalDevelopmentUnlock === undefined) {
      delete process.env.ANALYSIS_DEV_UNLOCK;
    } else {
      process.env.ANALYSIS_DEV_UNLOCK = originalDevelopmentUnlock;
    }
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("offers one persistent 30-day trial to an authenticated account", async () => {
    const first = await store.getAnalysisEntitlement("new-player@example.test");
    const second = await store.getAnalysisEntitlement("new-player@example.test");

    expect(first.hasAccess).toBe(true);
    expect(first.status).toBe("trialing");
    expect(first.trialEndsAt).toBeTruthy();
    expect(second.trialEndsAt).toBe(first.trialEndsAt);
    expect(
      new Date(first.trialEndsAt!).getTime() - Date.now(),
    ).toBeGreaterThan(29 * 24 * 60 * 60 * 1_000);
  });

  it("does not start a trial for a visitor", async () => {
    const guest = await store.getAnalysisEntitlement(null);
    expect(guest.hasAccess).toBe(false);
    expect(guest.trialEndsAt).toBeNull();
  });
});
