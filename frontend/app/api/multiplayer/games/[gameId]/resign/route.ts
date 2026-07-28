import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import { resignOnlineGame } from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const { gameId } = await params;
    const game = await resignOnlineGame(gameId, player);
    return noStoreJson({ game });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
