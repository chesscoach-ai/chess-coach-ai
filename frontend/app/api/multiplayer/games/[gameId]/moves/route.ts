import { z } from "zod";
import type { Square } from "chess.js";

import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import { playOnlineMove } from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const squareSchema = z.custom<Square>(
  (value) => typeof value === "string" && /^[a-h][1-8]$/.test(value),
);
const moveSchema = z.object({
  from: squareSchema,
  to: squareSchema,
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = moveSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    const { gameId } = await params;
    const game = await playOnlineMove(gameId, player, parsed.data);
    return noStoreJson({ game });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
