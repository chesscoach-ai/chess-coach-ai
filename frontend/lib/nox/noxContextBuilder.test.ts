import { describe, expect, it } from "vitest";

import {
  buildServerNoxContext,
  isNoxAiEligible,
} from "@/lib/nox/noxContextBuilder";
import type { NoxContext } from "@/lib/nox/types";

const context: NoxContext = {
  contextKey: "8/8/8/8/8/8/8/8 b - - 0 1:f2f3",
  mode: "analysis",
  review: {
    played_move: "f2f3",
    played_move_san: "f3",
    played_move_piece: "pion",
    best_move: "e2e4",
    best_move_san: "e4",
    best_move_piece: "pion",
    is_best_move: false,
    evaluation_before: 0.3,
    evaluation_before_type: "centipawn",
    evaluation_after: -1.1,
    evaluation_after_type: "centipawn",
    evaluation_loss: 1.4,
    classification: "blunder",
    classification_label: "Gaffe",
    explanation: "Le roi devient fragile.",
    best_variation: [],
    best_variation_uci: [],
    played_move_gives_check: false,
    played_move_is_capture: false,
    played_move_is_castling: false,
    played_move_is_promotion: false,
  },
  analysis: null,
};

describe("NoxContext builder", () => {
  it("produit un contexte compact sans donnée personnelle ni FEN", () => {
    const result = buildServerNoxContext(context, "why");
    expect(result?.interaction).toEqual({
      depth: "explanation",
      question: "why",
    });
    expect(result?.played_move?.from_square).toBe("f2");
    expect(result?.best_move?.uci).toBe("e2e4");
    expect(JSON.stringify(result)).not.toContain("8/8/8");
    expect(JSON.stringify(result)).not.toContain("email");
  });

  it("réserve l'IA aux questions et moments importants", () => {
    expect(isNoxAiEligible(context, null)).toBe(true);
    expect(isNoxAiEligible(context, "why")).toBe(true);
    expect(isNoxAiEligible(context, "show")).toBe(false);
    expect(
      isNoxAiEligible(
        {
          ...context,
          review: { ...context.review!, classification: "good" },
        },
        null,
      ),
    ).toBe(false);
  });
});
