import { describe, expect, it, vi } from "vitest";

import {
  getContextualQuickActions,
  NoxConversationService,
  routeNoxQuestion,
} from "@/lib/nox/noxConversationService";
import type { NoxContext, NoxProvider } from "@/lib/nox/types";
import type { MoveReviewResponse, PositionAnalysisResponse } from "@/services/api/ApiService";

const review = {
  played_move: "f2f3",
  played_move_san: "f3",
  played_move_piece: "pion",
  best_move: "e2e4",
  best_move_san: "e4",
  best_move_piece: "pion",
  is_best_move: false,
  evaluation_before: 0.2,
  evaluation_before_type: "centipawn",
  evaluation_after: -1,
  evaluation_after_type: "centipawn",
  evaluation_loss: 1.2,
  classification: "mistake",
  classification_label: "Erreur",
  explanation: "Le roi devient plus exposé.",
  best_variation: ["e4"],
  best_variation_uci: ["e2e4"],
  played_move_gives_check: false,
  played_move_is_capture: false,
  played_move_is_castling: false,
  played_move_is_promotion: false,
} satisfies MoveReviewResponse;

const analysis = {
  best_move: "e2e4",
  best_move_san: "e4",
  best_move_details: {
    rank: 1,
    move: "e2e4",
    move_san: "e4",
    from_square: "e2",
    to_square: "e4",
    moved_piece: "pion",
    moved_piece_color: "white",
    captured_piece: null,
    is_capture: false,
    gives_check: false,
    gives_checkmate: false,
    is_castling: false,
    is_promotion: false,
    promotion_piece: null,
    beginner_label: "Occupe le centre",
    beginner_description: "Le pion avance de e2 à e4 et prend de l’espace.",
    evaluation: 0.3,
    evaluation_type: "centipawn",
    evaluation_gap: null,
    depth: 12,
    principal_variation: ["e4"],
    principal_variation_uci: ["e2e4"],
    strategic_ideas: ["Renforce le contrôle du centre."],
    explanation: "Le pion aide les autres pièces à sortir.",
  },
  principal_variation: ["e4"],
  principal_variation_uci: ["e2e4"],
  evaluation: 0.3,
  evaluation_type: "centipawn",
  depth: 12,
  top_moves: [],
} satisfies PositionAnalysisResponse;

const context: NoxContext = {
  contextKey: "position-a",
  mode: "analysis",
  review,
  analysis,
  primaryMessage: "Le pion f quitte une case utile devant le roi.",
};

describe("NoxConversationService", () => {
  it.each([
    ["Pourquoi ce coup ?", "why"],
    ["Quel est mon plan maintenant ?", "plan"],
    ["Qu’est-ce que je n’ai pas vu ?", "missed"],
    ["Montre-moi le trajet", "show"],
    ["Quel est le meilleur coup ?", "best_move"],
    ["Pourquoi mon pion est utile ?", "piece_help"],
    ["Comment jouer cette position ?", "position_help"],
  ])("route %s vers %s", (question, intent) => {
    expect(routeNoxQuestion(question).intent).toBe(intent);
  });

  it("répond honnêtement à une question inconnue sans appeler un autre service", () => {
    const getReply = vi.fn();
    const service = new NoxConversationService({ getReply } as NoxProvider);
    const result = service.askQuestion(context, "Qui gagnera le tournoi demain ?");
    expect(result.route.intent).toBeNull();
    expect(result.reply.message).toContain("Je ne sais pas encore répondre");
    expect(getReply).not.toHaveBeenCalled();
  });

  it("passe une question reconnue au provider déterministe", () => {
    const getReply = vi.fn(() => ({
      state: "tip" as const,
      title: "Le plan",
      message: "Contrôle le centre.",
    }));
    const service = new NoxConversationService({ getReply });
    service.askQuestion(context, "Quel est mon plan ?");
    expect(getReply).toHaveBeenCalledWith(context, "plan", "Quel est mon plan ?");
  });

  it("propose des questions adaptées à une erreur et aux faits disponibles", () => {
    const options = getContextualQuickActions(context);
    expect(options.map((option) => option.label)).toEqual([
      "Pourquoi c’est une erreur ?",
      "Qu’est-ce que je n’ai pas vu ?",
      "Quel est mon plan ?",
      "Montre-moi la meilleure idée",
    ]);
  });

  it("ne propose aucune question sans analyse", () => {
    expect(
      getContextualQuickActions({ contextKey: "empty", mode: "analysis" }),
    ).toEqual([]);
  });
});
