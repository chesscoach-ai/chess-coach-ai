import { z } from "zod";

import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import {
  offerOnlineGameDraw,
  respondToOnlineGameDraw,
} from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const drawActionSchema = z.object({
  action: z.enum(["offer", "accept", "decline"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = drawActionSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    const { gameId } = await params;
    const game =
      parsed.data.action === "offer"
        ? await offerOnlineGameDraw(gameId, player)
        : await respondToOnlineGameDraw(
            gameId,
            player,
            parsed.data.action === "accept",
          );
    return noStoreJson({ game });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
