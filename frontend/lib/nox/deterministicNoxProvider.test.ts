import { describe, expect, it } from "vitest";

import { getDeterministicNoxReply } from "@/lib/nox/deterministicNoxProvider";
import type { NoxContext } from "@/lib/nox/types";
import type {
  MoveReviewResponse,
  PositionAnalysisResponse,
} from "@/services/api/ApiService";

function createReview(
  overrides: Partial<MoveReviewResponse> = {},
): MoveReviewResponse {
  return {
    played_move: "e2e4",
    played_move_san: "e4",
    played_move_piece: "pion",
    best_move: "g1f3",
    best_move_san: "Cf3",
    best_move_piece: "cavalier",
    is_best_move: false,
    evaluation_before: 0.2,
    evaluation_before_type: "centipawn",
    evaluation_after: -0.5,
    evaluation_after_type: "centipawn",
    evaluation_loss: 0.7,
    classification: "mistake",
    classification_label: "Erreur",
    explanation: "Le cavalier pouvait se développer vers le centre.",
    best_variation: ["Cf3"],
    best_variation_uci: ["g1f3"],
    played_move_gives_check: false,
    played_move_is_capture: false,
    played_move_is_castling: false,
    played_move_is_promotion: false,
    ...overrides,
  };
}

function createAnalysis(
  move = "g1f3",
): PositionAnalysisResponse {
  return {
    best_move: move,
    best_move_san: "Cf3",
    best_move_details: {
      rank: 1,
      move,
      move_san: "Cf3",
      from_square: move.slice(0, 2),
      to_square: move.slice(2, 4),
      moved_piece: "cavalier",
      moved_piece_color: "white",
      captured_piece: null,
      is_capture: false,
      gives_check: false,
      gives_checkmate: false,
      is_castling: false,
      is_promotion: false,
      promotion_piece: null,
      beginner_label: "Développe ton cavalier",
      beginner_description:
        "Le cavalier quitte g1 pour f3 et contrôle le centre.",
      evaluation: 0.3,
      evaluation_type: "centipawn",
      evaluation_gap: null,
      depth: 12,
      principal_variation: ["Cf3"],
      principal_variation_uci: [move],
      strategic_ideas: ["Développe une pièce et prépare le roque."],
      explanation: "Le cavalier devient actif.",
    },
    principal_variation: ["Cf3"],
    principal_variation_uci: [move],
    evaluation: 0.3,
    evaluation_type: "centipawn",
    depth: 12,
    top_moves: [],
  };
}

function baseContext(
  overrides: Partial<NoxContext> = {},
): NoxContext {
  return {
    contextKey: "position-1",
    mode: "analysis",
    ...overrides,
  };
}

describe("DeterministicNoxProvider", () => {
  it("reste en idle sans analyse disponible", () => {
    const reply = getDeterministicNoxReply(baseContext());
    expect(reply.state).toBe("idle");
    expect(reply.message).toContain("Joue un coup");
  });

  it("passe en thinking pendant le calcul", () => {
    const reply = getDeterministicNoxReply(
      baseContext({ isThinking: true }),
    );
    expect(reply.state).toBe("thinking");
    expect(reply.title).toContain("regarde la position");
  });

  it("réagit avec succès à un excellent coup", () => {
    const reply = getDeterministicNoxReply(
      baseContext({
        review: createReview({
          classification: "excellent",
          classification_label: "Excellent",
          is_best_move: true,
          best_move: "e2e4",
          best_move_san: "e4",
          best_move_piece: "pion",
        }),
        primaryMessage: "Le pion va de e2 vers e4 et contrôle le centre.",
      }),
    );
    expect(reply.state).toBe("success");
    expect(reply.title).toBe("Très joli !");
  });

  it.each(["inaccuracy", "mistake", "blunder"] as const)(
    "signale %s sans humilier le joueur",
    (classification) => {
      const reply = getDeterministicNoxReply(
        baseContext({ review: createReview({ classification }) }),
      );
      expect(reply.state).toBe("warning");
      expect(reply.message.toLowerCase()).not.toContain("très mauvais");
    },
  );

  it("répond aux boutons avec les faits existants", () => {
    const context = baseContext({
      review: createReview(),
      analysis: createAnalysis(),
      primaryMessage: "Le pion a quitté e2 pour e4.",
    });

    expect(getDeterministicNoxReply(context, "why").message).toContain(
      "e2",
    );
    expect(getDeterministicNoxReply(context, "plan").message).toContain(
      "roque",
    );
    expect(getDeterministicNoxReply(context, "missed").message).toContain(
      "Cf3",
    );
    expect(getDeterministicNoxReply(context, "show").suggestedMove).toBe(
      "g1f3",
    );
    expect(getDeterministicNoxReply(context, "show").highlightedSquares).toEqual([
      "g1",
      "f3",
    ]);
  });

  it("reste honnête si un bouton demande une analyse absente", () => {
    const reply = getDeterministicNoxReply(baseContext(), "why");
    expect(reply.state).toBe("idle");
    expect(reply.message).toContain("pas inventer");
  });

  it("change de conseil avec la position validée", () => {
    const first = getDeterministicNoxReply(
      baseContext({ analysis: createAnalysis("g1f3") }),
      "show",
    );
    const second = getDeterministicNoxReply(
      baseContext({
        contextKey: "position-2",
        analysis: createAnalysis("b1c3"),
      }),
      "show",
    );
    expect(first.suggestedMove).toBe("g1f3");
    expect(second.suggestedMove).toBe("b1c3");
  });

  it("réagit aux résultats d’exercice", () => {
    expect(
      getDeterministicNoxReply(
        baseContext({ mode: "exercise", exerciseStatus: "correct" }),
      ).state,
    ).toBe("success");
    expect(
      getDeterministicNoxReply(
        baseContext({ mode: "exercise", exerciseStatus: "incorrect" }),
      ).state,
    ).toBe("warning");
  });

  it("explique une pièce et une notation avec des mots de débutant", () => {
    const reply = getDeterministicNoxReply(
      baseContext({ analysis: createAnalysis() }),
      "piece_help",
      "Pourquoi mon cavalier est utile ?",
    );
    expect(reply.message).toContain("saute par-dessus");
    expect(reply.message).toContain("g1");
    expect(reply.message).toContain("f3");
    expect(reply.message).toContain("Cf3");
  });
});
