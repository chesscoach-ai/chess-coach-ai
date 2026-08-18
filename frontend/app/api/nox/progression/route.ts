import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getNoxProgression } from "@/lib/nox/progressionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getNoxProgression(await getAuthenticatedPlayer()), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
