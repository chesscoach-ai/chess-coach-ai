import { z } from "zod";

import { recordBetaBug } from "@/lib/beta/store";
import { allowBetaRequest } from "@/lib/beta/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  visitorId: z.string().uuid(), comment: z.string().trim().min(10).max(1600),
  page: z.string().max(300), platform: z.string().max(40), browser: z.string().max(300),
  version: z.string().max(40), appState: z.string().max(40),
});

export async function POST(request: Request) {
  if (!allowBetaRequest(request, "bug", 20)) return Response.json({ message: "Trop de signalements rapprochés." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Décris le problème en quelques mots." }, { status: 400 });
  await recordBetaBug(parsed.data);
  return Response.json({ saved: true });
}
