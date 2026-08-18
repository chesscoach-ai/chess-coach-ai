import { z } from "zod";

import { PGN_EXAMPLES } from "@/data/pgn/examples";
import { getAnalysisEntitlement } from "@/lib/billing/subscriptionStore";
import {
  multiplayerErrorResponse,
  noStoreJson,
} from "@/lib/multiplayer/apiResponse";
import { getAuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  listVerifiedExerciseProgress,
  recordVerifiedExercise,
} from "@/lib/progression/progressionStore";
import { exerciseLearningEvent } from "@/lib/nox/memoryEvents";
import { recordNoxLearningEvents } from "@/lib/nox/memoryStore";
import { getLocalDateKey } from "@/lib/progression/journey";

export const runtime = "nodejs";

const knownExerciseIds = new Set(
  PGN_EXAMPLES.map((example) => example.id),
);

const exerciseResultSchema = z.object({
  exerciseId: z
    .string()
    .min(1)
    .max(120)
    .refine((id) =>
      knownExerciseIds.has(id),
    ),
  elapsedTime: z
    .number()
    .int()
    .min(0)
    .max(7_200),
  mistakes: z
    .number()
    .int()
    .min(0)
    .max(100),
  hintsUsed: z
    .number()
    .int()
    .min(0)
    .max(20),
});

export async function GET() {
  try {
    const player = await getAuthenticatedPlayer();
    if (!player) throw new Error("AUTH_REQUIRED");
    const entitlement = await getAnalysisEntitlement(player.id);
    if (!entitlement.hasAccess) throw new Error("SUBSCRIPTION_REQUIRED");
    return noStoreJson({
      progress: await listVerifiedExerciseProgress(player.id),
    });
  } catch (error) {
    return multiplayerErrorResponse(error);
  }
}

export async function POST(
  request: Request,
) {
  try {
    const player =
      await getAuthenticatedPlayer();
    if (!player) {
      throw new Error(
        "AUTH_REQUIRED",
      );
    }
    const entitlement = await getAnalysisEntitlement(player.id);
    if (!entitlement.hasAccess) throw new Error("SUBSCRIPTION_REQUIRED");
    const parsed =
      exerciseResultSchema.safeParse(
        await request.json(),
      );
    if (!parsed.success) {
      throw new Error(
        "INVALID_REQUEST",
      );
    }

    const exercise = PGN_EXAMPLES.find((item) => item.id === parsed.data.exerciseId)!;
    await Promise.all([
      recordVerifiedExercise(player, parsed.data),
      recordNoxLearningEvents(player, [
        exerciseLearningEvent({
          ...parsed.data,
          category: exercise.category,
          themes: exercise.themes,
          sourceDate: getLocalDateKey(),
        }),
      ]),
    ]);
    return noStoreJson(
      { recorded: true },
      { status: 201 },
    );
  } catch (error) {
    return multiplayerErrorResponse(
      error,
    );
  }
}
