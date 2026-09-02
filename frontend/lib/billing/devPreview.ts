import { getKnightlyEntitlements, type KnightlyEntitlements } from "@/lib/billing/knightlyPolicy";

export type KnightlyDevPreview = "free" | "plus" | "quota" | "soft" | "unavailable";

export function resolveKnightlyDevPreview(
  requested: string | null | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): KnightlyDevPreview | null {
  if (nodeEnv === "production") return null;
  return requested === "free" || requested === "plus" || requested === "quota" || requested === "soft" || requested === "unavailable"
    ? requested
    : null;
}

export function previewEntitlements(preview: KnightlyDevPreview): KnightlyEntitlements {
  if (preview === "plus") return getKnightlyEntitlements("plus", "plus_active");
  if (preview === "unavailable") return getKnightlyEntitlements("free", "billing_unavailable");
  return getKnightlyEntitlements("free", "free");
}
