import { describe, expect, it } from "vitest";

import {
  getBattleArena,
  getDailyCrowns,
} from "@/lib/rewards/battleRewards";
import type { OnlineGameHistoryItem } from "@/lib/multiplayer/types";

describe("battle rewards", () => {
  it("awards three crowns for a win and one for a draw", () => {
    const base = {
      endedAt:
        "2026-07-28T12:00:00.000Z",
    };
    const games = [
      {
        ...base,
        youAre: "white",
        result: "1-0",
      },
      {
        ...base,
        youAre: "black",
        result: "1/2-1/2",
      },
      {
        ...base,
        youAre: "black",
        result: "1-0",
      },
    ] as OnlineGameHistoryItem[];

    expect(
      getDailyCrowns(
        games,
        "2026-07-28",
      ),
    ).toBe(4);
  });

  it("moves players through rating arenas", () => {
    expect(
      getBattleArena(850).name,
    ).toBe("Camp des Écuyers");
    expect(
      getBattleArena(1_550).name,
    ).toBe(
      "Bastion de Cristal",
    );
    expect(
      getBattleArena(2_000).nextAt,
    ).toBeNull();
  });
});
