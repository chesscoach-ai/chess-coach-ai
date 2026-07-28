import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import { getLearningProfile } from "@/lib/learning/profileStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function GET() {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const entitlement = await getAnalysisEntitlement(player.id);
    if (!entitlement.hasAccess) throw new Error("SUBSCRIPTION_REQUIRED");
    return Response.json(
      { profile: await getLearningProfile(player) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return billingErrorResponse(error);
  }
}
