import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { sendTestPush } from "@/lib/push/pushStore";

export const runtime = "nodejs";

export async function POST() {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    const sent =
      await sendTestPush(player);
    return noStoreJson({ sent });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
