import { describe, expect, it } from "vitest";

import {
  buildClanExpedition,
  getExpeditionMedals,
  getParisWeekDateKeys,
} from "@/lib/community/clanExpedition";

describe("clan expedition", () => {
  it("rewards every finished game while keeping wins more valuable", () => {
    expect(
      getExpeditionMedals({ wins: 2, draws: 1, losses: 3, points: 7 }),
    ).toBe(13);
  });

  it("builds a ranked weekly expedition from real contributions", () => {
    const expedition = buildClanExpedition(
      [
        {
          id: "alice",
          name: "Alice",
          wins: 4,
          draws: 1,
          losses: 2,
          points: 13,
        },
        {
          id: "bob",
          name: "Bob",
          wins: 1,
          draws: 0,
          losses: 3,
          points: 3,
        },
      ],
      [
        "2026-07-27",
        "2026-07-28",
        "2026-07-29",
        "2026-07-30",
        "2026-07-31",
        "2026-08-01",
        "2026-08-02",
      ],
    );

    expect(expedition.medals).toBe(27);
    expect(expedition.stage).toBe("Pont-levis franchi");
    expect(expedition.nextStageAt).toBe(50);
    expect(expedition.contributions[0]).toMatchObject({
      id: "alice",
      medals: 20,
      games: 7,
    });
  });

  it("always returns a complete Monday-to-Sunday week", () => {
    expect(getParisWeekDateKeys(new Date("2026-07-28T12:00:00Z"))).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
});
