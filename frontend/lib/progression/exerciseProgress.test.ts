import { describe, expect, it } from "vitest";

import { mergeSyncedExerciseProgress } from "@/lib/progression/exerciseProgress";

describe("synced exercise progress", () => {
  it("restores server mastery on a new device", () => {
    const progress = mergeSyncedExerciseProgress(
      {},
      [
        {
          exerciseId: "fork-1",
          completedAt: "2026-07-28T10:00:00.000Z",
          bestTimeSeconds: 42,
          mistakes: 0,
          hintsUsed: 0,
          repetitions: 1,
        },
      ],
    );

    expect(progress["fork-1"]).toMatchObject({
      completedAt: "2026-07-28T10:00:00.000Z",
      bestTimeSeconds: 42,
      needsReview: false,
    });
  });

  it("keeps a review flag when either device detected difficulty", () => {
    const progress = mergeSyncedExerciseProgress(
      {
        "fork-1": {
          exampleId: "fork-1",
          startedAt: "2026-07-28T08:00:00.000Z",
          completedAt: "2026-07-28T11:05:00.000Z",
          attempts: 2,
          needsReview: true,
        },
      },
      [
        {
          exerciseId: "fork-1",
          completedAt: "2026-07-28T10:00:00.000Z",
          bestTimeSeconds: 20,
          mistakes: 0,
          hintsUsed: 0,
          repetitions: 2,
        },
      ],
    );

    expect(progress["fork-1"].needsReview).toBe(true);
    expect(progress["fork-1"].bestTimeSeconds).toBe(20);
  });
});
