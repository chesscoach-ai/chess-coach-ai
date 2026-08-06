import { describe, expect, it } from "vitest";

import {
  buildExerciseCoachMessage,
  buildPositionCoachInsight,
} from "@/lib/coach/contextualCoach";
import type { LearningProfile } from "@/lib/learning/types";
import type { MoveAnalysis } from "@/services/api/ApiService";

const profile: LearningProfile = {
  playerName: "Sébastien",
  rating: 1120,
  levelLabel: "Club",
  sessionsCount: 4,
  analyzedMoves: 72,
  message: "",
  primaryWeakness: "calculation",
  primaryWeaknessLabel: "le calcul des réponses adverses",
  strength: "activité des pièces",
  recommendations: [],
  averageEvaluationLoss: 0.42,
  classifications: {
    excellent: 8,
    good: 40,
    inaccuracy: 12,
    mistake: 8,
    blunder: 4,
  },
  themeOccurrences: {
    opening: 3,
    tactics: 7,
    material: 2,
    calculation: 12,
    positional: 4,
    endgame: 1,
  },
  updatedAt: "2026-08-06T12:00:00.000Z",
};

const move = {
  moved_piece: "cavalier",
  move_san: "Cf3",
  strategic_ideas: ["Développe une pièce et contrôle le centre."],
  explanation: "Le cavalier rejoint une case active.",
} as MoveAnalysis;

describe("coach contextuel", () => {
  it("relie le conseil de position à l’historique du joueur", () => {
    const message = buildPositionCoachInsight({ move, profile });

    expect(message).toContain("4 dernières analyses");
    expect(message).toContain("calcul des réponses adverses");
    expect(message).toContain("cavalier");
  });

  it("change son intervention après une erreur sans révéler le coup", () => {
    const before = buildExerciseCoachMessage({
      profile,
      exerciseId: "caro-kann-1",
      mistakes: 0,
      hintsUsed: 0,
      elapsedTime: 12,
      status: "idle",
    });
    const after = buildExerciseCoachMessage({
      profile,
      exerciseId: "caro-kann-1",
      mistakes: 1,
      hintsUsed: 0,
      elapsedTime: 20,
      status: "incorrect",
    });

    expect(before.message).toContain("Sébastien");
    expect(after.title).toContain("reprend l’enquête");
    expect(after.message).not.toMatch(/[a-h][1-8][a-h][1-8]/);
  });
});
