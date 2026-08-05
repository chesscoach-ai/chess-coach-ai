import { describe, expect, it } from "vitest";

import type { PGNExample } from "@/data/pgn/examples";
import {
  buildDailyTrainingPlan,
  getSpacedReviewState,
} from "@/lib/pgnDailyTrainingPlan";

const examples = [
  {
    id: "opening",
    title: "Ouverture",
    subtitle: "Centre",
    category: "opening",
    description: "Développement",
    difficulty: "débutant",
    themes: [],
    pgn: "*",
  },
  {
    id: "middle",
    title: "Tactique",
    subtitle: "Fourchette",
    category: "middlegame",
    description: "Calcul",
    difficulty: "intermédiaire",
    themes: [],
    pgn: "*",
  },
  {
    id: "ending",
    title: "Finale",
    subtitle: "Opposition",
    category: "endgame",
    description: "Technique",
    difficulty: "avancé",
    themes: [],
    pgn: "*",
  },
] satisfies PGNExample[];

describe("spaced review plan", () => {
  it("uses growing intervals after clean repetitions", () => {
    const first = getSpacedReviewState(
      {
        exampleId: "opening",
        startedAt: "2026-07-20T10:00:00.000Z",
        completedAt: "2026-07-20T10:00:00.000Z",
        attempts: 1,
        successfulRepetitions: 1,
        needsReview: false,
      },
      new Date("2026-07-22T10:00:00.000Z"),
    );
    const practiced = getSpacedReviewState(
      {
        exampleId: "opening",
        startedAt: "2026-07-20T10:00:00.000Z",
        completedAt: "2026-07-20T10:00:00.000Z",
        attempts: 3,
        successfulRepetitions: 3,
        needsReview: false,
      },
      new Date("2026-07-22T10:00:00.000Z"),
    );
    expect(first.intervalDays).toBe(3);
    expect(practiced.intervalDays).toBe(14);
  });

  it("puts a fragile completed exercise before new material", () => {
    const plan = buildDailyTrainingPlan(
      examples,
      {
        middle: {
          exampleId: "middle",
          startedAt: "2026-07-28T10:00:00.000Z",
          completedAt: "2026-07-28T10:02:00.000Z",
          attempts: 1,
          successfulRepetitions: 1,
          needsReview: true,
        },
      },
      3,
      new Date("2026-07-28T18:00:00.000Z"),
    );
    expect(plan.items[0]).toMatchObject({
      kind: "review",
      example: { id: "middle" },
    });
    expect(plan.dueItems).toBe(1);
  });
});
