import { describe, expect, it } from "vitest";

import { buildClanPreview, resolveClanPreview } from "@/lib/community/clanPreview";

describe("Clan V2 DEV previews", () => {
  it("refuses every preview in production", () => {
    expect(resolveClanPreview("active", "production")).toBeNull();
  });

  it("provides empty, active and completed-goal scenarios without private ids", () => {
    expect(buildClanPreview("empty").clan).toBeNull();
    const active = buildClanPreview("active");
    expect(active.clanMembers).toHaveLength(3);
    expect(active.clanMembers.some((member) => member.name.includes("@"))).toBe(false);
    expect(buildClanPreview("goal").clanWeeklyGoal?.completed).toBe(true);
  });

  it("keeps Nox rank server-shaped and hides opted-out progress", () => {
    const members = buildClanPreview("active").clanMembers;
    expect(members[0].noxRankLabel).toBe("Jeune Chevalier");
    expect(members[2]).toMatchObject({ sharesProgress: false, noxRank: null });
  });
});
