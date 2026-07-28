import { z } from "zod";

import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import { createOnlineGame } from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const createGameSchema = z.object({
  minutes: z
    .number()
    .int()
    .refine((value) =>
      [1, 3, 5, 10, 15].includes(
        value,
      ),
    ),
});

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = createGameSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");

    const game = await createOnlineGame(player, parsed.data.minutes);
    return noStoreJson({ game }, { status: 201 });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
