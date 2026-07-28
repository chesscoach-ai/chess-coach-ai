import { multiplayerErrorResponse, noStoreJson } from "@/lib/multiplayer/apiResponse";
import {
  cancelWaitingGame,
  getOnlineGame,
} from "@/lib/multiplayer/gameStore";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const { gameId } = await params;
    const game = await getOnlineGame(gameId, player);
    return noStoreJson({ game });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const { gameId } = await params;
    await cancelWaitingGame(gameId, player);
    return noStoreJson({ success: true });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
