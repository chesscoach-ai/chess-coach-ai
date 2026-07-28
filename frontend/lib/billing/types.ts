export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "paused"
  | "canceled";

export type AnalysisEntitlement = {
  hasAccess: boolean;
  status: SubscriptionStatus;
  priceMonthlyCents: 200;
  billingConfigured: boolean;
  canManage: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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
