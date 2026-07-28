import { describe, expect, it } from "vitest";

import {
  explainPlayedMove,
  formatEngineEvaluation,
} from "@/lib/chess/pedagogy";
import type { MoveReviewResponse } from "@/services/api/ApiService";

function makeReview(
  overrides: Partial<MoveReviewResponse> = {},
): MoveReviewResponse {
  return {
    played_move: "e2e4",
    played_move_san: "e4",
    best_move: "e2e4",
    best_move_san: "e4",
    is_best_move: true,
    evaluation_before: 0.3,
    evaluation_before_type: "centipawn",
    evaluation_after: 0.3,
    evaluation_after_type: "centipawn",
    evaluation_loss: 0,
    classification: "excellent",
    classification_label: "Excellent",
    explanation: "",
    best_variation: [],
    best_variation_uci: [],
    played_move_gives_check: false,
    played_move_is_capture: false,
    played_move_is_castling: false,
    played_move_is_promotion: false,
    ...overrides,
  };
}

describe("explications pédagogiques", () => {
  it("valorise un meilleur coup sans jargon", () => {
    expect(explainPlayedMove(makeReview())).toContain(
      "très joli",
    );
    expect(explainPlayedMove(makeReview())).toContain(
      "réponse très précise",
    );
  });

  it("adapte la voix au coach choisi", () => {
    expect(
      explainPlayedMove(makeReview(), "tal"),
    ).toContain("échecs, les prises et les menaces");

    expect(
      explainPlayedMove(makeReview(), "petrosian"),
    ).toContain("meilleure idée adverse");
  });

  it("explique les effets tactiques du coup", () => {
    const explanation = explainPlayedMove(
      makeReview({
        played_move_san: "Dxh7+",
        played_move_is_capture: true,
        played_move_gives_check: true,
      }),
    );

    expect(explanation).toContain("capture une pièce adverse");
    expect(explanation).toContain("attaque directement le roi");
  });

  it("formate les évaluations et les mats", () => {
    expect(
      formatEngineEvaluation({
        evaluation: 0.42,
        evaluation_type: "centipawn",
      }),
    ).toBe("+0.42");
    expect(
      formatEngineEvaluation({
        evaluation: -3,
        evaluation_type: "mate",
      }),
    ).toBe("M-3");
  });
});
