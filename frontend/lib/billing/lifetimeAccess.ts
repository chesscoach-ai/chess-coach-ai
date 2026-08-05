import "server-only";

import { createHash } from "node:crypto";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function fingerprintEmail(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export function hasLifetimeAnalysisAccess(email: string | null): boolean {
  if (!email) return false;

  const configuredHashes = (process.env.ANALYSIS_LIFETIME_EMAIL_HASHES ?? "")
    .split(",")
    .map((hash) => hash.trim().toLowerCase())
    .filter(Boolean);
  const fingerprint = fingerprintEmail(email);

  return configuredHashes.includes(fingerprint);
}
