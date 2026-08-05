import { describe, expect, it } from "vitest";

import { COMMUNITY_AVATARS } from "@/lib/community/avatars";

describe("community avatar collection", () => {
  it("offers a substantial, progressively unlocked collection", () => {
    expect(COMMUNITY_AVATARS).toHaveLength(10);
    expect(new Set(COMMUNITY_AVATARS.map((avatar) => avatar.id)).size).toBe(
      COMMUNITY_AVATARS.length,
    );
    expect(COMMUNITY_AVATARS.map((avatar) => avatar.requiredRating)).toEqual(
      [...COMMUNITY_AVATARS]
        .map((avatar) => avatar.requiredRating)
        .sort((left, right) => left - right),
    );
    expect(COMMUNITY_AVATARS[0].requiredRating).toBe(0);
    expect(COMMUNITY_AVATARS.at(-1)?.requiredRating).toBe(2400);
  });
});
