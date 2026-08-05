import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { canAccessGameReview } from "@/lib/billing/gameReviewStore";
import {
  getBackendHeaders,
  getBackendUrl,
} from "@/lib/api/backendServer";

export const runtime = "nodejs";

const allowedPaths = new Set(["analysis", "move-review", "coach/explain"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const player = await getAuthenticatedPlayer();
    const entitlement = await getAnalysisEntitlement(player?.id ?? null);
    const gameReviewId =
      request.headers.get(
        "X-Game-Review-Id",
      );
    const hasReviewAccess =
      player &&
      gameReviewId
        ? await canAccessGameReview(
            player.id,
            gameReviewId,
            entitlement.hasAccess,
          )
        : false;
    if (
      !entitlement.hasAccess &&
      !hasReviewAccess
    ) {
      throw new Error(player ? "SUBSCRIPTION_REQUIRED" : "AUTH_REQUIRED");
    }
    const { path } = await params;
    const endpoint = path.join("/");
    if (!allowedPaths.has(endpoint)) {
      return Response.json({ detail: "Route d’analyse inconnue." }, { status: 404 });
    }

    const response = await fetch(`${getBackendUrl()}/${endpoint}`, {
      method: "POST",
      headers: getBackendHeaders({
        Accept: "application/json",
        "Content-Type": "application/json",
      }),
      body: await request.text(),
      cache: "no-store",
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return billingErrorResponse(error);
  }
}
