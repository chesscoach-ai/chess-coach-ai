import { randomUUID } from "node:crypto";

import { inferLearningTheme } from "@/lib/learning/profileRules";
import type { LearningSessionInput, LearningTheme } from "@/lib/learning/types";
import type { LearningEvent, NoxConceptId } from "@/lib/nox/memoryTypes";

const THEME_CONCEPT: Record<LearningTheme, NoxConceptId> = {
  opening: "development",
  tactics: "forks",
  material: "material",
  calculation: "calculation",
  positional: "positioning",
  endgame: "endgame",
};

export function learningSessionEvents(
  session: LearningSessionInput,
  sessionFingerprint: string,
  occurredAt = new Date().toISOString(),
): LearningEvent[] {
  return session.reviews.map((review) => ({
    id: randomUUID(),
    type: "move_review",
    conceptId: THEME_CONCEPT[inferLearningTheme(review, session.moves.length)],
    outcome:
      review.classification === "excellent" || review.classification === "good"
        ? "success"
        : review.classification === "mistake" || review.classification === "blunder"
          ? "failure"
          : "neutral",
    occurredAt,
    sourceId: `review:${sessionFingerprint}:${review.moveIndex}`,
  }));
}

export function exerciseLearningEvent(input: {
  exerciseId: string;
  category: "opening" | "middlegame" | "endgame";
  themes: string[];
  mistakes: number;
  hintsUsed: number;
  sourceDate: string;
  occurredAt?: string;
}): LearningEvent {
  const conceptId = conceptFromExercise(input.category, input.themes);
  const assisted = input.mistakes > 0 || input.hintsUsed > 0;
  return {
    id: randomUUID(),
    type: assisted ? "exercise_failure" : "exercise_success",
    conceptId,
    outcome: assisted ? "failure" : "success",
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    sourceId: `exercise:${input.sourceDate}:${input.exerciseId}`,
  };
}

export function conceptFromExercise(
  category: "opening" | "middlegame" | "endgame",
  themes: string[],
): NoxConceptId {
  const text = themes.join(" ").toLocaleLowerCase("fr");
  if (text.includes("roque") || text.includes("sécurité du roi") || text.includes("roi exposé")) {
    return "king_safety";
  }
  if (text.includes("fourchette")) return "forks";
  if (text.includes("pièce non protégée") || text.includes("faiblesse")) return "hanging_pieces";
  if (text.includes("calcul")) return "calculation";
  if (text.includes("matériel") || text.includes("échange")) return "material";
  if (category === "opening") return "development";
  if (category === "endgame") return "endgame";
  return "positioning";
}
