import { getBetaDiagnostics } from "@/lib/beta/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  return Response.json(await getBetaDiagnostics(), { headers: { "Cache-Control": "no-store" } });
}
