import {
  getBackendHeaders,
  getBackendUrl,
} from "@/lib/api/backendServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      `${getBackendUrl()}/health`,
      {
        headers: getBackendHeaders({
          Accept: "application/json",
        }),
        cache: "no-store",
        // Render's free engine instance can take several seconds to wake up.
        // Keep this request alive so a cold start remains a loading state.
        signal: AbortSignal.timeout(55_000),
      },
    );

    if (!response.ok) {
      throw new Error(
        `ENGINE_HEALTH_${response.status}`,
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
