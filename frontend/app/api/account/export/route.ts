import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { exportAccountData } from "@/lib/privacy/accountData";

export const runtime = "nodejs";

export async function GET() {
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return Response.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }
  const payload = await exportAccountData(
    player.id,
    player.name,
  );
  return new Response(
    JSON.stringify(payload, null, 2),
    {
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="chess-coach-donnees.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
