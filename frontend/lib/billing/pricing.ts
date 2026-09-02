export const KNIGHTLY_TARGET_PRICING = {
  currency: "EUR",
  monthlyCents: 200,
  annualCents: 1_999,
} as const;

export type KnightlyPricing = {
  target: typeof KNIGHTLY_TARGET_PRICING;
  activeMonthlyCents: number | null;
  activeAnnualCents: number | null;
  plusEnabled: boolean;
  checkoutEnabled: boolean;
  pricesAligned: boolean;
  stripeConfigured: boolean;
  availability: "preview" | "unavailable" | "available";
};

function readPositiveCents(value: string | undefined): number | null {
  if (!value) return null;
  const cents = Number.parseInt(value, 10);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

export function getKnightlyPricing(environment: NodeJS.ProcessEnv = process.env): KnightlyPricing {
  const activeMonthlyCents = readPositiveCents(environment.ANALYSIS_PRICE_MONTHLY_CENTS);
  const activeAnnualCents = readPositiveCents(environment.ANALYSIS_PRICE_ANNUAL_CENTS);
  const plusEnabled = environment.KNIGHTLY_PLUS_ENABLED === "true";
  const checkoutEnabled = environment.KNIGHTLY_CHECKOUT_ENABLED === "true";
  const pricesAligned =
    activeMonthlyCents === KNIGHTLY_TARGET_PRICING.monthlyCents &&
    activeAnnualCents === KNIGHTLY_TARGET_PRICING.annualCents;
  const stripeConfigured = Boolean(
    environment.STRIPE_SECRET_KEY && environment.STRIPE_PRICE_ID && environment.STRIPE_PRICE_ID_ANNUAL && environment.STRIPE_WEBHOOK_SECRET,
  );
  const commerciallyReady =
    plusEnabled &&
    checkoutEnabled &&
    environment.COMMERCIAL_LAUNCH_ENABLED === "true" &&
    pricesAligned &&
    stripeConfigured;

  return {
    target: KNIGHTLY_TARGET_PRICING,
    activeMonthlyCents,
    activeAnnualCents,
    plusEnabled,
    checkoutEnabled,
    pricesAligned,
    stripeConfigured,
    availability: commerciallyReady ? "available" : plusEnabled ? "preview" : "unavailable",
  };
}
