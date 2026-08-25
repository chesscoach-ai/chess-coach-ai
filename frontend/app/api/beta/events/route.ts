import { z } from "zod";

import { isBetaEventName } from "@/lib/beta/constants";
import { recordBetaEvent } from "@/lib/beta/store";
import { allowBetaRequest } from "@/lib/beta/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  eventName: z.string().refine(isBetaEventName),
  visitorId: z.string().uuid(),
  page: z.string().max(300),
  platform: z.string().max(40),
  version: z.string().max(40),
});

export async function POST(request: Request) {
  if (!allowBetaRequest(request, "event", 300)) return new Response(null, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: "Événement invalide." }, { status: 400 });
  await recordBetaEvent(parsed.data);
  return new Response(null, { status: 204 });
}
