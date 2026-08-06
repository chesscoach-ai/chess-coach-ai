import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("local multiplayer store", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory = "";
  let store: typeof import("@/lib/multiplayer/gameStore");
  let community: typeof import("@/lib/community/communityStore");

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "chess-coach-multiplayer-"),
    );
    process.chdir(temporaryDirectory);
    vi.resetModules();
    store = await import("@/lib/multiplayer/gameStore");
    community = await import("@/lib/community/communityStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("synchronizes moves, enforces turns and updates Elo after resignation", async () => {
    const white = { id: "white@example.test", name: "Alice" };
    const black = { id: "black@example.test", name: "Bob" };
    const outsider = { id: "other@example.test", name: "Eve" };

    const invitation = await store.createOnlineGame(white, 10);
    expect(invitation.status).toBe("waiting");
    expect(invitation.inviteCode).toHaveLength(6);

    const joined = await store.joinOnlineGame(invitation.inviteCode, black);
    expect(joined.status).toBe("active");
    expect(joined.youAre).toBe("black");

    await expect(
      store.playOnlineMove(joined.id, black, { from: "e7", to: "e5" }),
    ).rejects.toThrow("NOT_YOUR_TURN");
    await expect(store.getOnlineGame(joined.id, outsider)).rejects.toThrow(
      "GAME_FORBIDDEN",
    );

    const afterWhiteMove = await store.playOnlineMove(joined.id, white, {
      from: "e2",
      to: "e4",
    });
    expect(afterWhiteMove.moves.map((move) => move.uci)).toEqual(["e2e4"]);
    expect(afterWhiteMove.turn).toBe("black");

    const synchronizedForBlack = await store.getOnlineGame(joined.id, black);
    expect(synchronizedForBlack.fen).toBe(afterWhiteMove.fen);

    const finished = await store.resignOnlineGame(joined.id, black);
    expect(finished.result).toBe("1-0");
    expect(finished.white.ratingAfter).toBe(616);
    expect(finished.black?.ratingAfter).toBe(584);
    expect(finished.timeControl.speed).toBe("rapid");
    expect(finished.endedAt).not.toBeNull();

    const history =
      await store.listFinishedOnlineGames(
        white,
        [finished.id],
      );
    expect(history).toHaveLength(1);
    expect(history[0].reviewUnlocked).toBe(true);
    expect(history[0].pgn).toContain("1. e4");

    await store.saveOnlineGameAccuracy(
      finished.id,
      white,
      91,
      76,
    );
    const reviewedHistory =
      await store.listFinishedOnlineGames(
        white,
        [finished.id],
      );
    expect(reviewedHistory[0].whiteAccuracy).toBe(91);
    expect(reviewedHistory[0].blackAccuracy).toBe(76);

    const statistics =
      await store.getOnlinePlayerStatistics(
        white,
      );
    expect(statistics).toMatchObject({
      games: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      currentRating: 616,
      peakRating: 616,
      ratingChange: 16,
      averageAccuracy: 91,
      analyzedGames: 1,
      currentStreak: 1,
    });
    expect(
      statistics.bySpeed.rapid.games,
    ).toBe(1);
  });

  it("matches two players of a similar rating without an invite code", async () => {
    const first = { id: "match-a@example.test", name: "Mina" };
    const second = { id: "match-b@example.test", name: "Noé" };

    const waiting = await store.findMatchmakingGame(first, 5);
    expect(waiting.status).toBe("waiting");
    expect(waiting.matchType).toBe("matchmaking");

    const matched = await store.findMatchmakingGame(second, 5);
    expect(matched.id).toBe(waiting.id);
    expect(matched.status).toBe("active");
    expect(matched.youAre).toBe("black");

    const synchronized = await store.getOnlineGame(waiting.id, first);
    expect(synchronized.black?.name).toBe("Noé");
  });

  it("requires both players to agree before ending a game as a draw", async () => {
    const white = { id: "draw-white@example.test", name: "Lina" };
    const black = { id: "draw-black@example.test", name: "Sam" };

    const invitation = await store.createOnlineGame(white, 10);
    const joined = await store.joinOnlineGame(invitation.inviteCode, black);

    const offered = await store.offerOnlineGameDraw(joined.id, white);
    expect(offered.drawOfferBy).toBe("white");
    expect(offered.status).toBe("active");

    await expect(
      store.respondToOnlineGameDraw(joined.id, white, true),
    ).rejects.toThrow("DRAW_OFFER_OWN");

    const declined = await store.respondToOnlineGameDraw(
      joined.id,
      black,
      false,
    );
    expect(declined.drawOfferBy).toBeNull();
    expect(declined.status).toBe("active");

    await store.offerOnlineGameDraw(joined.id, black);
    const finished = await store.respondToOnlineGameDraw(
      joined.id,
      white,
      true,
    );
    expect(finished.status).toBe("finished");
    expect(finished.result).toBe("1/2-1/2");
    expect(finished.termination).toBe("Nulle par accord");
    expect(finished.white.ratingAfter).toBe(600);
    expect(finished.black?.ratingAfter).toBe(600);
    expect(finished.drawOfferBy).toBeNull();
  });

  it("withdraws an unanswered draw offer when play continues", async () => {
    const white = { id: "move-white@example.test", name: "Iris" };
    const black = { id: "move-black@example.test", name: "Noam" };

    const invitation = await store.createOnlineGame(white, 5);
    const joined = await store.joinOnlineGame(invitation.inviteCode, black);
    await store.offerOnlineGameDraw(joined.id, black);

    const continued = await store.playOnlineMove(joined.id, white, {
      from: "e2",
      to: "e4",
    });
    expect(continued.drawOfferBy).toBeNull();
  });

  it("persists an avatar, a friendship and a clan", async () => {
    const player = { id: "match-a@example.test", name: "Mina" };

    await community.selectCommunityAvatar(player, "iron-squire");
    await community.addCommunityFriend(player, "Noé");
    await community.createCommunityClan(player, "Cavaliers du Nord", "NORD");

    const dashboard = await community.getCommunityDashboard(player);
    expect(dashboard.profile.avatarId).toBe("iron-squire");
    expect(dashboard.friends.map((friend) => friend.name)).toContain("Noé");
    expect(dashboard.clan?.tag).toBe("NORD");
  });
});
