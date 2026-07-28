import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { listFinishedOnlineGames } from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import { getGameReviewAllowance } from "@/lib/billing/gameReviewStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error("AUTH_REQUIRED");
    }

    const entitlement =
      await getAnalysisEntitlement(
        player.id,
      );
    const allowance =
      await getGameReviewAllowance(
        player.id,
        entitlement.hasAccess,
      );
    const storedGames =
      await listFinishedOnlineGames(
        player,
        allowance.unlockedGameIds,
      );
    const games =
      entitlement.hasAccess
        ? storedGames.map((game) => ({
            ...game,
            reviewUnlocked: true,
          }))
        : storedGames;

    return noStoreJson({
      games,
      allowance,
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
