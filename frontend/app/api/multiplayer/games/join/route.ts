import { z } from "zod";

import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import { joinOnlineGame } from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const joinGameSchema = z.object({
  inviteCode: z.string().trim().min(6).max(8),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = joinGameSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");

    const game = await joinOnlineGame(parsed.data.inviteCode, player);
    return noStoreJson({ game });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
