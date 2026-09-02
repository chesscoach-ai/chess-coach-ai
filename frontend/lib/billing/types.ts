export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "paused"
  | "canceled";

export type AnalysisAccessStatus = SubscriptionStatus | "lifetime";

export type AnalysisEntitlement = {
  hasAccess: boolean;
  status: AnalysisAccessStatus;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  billingConfigured: boolean;
  commercialLaunchEnabled: boolean;
  canManage: boolean;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  knightly: import("@/lib/billing/knightlyPolicy").KnightlyEntitlements;
  pricingAvailability: "preview" | "unavailable" | "available";
};

export type BillingSubscription = {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
};
