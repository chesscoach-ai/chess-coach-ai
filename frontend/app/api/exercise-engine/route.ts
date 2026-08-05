import {
  getBackendHeaders,
  getBackendUrl,
} from "@/lib/api/backendServer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const response = await fetch(
      `${getBackendUrl()}/api/exercises/analyse-position`,
      {
        method: "POST",
        headers: getBackendHeaders({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
        body: await request.text(),
        cache: "no-store",
      },
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ??
          "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      {
        detail:
          "Le moteur d’exercices est momentanément indisponible.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
