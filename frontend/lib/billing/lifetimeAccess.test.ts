import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  fingerprintEmail,
  hasLifetimeAnalysisAccess,
} from "@/lib/billing/lifetimeAccess";

const previousHashes = process.env.ANALYSIS_LIFETIME_EMAIL_HASHES;

afterEach(() => {
  if (previousHashes === undefined) {
    delete process.env.ANALYSIS_LIFETIME_EMAIL_HASHES;
  } else {
    process.env.ANALYSIS_LIFETIME_EMAIL_HASHES = previousHashes;
  }
});

describe("lifetime analysis access", () => {
  it("normalizes an email before generating its fingerprint", () => {
    expect(fingerprintEmail("  Player@Example.test ")).toBe(
      fingerprintEmail("player@example.test"),
    );
  });

  it("accepts a server-configured lifetime grant", () => {
    process.env.ANALYSIS_LIFETIME_EMAIL_HASHES = fingerprintEmail(
      "player@example.test",
    );

    expect(hasLifetimeAnalysisAccess(" PLAYER@example.test ")).toBe(true);
    expect(hasLifetimeAnalysisAccess("other@example.test")).toBe(false);
  });
});
