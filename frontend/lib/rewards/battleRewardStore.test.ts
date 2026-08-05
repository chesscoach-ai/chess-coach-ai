import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("local battle reward store", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory = "";
  let store: typeof import("@/lib/rewards/battleRewardStore");
  const player = { id: "banner@example.test", name: "Bannière" };

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "chess-coach-rewards-"),
    );
    process.chdir(temporaryDirectory);
    vi.resetModules();
    store = await import("@/lib/rewards/battleRewardStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("keeps the starter banner available and rejects an unfunded forge", async () => {
    const dashboard = await store.getBattleRewardDashboard(player);
    expect(dashboard.unlockedBannerIds).toEqual(["royal-blue"]);
    expect(dashboard.selectedBannerId).toBe("royal-blue");
    await expect(
      store.unlockBattleBanner(player, "ember-guard"),
    ).rejects.toThrow("BANNER_SHARDS_MISSING");
  });

  it("spends shards once and equips a forged banner", async () => {
    const dataDirectory = path.join(temporaryDirectory, ".data");
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(
      path.join(dataDirectory, "battle-rewards.json"),
      JSON.stringify({
        profiles: {
          [player.id]: {
            bannerShards: 100,
            unlockedBannerIds: ["royal-blue"],
            selectedBannerId: "royal-blue",
          },
        },
        claims: {},
      }),
      "utf8",
    );

    const forged = await store.unlockBattleBanner(player, "ember-guard");
    expect(forged.bannerShards).toBe(60);
    expect(forged.unlockedBannerIds).toContain("ember-guard");

    const equipped = await store.selectBattleBanner(player, "ember-guard");
    expect(equipped.selectedBannerId).toBe("ember-guard");
  });
});
