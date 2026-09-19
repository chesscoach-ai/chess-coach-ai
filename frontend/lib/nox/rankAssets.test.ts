import { describe, expect, it } from "vitest";

import { getNoxRankVisual, NOX_RANK_ASSETS, NOX_STATE_VISUALS } from "@/lib/nox/rankAssets";
import { NOX_RANK_IDS } from "@/lib/nox/progressionTypes";

describe("identité visuelle vivante de Nox", () => {
  it("décrit exactement les six rangs pédagogiques existants", () => {
    expect(Object.keys(NOX_RANK_ASSETS)).toEqual([...NOX_RANK_IDS]);
    for (const rank of NOX_RANK_IDS) {
      expect(NOX_RANK_ASSETS[rank]).toMatchObject({
        avatar: expect.stringMatching(new RegExp(`/nox-${rank}-512\\.webp$`)),
        compactAvatar: expect.stringMatching(new RegExp(`/nox-${rank}-256\\.webp$`)),
        fallbackAvatar: expect.stringMatching(/^\//),
        description: expect.any(String),
        milestone: expect.any(String),
      });
    }
  });

  it("retombe sur l’Écuyer si aucun rang n’est disponible", () => {
    expect(getNoxRankVisual(undefined)).toBe(NOX_RANK_ASSETS.squire);
    expect(getNoxRankVisual(null).fallbackAvatar).toBe("/brand/nox-squire.svg");
  });

  it("rend les états émotionnels sobres et compatibles reduced motion", () => {
    expect(Object.keys(NOX_STATE_VISUALS)).toEqual([
      "idle", "listening", "thinking", "tip", "success", "warning",
    ]);
    for (const visual of Object.values(NOX_STATE_VISUALS)) {
      expect(visual.label).not.toBe("");
      expect(visual.motion).toContain("motion-safe:");
    }
  });

  it("utilise les six illustrations finales avec le fallback provisoire", () => {
    expect(new Set(Object.values(NOX_RANK_ASSETS).map((asset) => asset.fallbackAvatar)))
      .toEqual(new Set(["/brand/nox-squire.svg"]));
    expect(Object.values(NOX_RANK_ASSETS).every((asset) => asset.assetStatus === "final")).toBe(true);
  });
});
