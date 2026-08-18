import { collectDevRuntimeDiagnostics } from "@/lib/diagnostics/devRuntime";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  return Response.json(
    await collectDevRuntimeDiagnostics(await getAuthenticatedPlayer()),
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
