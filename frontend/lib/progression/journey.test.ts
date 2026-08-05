import { describe, expect, it } from "vitest";

import {
  applyStreakFreeze,
  buildJourneyLedger,
  getAvailableStreakFreezes,
  getJourneySummary,
  getLeague,
  mergeJourneyLedgers,
} from "@/lib/progression/journey";
import type { OnlineGameHistoryItem } from "@/lib/multiplayer/types";

describe("journey progression", () => {
  it("rewards useful activities without double counting", () => {
    const game = {
      endedAt: "2026-07-28T12:00:00.000Z",
      whiteAccuracy: 82,
      blackAccuracy: null,
    } as OnlineGameHistoryItem;
    const ledger = buildJourneyLedger(
      [game, game],
      [
        {
          date: "2026-07-28",
          started: 1,
          completed: 1,
        },
      ],
    );
    const summary = getJourneySummary(
      ledger,
      new Date("2026-07-28T18:00:00"),
    );

    expect(summary.completedToday).toBe(3);
    expect(summary.todayXp).toBe(60);
    expect(summary.monthlyQuests).toBe(3);
  });

  it("promotes players according to weekly XP", () => {
    expect(getLeague(0).name).toBe(
      "Ligue Bronze",
    );
    expect(getLeague(120).name).toBe(
      "Ligue Cristal",
    );
    expect(getLeague(300).name).toBe(
      "Ligue Saphir",
    );
    expect(getLeague(600).name).toBe(
      "Ligue Couronne",
    );
  });

  it("merges devices without double counting completed quests", () => {
    const first = buildJourneyLedger(
      [],
      [
        {
          date: "2026-07-28",
          started: 1,
          completed: 1,
        },
      ],
    );
    const second = {
      "2026-07-28": {
        date: "2026-07-28",
        tasks: {
          play: true,
          exercise: false,
          review: true,
        },
      },
    };

    const merged = mergeJourneyLedgers(
      first,
      second,
    );
    expect(
      getJourneySummary(
        merged,
        new Date(
          "2026-07-28T18:00:00",
        ),
      ).todayXp,
    ).toBe(60);
  });

  it("uses one shield to preserve a streak after one missed day", () => {
    const ledger = {
      "2026-07-26": {
        date: "2026-07-26",
        tasks: {
          play: true,
          exercise: true,
          review: true,
        },
      },
      "2026-07-28": {
        date: "2026-07-28",
        tasks: {
          play: false,
          exercise: true,
          review: false,
        },
      },
    };

    const protectedProgress =
      applyStreakFreeze(
        ledger,
        0,
        new Date(
          "2026-07-28T18:00:00",
        ),
      );

    expect(
      protectedProgress.protectedDate,
    ).toBe("2026-07-27");
    expect(
      protectedProgress.ledger[
        "2026-07-27"
      ].protected,
    ).toBe(true);
    expect(
      getJourneySummary(
        protectedProgress.ledger,
        new Date(
          "2026-07-28T18:00:00",
        ),
      ).streak,
    ).toBe(3);
    expect(
      getAvailableStreakFreezes(
        protectedProgress.ledger,
        protectedProgress.used,
      ),
    ).toBe(0);
  });

  it("does not grant XP for a protected day", () => {
    const ledger = {
      "2026-07-28": {
        date: "2026-07-28",
        protected: true,
        tasks: {
          play: false,
          exercise: false,
          review: false,
        },
      },
    };

    const summary = getJourneySummary(
      ledger,
      new Date(
        "2026-07-28T18:00:00",
      ),
    );
    expect(summary.streak).toBe(1);
    expect(summary.todayXp).toBe(0);
    expect(summary.completedToday).toBe(
      0,
    );
  });
});
