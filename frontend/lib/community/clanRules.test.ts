import { describe, expect, it } from "vitest";

import { canJoinClan, isPublicClanActivity, normalizeClanInviteCode, ownerDepartureOutcome } from "@/lib/community/clanRules";

describe("Clan V2 social rules", () => {
  it("accepts public invite codes and rejects malformed or sensitive-looking values", () => {
    expect(normalizeClanInviteCode(" kly-a1b2c3d4 ")).toBe("KLY-A1B2C3D4");
    expect(normalizeClanInviteCode("friend@example.com")).toBeNull();
    expect(normalizeClanInviteCode("KLY-EXPIRED!")).toBeNull();
  });

  it("limits small groups and prevents duplicate membership", () => {
    expect(canJoinClan(2, false)).toBe("allowed");
    expect(canJoinClan(12, false)).toBe("full");
    expect(canJoinClan(2, true)).toBe("already-member");
  });

  it("transfers ownership or dissolves the last-member clan coherently", () => {
    expect(ownerDepartureOutcome(["next-member"])).toBe("transfer");
    expect(ownerDepartureOutcome([])).toBe("dissolve");
  });

  it("never publishes opted-out, PGN-like or conversational activity", () => {
    expect(isPublicClanActivity({ sharesProgress: true, containsPrivateGame: false, containsConversation: false })).toBe(true);
    expect(isPublicClanActivity({ sharesProgress: false, containsPrivateGame: false, containsConversation: false })).toBe(false);
    expect(isPublicClanActivity({ sharesProgress: true, containsPrivateGame: true, containsConversation: false })).toBe(false);
    expect(isPublicClanActivity({ sharesProgress: true, containsPrivateGame: false, containsConversation: true })).toBe(false);
  });
});
