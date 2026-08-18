import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getNoxMemory, recordNoxLearningEvents, resetNoxMemory } from "@/lib/nox/memoryStore";
import { NOX_CONCEPT_IDS } from "@/lib/nox/memoryTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventSchema = z.object({
  type: z.enum([
    "move_review",
    "exercise_attempt",
    "exercise_success",
    "exercise_failure",
    "mission_completed",
    "game_completed",
    "concept_detected",
  ]),
  conceptId: z.enum(NOX_CONCEPT_IDS),
  outcome: z.enum(["success", "failure", "neutral"]),
  sourceId: z.string().min(3).max(160),
});

export async function GET() {
  return Response.json(await getNoxMemory(await getAuthenticatedPlayer()), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return Response.json(
      { message: "Connecte-toi pour enregistrer cette progression.", persistent: false },
      { status: 401 },
    );
  }
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ message: "Événement pédagogique invalide." }, { status: 400 });
  }
  return Response.json(
    await recordNoxLearningEvents(player, [
      { id: randomUUID(), ...parsed.data, occurredAt: new Date().toISOString() },
    ]),
    { status: 201 },
  );
}

export async function DELETE() {
  const player = await getAuthenticatedPlayer();
  if (!player) {
    return Response.json({ message: "Connexion requise." }, { status: 401 });
  }
  return Response.json(await resetNoxMemory(player));
}
