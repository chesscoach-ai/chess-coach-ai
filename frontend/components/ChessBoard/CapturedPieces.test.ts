import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";

import { getCapturedPieces } from "@/components/ChessBoard/CapturedPieces";

describe("pièces capturées", () => {
  it("attribue une pièce noire prise aux Blancs", () => {
    const game = new Chess();
    game.move("e4");
    game.move("d5");
    game.move("exd5");
    expect(getCapturedPieces(game.fen())).toEqual({ white: ["p"], black: [] });
  });

  it("reste vide au début et tolère un FEN invalide", () => {
    expect(getCapturedPieces(new Chess().fen())).toEqual({ white: [], black: [] });
    expect(getCapturedPieces("invalide")).toEqual({ white: [], black: [] });
  });
});

