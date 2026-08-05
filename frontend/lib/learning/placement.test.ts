import { describe, expect, it } from "vitest";

import type { PGNExample } from "@/data/pgn/examples";
import {
  buildPlacementPlan,
  calculatePlacementResult,
  getNextPlacementExerciseId,
  recordPlacementAttempt,
  startPlacementSession,
} from "@/lib/learning/placement";

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
    title: "Milieu",
    subtitle: "Calcul",
    category: "middlegame",
    description: "Tactique",
    difficulty: "intermédiaire",
    themes: [],
    pgn: "*",
  },
  {
    id: "ending",
    title: "Finale",
    subtitle: "Technique",
    category: "endgame",
    description: "Conversion",
    difficulty: "avancé",
    themes: [],
    pgn: "*",
  },
] satisfies PGNExample[];

describe("placement diagnostic", () => {
  it("selects one graduated decision per game phase", () => {
    expect(buildPlacementPlan(examples).map((example) => example.id)).toEqual([
      "opening",
      "middle",
      "ending",
    ]);
  });

  it("separates educational placement from competitive Elo", () => {
    const result = calculatePlacementResult([
      {
        exerciseId: "opening",
        difficulty: "débutant",
        elapsedTime: 25,
        mistakes: 0,
        hintsUsed: 0,
      },
      {
        exerciseId: "middle",
        difficulty: "intermédiaire",
        elapsedTime: 35,
        mistakes: 0,
        hintsUsed: 0,
      },
      {
        exerciseId: "ending",
        difficulty: "avancé",
        elapsedTime: 50,
        mistakes: 1,
        hintsUsed: 0,
      },
    ]);
    expect(result.score).toBeGreaterThan(80);
    expect(result.estimatedRating).toBeGreaterThanOrEqual(1_575);
  });

  it("finishes only after every planned position", () => {
    let session = startPlacementSession(examples);
    session = recordPlacementAttempt(session, {
      exerciseId: "opening",
      difficulty: "débutant",
      elapsedTime: 30,
      mistakes: 0,
      hintsUsed: 0,
    });
    expect(session.result).toBeNull();
    expect(getNextPlacementExerciseId(session)).toBe("middle");
  });
});
