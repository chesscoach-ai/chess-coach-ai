import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { PGN_EXAMPLES } from "@/data/pgn/examples";
import { buildExercise } from "@/lib/exercise/buildExercise";

describe("exercise catalogue", () => {
  it("contains a substantial set of decision positions", () => {
    expect(PGN_EXAMPLES.length).toBeGreaterThanOrEqual(100);
    expect(
      new Set(
        PGN_EXAMPLES.map(
          (example) => example.id,
        ),
      ).size,
    ).toBe(PGN_EXAMPLES.length);
  });

  it("contains playable positions in every learning phase", () => {
    for (const category of [
      "opening",
      "middlegame",
      "endgame",
    ] as const) {
      expect(
        PGN_EXAMPLES.some(
          (example) =>
            example.category === category,
        ),
      ).toBe(true);
    }
  });

  it("keeps every generated PGN legal and solvable", () => {
    for (const example of PGN_EXAMPLES) {
      const game = new Chess();

      expect(() =>
        game.loadPgn(example.pgn),
      ).not.toThrow();
      expect(
        game.history().length,
      ).toBeGreaterThan(0);

      const session = buildExercise(
        example.pgn,
      );
      const position = new Chess(
        session.startFen,
      );
      expect(() =>
        position.move({
          from: session.solutionMove.slice(
            0,
            2,
          ),
          to: session.solutionMove.slice(
            2,
            4,
          ),
          promotion:
            session.solutionMove.slice(4) ||
            undefined,
        }),
      ).not.toThrow();
    }
  });

  it("offers historical decisions with attribution", () => {
    const legends = PGN_EXAMPLES.filter(
      (example) =>
        example.collection === "legend",
    );

    expect(legends.length).toBeGreaterThan(10);
    expect(
      legends.every(
        (example) =>
          Boolean(example.champion) &&
          Boolean(example.sourceUrl),
      ),
    ).toBe(true);
  });
});
