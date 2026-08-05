import { z } from "zod";

import { PGN_EXAMPLES } from "@/data/pgn/examples";
import {
  buildPlacementPlan,
  calculatePlacementResult,
  type PlacementAttempt,
} from "@/lib/learning/placement";
import {
  getPlacementResult,
  savePlacementResult,
} from "@/lib/learning/placementStore";
import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

export const runtime = "nodejs";

const placementExamples = buildPlacementPlan(PGN_EXAMPLES);
const placementById = new Map(
  placementExamples.map((example) => [example.id, example]),
);
const placementSchema = z.object({
  attempts: z
    .array(
      z.object({
        exerciseId: z.string().refine((id) => placementById.has(id)),
        elapsedTime: z.number().int().min(0).max(7_200),
        mistakes: z.number().int().min(0).max(100),
        hintsUsed: z.number().int().min(0).max(20),
      }),
    )
    .length(placementExamples.length),
});

export async function GET() {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    return noStoreJson({
      result: await getPlacementResult(player.id),
    });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const parsed = placementSchema.safeParse(await request.json());
    if (!parsed.success) throw new Error("INVALID_REQUEST");
    const uniqueIds = new Set(
      parsed.data.attempts.map((attempt) => attempt.exerciseId),
    );
    if (uniqueIds.size !== placementExamples.length) {
      throw new Error("INVALID_REQUEST");
    }
    const attempts: PlacementAttempt[] = parsed.data.attempts.map((attempt) => ({
      ...attempt,
      difficulty: placementById.get(attempt.exerciseId)!.difficulty,
    }));
    const result = calculatePlacementResult(attempts);
    return noStoreJson({
      result: await savePlacementResult(player, result),
    });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}
