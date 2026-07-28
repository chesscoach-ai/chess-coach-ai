import { z } from "zod";

import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import {
  getOnlineGame,
  listFinishedOnlineGames,
  saveOnlineGameAccuracy,
} from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import {
  canAccessGameReview,
  unlockGameReview,
} from "@/lib/billing/gameReviewStore";

export const runtime = "nodejs";

const completeSchema = z.object({
  whiteAccuracy: z.number().min(0).max(100),
  blackAccuracy: z.number().min(0).max(100),
});

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      gameId: string;
    }>;
  },
) {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error("AUTH_REQUIRED");
    }
    const { gameId } = await params;
    const game = await getOnlineGame(
      gameId,
      player,
    );
    if (game.status !== "finished") {
      throw new Error(
        "GAME_NOT_FINISHED",
      );
    }

    const entitlement =
      await getAnalysisEntitlement(
        player.id,
      );
    const allowance =
      await unlockGameReview(
        player.id,
        gameId,
        entitlement.hasAccess,
      );
    const history =
      await listFinishedOnlineGames(
        player,
        allowance.unlockedGameIds,
      );
    const storedSelection = history.find(
      (item) => item.id === gameId,
    );
    if (!storedSelection) {
      throw new Error(
        "GAME_NOT_FOUND",
      );
    }
    const selected = {
      ...storedSelection,
      reviewUnlocked: true,
    };

    return noStoreJson({
      game: selected,
      allowance,
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      gameId: string;
    }>;
  },
) {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error("AUTH_REQUIRED");
    }
    const { gameId } = await params;
    const entitlement =
      await getAnalysisEntitlement(
        player.id,
      );
    const allowed =
      await canAccessGameReview(
        player.id,
        gameId,
        entitlement.hasAccess,
      );
    if (!allowed) {
      throw new Error(
        "REVIEW_LIMIT_REACHED",
      );
    }
    const parsed =
      completeSchema.safeParse(
        await request.json(),
      );
    if (!parsed.success) {
      throw new Error(
        "INVALID_REQUEST",
      );
    }

    await saveOnlineGameAccuracy(
      gameId,
      player,
      parsed.data.whiteAccuracy,
      parsed.data.blackAccuracy,
    );

    return noStoreJson({
      saved: true,
    });
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
