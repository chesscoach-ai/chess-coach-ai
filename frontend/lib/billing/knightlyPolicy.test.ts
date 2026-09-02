import { describe, expect, it } from "vitest";
import { getKnightlyEntitlements, hasCompetitiveAdvantage, KNIGHTLY_POLICY_VERSION } from "@/lib/billing/knightlyPolicy";

describe("Knightly freemium policy", () => {
  it("keeps the fundamental learning loop in Free", () => {
    const free = getKnightlyEntitlements("free");
    expect(free.policyVersion).toBe(KNIGHTLY_POLICY_VERSION);
    expect(free).toMatchObject({ canPlay: true, canUseNox: true, canUseDailySession: true, canUseFreeExercises: true, canEvolveNox: true, canUseClan: true });
    expect(free.gameReviewsPerAccount).toBe(3);
  });

  it("deepens coaching in Plus without competitive advantage", () => {
    const plus = getKnightlyEntitlements("plus");
    expect(plus.dailyPersonalizedSessions).toBeGreaterThan(1);
    expect(plus.memoryDepth).toBe("deep");
    expect(plus.advancedInsights).toBe(true);
    expect(hasCompetitiveAdvantage(plus)).toBe(false);
  });
});
