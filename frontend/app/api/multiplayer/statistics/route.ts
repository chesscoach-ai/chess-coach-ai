import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getOnlinePlayerStatistics } from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function GET() {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error("AUTH_REQUIRED");
    }

    return noStoreJson({
      statistics:
        await getOnlinePlayerStatistics(
          player,
        ),
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
