import { describe, expect, it } from "vitest";

import {
  buildLearningProfile,
  inferLearningTheme,
} from "@/lib/learning/profileRules";
import type {
  LearningMoveSample,
  StoredLearningProfile,
} from "@/lib/learning/types";

const baseSample: LearningMoveSample = {
  moveIndex: 20,
  classification: "mistake",
  evaluationLoss: 1.5,
  isCapture: false,
  bestVariation: [],
};

describe("learning profile rules", () => {
  it("identifies the phase and tactical signals of a mistake", () => {
    expect(inferLearningTheme({ ...baseSample, moveIndex: 4 }, 60)).toBe(
      "opening",
    );
    expect(
      inferLearningTheme(
        { ...baseSample, bestVariation: ["Qh7+", "Kxh7", "Rh3#"] },
        60,
      ),
    ).toBe("tactics");
    expect(inferLearningTheme({ ...baseSample, moveIndex: 52 }, 60)).toBe(
      "endgame",
    );
  });

  it("prioritizes a recurring severe weakness and adapts the message", () => {
    const stored: StoredLearningProfile = {
      userId: "alice@example.test",
      sessionsCount: 4,
      analyzedMoves: 80,
      totalEvaluationLoss: 18,
      classifications: {
        excellent: 20,
        good: 40,
        inaccuracy: 10,
        mistake: 8,
        blunder: 2,
      },
      themes: {
        opening: { occurrences: 1, severeErrors: 0, totalLoss: 0.5 },
        tactics: { occurrences: 6, severeErrors: 4, totalLoss: 10 },
        material: { occurrences: 1, severeErrors: 1, totalLoss: 2 },
        calculation: { occurrences: 2, severeErrors: 1, totalLoss: 3 },
        positional: { occurrences: 1, severeErrors: 0, totalLoss: 1 },
        endgame: { occurrences: 0, severeErrors: 0, totalLoss: 0 },
      },
      fingerprints: ["game"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const profile = buildLearningProfile({
      playerName: "Alice",
      rating: 1120,
      stored,
    });

    expect(profile.primaryWeakness).toBe("tactics");
    expect(profile.message).toContain("Alice");
    expect(profile.message).toContain("1120 Elo");
    expect(profile.recommendations[0]?.action).toContain("échecs");
  });
});
