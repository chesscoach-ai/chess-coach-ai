import { describe, expect, it } from "vitest";

import { selectAiMove } from "@/lib/ai/selectMove";
import type { MoveAnalysis } from "@/services/api/ApiService";

function move(
  rank: number,
  overrides: Partial<MoveAnalysis> = {},
): MoveAnalysis {
  return {
    rank,
    move: rank === 1 ? "e2e4" : "d1h5",
    move_san: rank === 1 ? "e4" : "Qh5+",
    from_square: rank === 1 ? "e2" : "d1",
    to_square: rank === 1 ? "e4" : "h5",
    moved_piece: rank === 1 ? "pawn" : "queen",
    moved_piece_color: "white",
    captured_piece: null,
    is_capture: false,
    gives_check: false,
    gives_checkmate: false,
    is_castling: false,
    is_promotion: false,
    promotion_piece: null,
    beginner_label: "Coup candidat",
    beginner_description: "Une option possible.",
    evaluation: 0.2,
    evaluation_type: "centipawn",
    evaluation_gap: 0,
    depth: 12,
    principal_variation: [],
    principal_variation_uci: [],
    strategic_ideas: [],
    explanation: "",
    ...overrides,
  };
}

describe("AI opponent styles", () => {
  it("keeps the engine's first choice at master level", () => {
    expect(
      selectAiMove({
        fen: "position",
        levelId: "master",
        personaId: "tal",
        moves: [move(1), move(2, { gives_check: true })],
      }).rank,
    ).toBe(1);
  });

  it("lets the Tal-inspired style prefer a forcing check among close moves", () => {
    expect(
      selectAiMove({
        fen: "another-position",
        levelId: "club",
        personaId: "tal",
        moves: [move(1), move(2, { gives_check: true })],
      }).rank,
    ).toBe(2);
  });
});
