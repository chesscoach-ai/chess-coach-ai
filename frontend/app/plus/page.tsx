import KnightlyPlusOverview from "@/components/Billing/KnightlyPlusOverview";
import { previewEntitlements, resolveKnightlyDevPreview } from "@/lib/billing/devPreview";
import { getKnightlyEntitlements } from "@/lib/billing/knightlyPolicy";
import { getKnightlyPricing } from "@/lib/billing/pricing";

export default async function KnightlyPlusPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const preview = resolveKnightlyDevPreview((await searchParams).preview);
  const pricing = getKnightlyPricing();
  const entitlements = preview ? previewEntitlements(preview) : getKnightlyEntitlements("free", pricing.availability === "unavailable" ? "billing_unavailable" : "free");
  return <KnightlyPlusOverview entitlements={entitlements} pricing={pricing} preview={preview} />;
}
