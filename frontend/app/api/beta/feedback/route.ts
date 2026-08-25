import { z } from "zod";

import { recordBetaFeedback } from "@/lib/beta/store";
import { allowBetaRequest } from "@/lib/beta/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  visitorId: z.string().uuid(), liked: z.string().trim().min(1).max(800),
  friction: z.string().trim().min(1).max(800), noxHelped: z.boolean().nullable(),
  rating: z.number().int().min(1).max(5), comment: z.string().trim().max(1200),
  page: z.string().max(300), platform: z.string().max(40), browser: z.string().max(300).optional(),
  version: z.string().max(40), appState: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  if (!allowBetaRequest(request, "feedback", 10)) return Response.json({ message: "Trop de retours rapprochés." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Vérifie les réponses obligatoires." }, { status: 400 });
  await recordBetaFeedback({
    visitorId: parsed.data.visitorId, liked: parsed.data.liked,
    friction: parsed.data.friction, noxHelped: parsed.data.noxHelped,
    rating: parsed.data.rating, comment: parsed.data.comment,
    page: parsed.data.page, platform: parsed.data.platform, version: parsed.data.version,
  });
  return Response.json({ saved: true });
}
