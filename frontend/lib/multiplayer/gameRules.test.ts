import { describe, expect, it } from "vitest";

import {
  applyOnlineMove,
  calculateEloRatings,
  currentClockValues,
} from "@/lib/multiplayer/gameRules";

describe("multiplayer game rules", () => {
  it("applies a legal move and changes the turn", () => {
    const result = applyOnlineMove(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      { from: "e2", to: "e4" },
    );

    expect(result.uci).toBe("e2e4");
    expect(result.san).toBe("e4");
    expect(result.nextTurn).toBe("black");
  });

  it("updates equal Elo ratings symmetrically", () => {
    expect(calculateEloRatings(1200, 1200, "1-0")).toEqual({
      white: 1216,
      black: 1184,
    });
  });

  it("deducts elapsed time only from the active player", () => {
    expect(
      currentClockValues({
        whiteMs: 60_000,
        blackMs: 60_000,
        turn: "white",
        turnStartedAt: "2026-01-01T12:00:00.000Z",
        now: new Date("2026-01-01T12:00:05.000Z"),
      }),
    ).toEqual({ whiteMs: 55_000, blackMs: 60_000 });
  });
});
