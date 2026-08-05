import { describe, expect, it } from "vitest";

import {
  BATTLE_BANNERS,
  getBattleBanner,
  isBattleBannerId,
} from "@/lib/rewards/banners";

describe("battle banners", () => {
  it("keeps a free starter banner and increasingly valuable cosmetics", () => {
    expect(BATTLE_BANNERS[0]).toMatchObject({
      id: "royal-blue",
      cost: 0,
    });
    expect(BATTLE_BANNERS.map((banner) => banner.cost)).toEqual([
      0, 40, 80, 140, 220,
    ]);
  });

  it("validates public banner identifiers", () => {
    expect(isBattleBannerId("crystal-storm")).toBe(true);
    expect(isBattleBannerId("pay-to-win-sword")).toBe(false);
    expect(getBattleBanner("unknown").id).toBe("royal-blue");
  });
});
