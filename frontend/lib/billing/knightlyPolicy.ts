export const KNIGHTLY_POLICY_VERSION = "knightly-freemium-v1" as const;

export type KnightlyPlan = "free" | "plus";
export type KnightlyAccessState =
  | "free"
  | "plus_active"
  | "plus_expired"
  | "plus_cancelled"
  | "billing_unavailable";

export type KnightlyEntitlements = {
  policyVersion: typeof KNIGHTLY_POLICY_VERSION;
  plan: KnightlyPlan;
  accessState: KnightlyAccessState;
  canPlay: true;
  canUseNox: true;
  canUseDailySession: true;
  canEvolveNox: true;
  canUseClan: true;
  canUseFreeExercises: true;
  dailyPersonalizedSessions: number;
  gameReviewsPerAccount: number | null;
  missionAccess: "daily" | "extended";
  memoryDepth: "essential" | "deep";
  memoryLookbackDays: number;
  advancedInsights: boolean;
  competitiveAdvantages: false;
};

const SHARED = {
  policyVersion: KNIGHTLY_POLICY_VERSION,
  canPlay: true,
  canUseNox: true,
  canUseDailySession: true,
  canEvolveNox: true,
  canUseClan: true,
  canUseFreeExercises: true,
  competitiveAdvantages: false,
} as const;

export function getKnightlyEntitlements(
  plan: KnightlyPlan,
  accessState: KnightlyAccessState = plan === "plus" ? "plus_active" : "free",
): KnightlyEntitlements {
  return plan === "plus"
    ? {
        ...SHARED,
        plan,
        accessState,
        dailyPersonalizedSessions: 3,
        gameReviewsPerAccount: null,
        missionAccess: "extended",
        memoryDepth: "deep",
        memoryLookbackDays: 365,
        advancedInsights: true,
      }
    : {
        ...SHARED,
        plan,
        accessState,
        dailyPersonalizedSessions: 1,
        gameReviewsPerAccount: 3,
        missionAccess: "daily",
        memoryDepth: "essential",
        memoryLookbackDays: 30,
        advancedInsights: false,
      };
}

export function hasCompetitiveAdvantage(entitlements: KnightlyEntitlements): boolean {
  return entitlements.competitiveAdvantages;
}
