import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

const variableNames = [
  "ANALYSIS_PRICE_MONTHLY_CENTS",
  "ANALYSIS_PRICE_ANNUAL_CENTS",
  "ANALYSIS_PREVIEW_EMAILS",
  "AUTH_URL",
  "COMMERCIAL_LAUNCH_ENABLED",
  "LEGAL_ADDRESS",
  "LEGAL_DOCUMENTS_REVIEWED",
  "LEGAL_ENTITY_NAME",
  "LEGAL_PRIVACY_VERSION",
  "LEGAL_PUBLICATION_DIRECTOR",
  "LEGAL_REGISTRATION_NUMBER",
  "LEGAL_TERMS_VERSION",
  "PRIVACY_EMAIL",
  "STRIPE_PRICE_ID",
  "STRIPE_PRICE_ID_ANNUAL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SUPPORT_EMAIL",
] as const;

describe("commercial launch guard", () => {
  const original = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const name of variableNames) {
      original.set(name, process.env[name]);
      delete process.env[name];
    }
  });

  afterEach(() => {
    for (const name of variableNames) {
      const value = original.get(name);
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it("keeps payment disabled when launch requirements are missing", async () => {
    const { getCommercialReadiness } =
      await import("@/lib/commercial/config");
    expect(getCommercialReadiness()).toMatchObject({
      launchEnabled: false,
      ready: false,
      priceMonthlyCents: 299,
      priceAnnualCents: 2499,
    });
  });

  it("allows only listed preview accounts before launch", async () => {
    process.env.ANALYSIS_PREVIEW_EMAILS =
      "owner@example.com, tester@example.com";
    const { hasPreviewAnalysisAccess } =
      await import("@/lib/commercial/config");
    expect(
      hasPreviewAnalysisAccess("OWNER@example.com"),
    ).toBe(true);
    expect(
      hasPreviewAnalysisAccess("public@example.com"),
    ).toBe(false);
  });

  it("reports ready only after every explicit launch requirement", async () => {
    Object.assign(process.env, {
      AUTH_URL: "https://chess.example.com",
      COMMERCIAL_LAUNCH_ENABLED: "true",
      LEGAL_ADDRESS: "1 rue du Test",
      LEGAL_DOCUMENTS_REVIEWED: "true",
      LEGAL_ENTITY_NAME: "Chess Coach",
      LEGAL_PRIVACY_VERSION: "2026-01",
      LEGAL_PUBLICATION_DIRECTOR: "Direction",
      LEGAL_REGISTRATION_NUMBER: "TEST-123",
      LEGAL_TERMS_VERSION: "2026-01",
      PRIVACY_EMAIL: "privacy@example.com",
      STRIPE_PRICE_ID: "price_test",
      STRIPE_PRICE_ID_ANNUAL: "price_annual_test",
      STRIPE_SECRET_KEY: "sk_test_value",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      SUPPORT_EMAIL: "support@example.com",
    });
    const { getCommercialReadiness } =
      await import("@/lib/commercial/config");
    expect(getCommercialReadiness()).toMatchObject({
      launchEnabled: true,
      ready: true,
      missing: [],
    });
  });
});
