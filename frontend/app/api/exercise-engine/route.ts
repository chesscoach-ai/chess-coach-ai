import {
  getBackendHeaders,
  getBackendUrl,
} from "@/lib/api/backendServer";
import { billingErrorResponse } from "@/lib/billing/apiResponse";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const entitlement = await getAnalysisEntitlement(player.id);
    if (!entitlement.hasAccess) throw new Error("SUBSCRIPTION_REQUIRED");
  } catch (error) {
    return billingErrorResponse(error);
  }

  try {
    const response = await fetch(
      `${getBackendUrl()}/api/exercises/analyse-position`,
      {
        method: "POST",
        headers: getBackendHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: await request.text(),
        cache: "no-store",
      },
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ??
          "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        detail:
          "Le moteur d’exercices est momentanément indisponible.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
