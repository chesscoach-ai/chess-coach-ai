import "server-only";

import { isStripeConfigured } from "@/lib/billing/stripeClient";
import { getKnightlyPricing, KNIGHTLY_TARGET_PRICING } from "@/lib/billing/pricing";

const REQUIRED_LEGAL_VARIABLES = [
  "LEGAL_ENTITY_NAME",
  "LEGAL_ADDRESS",
  "LEGAL_REGISTRATION_NUMBER",
  "LEGAL_PUBLICATION_DIRECTOR",
  "SUPPORT_EMAIL",
  "PRIVACY_EMAIL",
  "LEGAL_TERMS_VERSION",
  "LEGAL_PRIVACY_VERSION",
] as const;

export type CommercialReadiness = {
  launchEnabled: boolean;
  ready: boolean;
  priceMonthlyCents: number;
  priceAnnualCents: number;
  missing: string[];
};

export function getAnalysisPriceMonthlyCents(): number {
  const configured = Number.parseInt(
    process.env.ANALYSIS_PRICE_MONTHLY_CENTS ?? String(KNIGHTLY_TARGET_PRICING.monthlyCents),
    10,
  );
  return Number.isSafeInteger(configured) &&
    configured >= 50 &&
    configured <= 10_000
    ? configured
    : KNIGHTLY_TARGET_PRICING.monthlyCents;
}

export function getAnalysisPriceAnnualCents(): number {
  const configured = Number.parseInt(
    process.env.ANALYSIS_PRICE_ANNUAL_CENTS ?? String(KNIGHTLY_TARGET_PRICING.annualCents),
    10,
  );
  return Number.isSafeInteger(configured) &&
    configured >= 500 &&
    configured <= 100_000
    ? configured
    : KNIGHTLY_TARGET_PRICING.annualCents;
}

export function getCommercialReadiness(): CommercialReadiness {
  const pricing = getKnightlyPricing();
  const missing = REQUIRED_LEGAL_VARIABLES.filter(
    (name) => !process.env[name]?.trim(),
  ) as string[];
  if (!isStripeConfigured()) {
    missing.push("STRIPE_CONFIGURATION");
  }
  if (!pricing.plusEnabled) missing.push("KNIGHTLY_PLUS_ENABLED");
  if (!pricing.checkoutEnabled) missing.push("KNIGHTLY_CHECKOUT_ENABLED");
  if (!pricing.pricesAligned) missing.push("KNIGHTLY_PRICES_ALIGNED");
  if (process.env.LEGAL_DOCUMENTS_REVIEWED !== "true") {
    missing.push("LEGAL_DOCUMENTS_REVIEWED");
  }
  if (!process.env.AUTH_URL?.startsWith("https://")) {
    missing.push("AUTH_URL_HTTPS");
  }
  return {
    launchEnabled:
      process.env.COMMERCIAL_LAUNCH_ENABLED === "true",
    ready: missing.length === 0,
    priceMonthlyCents:
      getAnalysisPriceMonthlyCents(),
    priceAnnualCents:
      getAnalysisPriceAnnualCents(),
    missing,
  };
}

export function assertCommercialLaunchReady(): void {
  const readiness = getCommercialReadiness();
  if (!readiness.launchEnabled) {
    throw new Error("COMMERCIAL_LAUNCH_DISABLED");
  }
  if (!readiness.ready) {
    throw new Error("COMMERCIAL_LAUNCH_NOT_READY");
  }
}

export function hasPreviewAnalysisAccess(
  userId: string | null,
): boolean {
  if (!userId || getCommercialReadiness().launchEnabled) {
    return false;
  }
  const allowed = (
    process.env.ANALYSIS_PREVIEW_EMAILS ?? ""
  )
    .split(",")
    .map((email) =>
      email.trim().toLocaleLowerCase("fr"),
    )
    .filter(Boolean);
  return allowed.includes(
    userId.trim().toLocaleLowerCase("fr"),
  );
}

export function getLegalIdentity() {
  return {
    entityName:
      process.env.LEGAL_ENTITY_NAME ??
      "Éditeur à renseigner avant lancement",
    address:
      process.env.LEGAL_ADDRESS ??
      "Adresse à renseigner avant lancement",
    registrationNumber:
      process.env.LEGAL_REGISTRATION_NUMBER ??
      "Numéro d’immatriculation à renseigner",
    publicationDirector:
      process.env.LEGAL_PUBLICATION_DIRECTOR ??
      "Responsable de publication à renseigner",
    supportEmail:
      process.env.SUPPORT_EMAIL ??
      "support@example.invalid",
    privacyEmail:
      process.env.PRIVACY_EMAIL ??
      "privacy@example.invalid",
    documentsReviewed:
      process.env.LEGAL_DOCUMENTS_REVIEWED === "true",
  };
}
