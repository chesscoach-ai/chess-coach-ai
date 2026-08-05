import type { PGNExerciseProgress } from "@/lib/pgnExerciseProgress";

export type SyncedExerciseProgress = {
  exerciseId: string;
  completedAt: string;
  bestTimeSeconds: number;
  mistakes: number;
  hintsUsed: number;
  repetitions: number;
};

export function mergeSyncedExerciseProgress(
  local: Record<string, PGNExerciseProgress>,
  synced: SyncedExerciseProgress[],
): Record<string, PGNExerciseProgress> {
  const merged = { ...local };

  for (const item of synced) {
    const current = merged[item.exerciseId];
    const localIsNewer = Boolean(
      current?.completedAt && current.completedAt > item.completedAt,
    );
    merged[item.exerciseId] = {
      exampleId: item.exerciseId,
      startedAt: current?.startedAt ?? item.completedAt,
      completedAt:
        current?.completedAt && current.completedAt > item.completedAt
          ? current.completedAt
          : item.completedAt,
      attempts: Math.max(1, current?.attempts ?? 1),
      successfulRepetitions: Math.max(
        current?.successfulRepetitions ?? 0,
        item.repetitions,
      ),
      bestTimeSeconds: Math.min(
        current?.bestTimeSeconds ?? Number.POSITIVE_INFINITY,
        item.bestTimeSeconds,
      ),
      lastMistakes: Math.min(
        current?.lastMistakes ?? Number.POSITIVE_INFINITY,
        item.mistakes,
      ),
      needsReview:
        localIsNewer
          ? current?.needsReview === true
          : item.mistakes > 0 || item.hintsUsed > 1,
    };
  }

  return merged;
}
