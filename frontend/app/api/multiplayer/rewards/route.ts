import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  claimBattleReward,
  getBattleRewardDashboard,
} from "@/lib/rewards/battleRewardStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    return noStoreJson({
      rewards:
        await getBattleRewardDashboard(
          player,
        ),
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}

export async function POST() {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    return noStoreJson({
      rewards:
        await claimBattleReward(
          player,
        ),
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
