import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import type { JourneyLedger } from "@/lib/progression/journey";
import { syncJourneyDashboard } from "@/lib/progression/progressionStore";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
) {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    const payload =
      (await request.json()) as {
        ledger?: JourneyLedger;
      };
    return noStoreJson({
      dashboard:
        await syncJourneyDashboard(
          player,
          payload.ledger ?? {},
        ),
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
