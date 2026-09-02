import { describe, expect, it } from "vitest";
import { getKnightlyPricing } from "@/lib/billing/pricing";

describe("Knightly pricing source of truth", () => {
  it("distinguishes target pricing from unavailable commercial pricing", () => {
    const pricing = getKnightlyPricing({ NODE_ENV: "test" });
    expect(pricing.target).toMatchObject({ monthlyCents: 200, annualCents: 1999 });
    expect(pricing.activeMonthlyCents).toBeNull();
    expect(pricing.availability).toBe("unavailable");
  });

  it("requires explicit flags and aligned amounts", () => {
    const base = { KNIGHTLY_PLUS_ENABLED: "true", KNIGHTLY_CHECKOUT_ENABLED: "true", COMMERCIAL_LAUNCH_ENABLED: "true", ANALYSIS_PRICE_MONTHLY_CENTS: "299", ANALYSIS_PRICE_ANNUAL_CENTS: "2499" };
    expect(getKnightlyPricing(base).availability).toBe("preview");
    const aligned = { ...base, ANALYSIS_PRICE_MONTHLY_CENTS: "200", ANALYSIS_PRICE_ANNUAL_CENTS: "1999" };
    expect(getKnightlyPricing(aligned).availability).toBe("preview");
    expect(getKnightlyPricing({ ...aligned, STRIPE_SECRET_KEY: "test", STRIPE_PRICE_ID: "monthly", STRIPE_PRICE_ID_ANNUAL: "annual", STRIPE_WEBHOOK_SECRET: "webhook" }).availability).toBe("available");
  });
});
