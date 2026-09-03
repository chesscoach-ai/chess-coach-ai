import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  COMMUNITY_AVATARS,
  getCommunityAvatar,
  type CommunityAvatarId,
} from "@/lib/community/avatars";
import {
  buildClanExpedition,
  getParisWeekDateKeys,
} from "@/lib/community/clanExpedition";
import { CLAN_MEMBER_LIMIT, normalizeClanInviteCode } from "@/lib/community/clanRules";
import type {
  ClanActivityItem,
  CommunityClan,
  CommunityClanMember,
  CommunityDashboard,
  CommunityMember,
} from "@/lib/community/types";
import { ensureDatabaseMigrations, getPostgresPool } from "@/lib/database/postgres";
import {
  getOnlinePlayerRating,
  getOnlinePlayerSummaries,
  getPlayerMatchStats,
  getPlayerMatchStatsForDateKeys,
  searchOnlinePlayers,
} from "@/lib/multiplayer/gameStore";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getNoxProgression } from "@/lib/nox/progressionStore";
import { getBattleRewardCosmetics } from "@/lib/rewards/battleRewardStore";

type StoredProfile = {
  avatarId: CommunityAvatarId;
  shareProgress: boolean;
};

type StoredClan = {
  id: string;
  name: string;
  tag: string;
  ownerId: string;
  members: string[];
  createdAt: string;
  inviteCode?: string;
  inviteRotatedAt?: string;
};

type LocalCommunity = {
  profiles: Record<string, StoredProfile>;
  friendships: Array<[string, string]>;
  clans: Record<string, StoredClan>;
};

const dataDirectory = path.join(process.cwd(), ".data");
const communityFile = path.join(dataDirectory, "community.json");
let localQueue: Promise<unknown> = Promise.resolve();
let databaseReady: Promise<void> | null = null;

function getPool() {
  const pool = getPostgresPool();
  if (pool) databaseReady ??= ensureDatabaseMigrations(pool);
  return pool;
}

async function readLocalCommunity(): Promise<LocalCommunity> {
  try {
    const parsed = JSON.parse(
      await readFile(communityFile, "utf8"),
    ) as Partial<LocalCommunity>;
    return {
      profiles: parsed.profiles ?? {},
      friendships: parsed.friendships ?? [],
      clans: parsed.clans ?? {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { profiles: {}, friendships: [], clans: {} };
    }
    throw error;
  }
}

async function writeLocalCommunity(value: LocalCommunity): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(communityFile, JSON.stringify(value, null, 2), "utf8");
}

function withLocalLock<T>(
  operation: (community: LocalCommunity) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(async () => {
    const community = await readLocalCommunity();
    const result = await operation(community);
    await writeLocalCommunity(community);
    return result;
  });
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function friendshipPair(first: string, second: string): [string, string] {
  return first < second ? [first, second] : [second, first];
}

function currentMonth() {
  const date = new Date();
  return {
    prefix: date.toISOString().slice(0, 7),
    label: new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

function leagueTier(points: number): string {
  if (points >= 60) return "Ligue Diamant";
  if (points >= 35) return "Ligue Or";
  if (points >= 18) return "Ligue Argent";
  return "Ligue Bronze";
}

async function getAvatarIds(
  playerIds: string[],
): Promise<Record<string, CommunityAvatarId>> {
  const database = getPool();
  if (!database) {
    const community = await readLocalCommunity();
    return Object.fromEntries(
      playerIds.map((id) => [
        id,
        community.profiles[id]?.avatarId ?? "iron-squire",
      ]),
    );
  }
  await databaseReady;
  const result = await database.query<{
    player_id: string;
    avatar_id: CommunityAvatarId;
  }>(
    `SELECT player_id, avatar_id
     FROM community_profiles
     WHERE player_id = ANY($1::text[])`,
    [playerIds],
  );
  const stored = Object.fromEntries(
    result.rows.map((row) => [row.player_id, row.avatar_id]),
  );
  return Object.fromEntries(
    playerIds.map((id) => [id, stored[id] ?? "iron-squire"]),
  );
}

async function getProfileVisibility(
  playerIds: string[],
): Promise<Record<string, boolean>> {
  const database = getPool();
  if (!database) {
    const community = await readLocalCommunity();
    return Object.fromEntries(
      playerIds.map((id) => [id, community.profiles[id]?.shareProgress ?? false]),
    );
  }
  await databaseReady;
  const result = await database.query<{ player_id: string; share_progress: boolean }>(
    `SELECT player_id, share_progress FROM community_profiles
     WHERE player_id = ANY($1::text[])`,
    [playerIds],
  );
  const stored = Object.fromEntries(result.rows.map((row) => [row.player_id, row.share_progress]));
  return Object.fromEntries(playerIds.map((id) => [id, stored[id] ?? false]));
}

function publicMemberId(playerId: string): string {
  return createHash("sha256").update(`knightly-clan:${playerId}`).digest("hex").slice(0, 12);
}

function createInviteCode(): string {
  return `KLY-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function buildMembers(
  players: Array<{ id: string; name: string; rating: number }>,
): Promise<CommunityMember[]> {
  const month = currentMonth();
  const avatars = await getAvatarIds(players.map((player) => player.id));
  return Promise.all(
    players.map(async (player) => {
      const [allTime, monthly] = await Promise.all([
        getPlayerMatchStats(player.id),
        getPlayerMatchStats(player.id, month.prefix),
      ]);
      return {
        ...player,
        avatarId: avatars[player.id] ?? "iron-squire",
        wins: allTime.wins,
        losses: allTime.losses,
        draws: allTime.draws,
        monthlyPoints: monthly.points,
      };
    }),
  );
}

async function listClans(): Promise<StoredClan[]> {
  const database = getPool();
  if (!database) {
    return Object.values((await readLocalCommunity()).clans);
  }
  await databaseReady;
  const result = await database.query<{
    id: string;
    name: string;
    tag: string;
    owner_id: string;
    created_at: Date;
    members: string[];
    invite_code: string | null;
    invite_rotated_at: Date | null;
  }>(
    `SELECT c.id, c.name, c.tag, c.owner_id, c.created_at, c.invite_code, c.invite_rotated_at,
            COALESCE(array_agg(m.player_id ORDER BY m.joined_at) FILTER (WHERE m.player_id IS NOT NULL), '{}') AS members
     FROM community_clans c
     LEFT JOIN community_clan_members m ON m.clan_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at ASC`,
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    tag: row.tag,
    ownerId: row.owner_id,
    members: row.members,
    createdAt: row.created_at.toISOString(),
    inviteCode: row.invite_code ?? undefined,
    inviteRotatedAt: (row.invite_rotated_at ?? row.created_at).toISOString(),
  }));
}

async function buildClan(clan: StoredClan): Promise<CommunityClan> {
  const month = currentMonth();
  const stats = await Promise.all(
    clan.members.map((id) => getPlayerMatchStats(id, month.prefix)),
  );
  return {
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    memberCount: clan.members.length,
    monthlyPoints: stats.reduce((total, value) => total + value.points, 0),
  };
}

async function buildClanMembers(
  clan: StoredClan,
  currentPlayerId: string,
  weekDateKeys: string[],
): Promise<{ members: CommunityClanMember[]; activity: ClanActivityItem[] }> {
  const summaries = await getOnlinePlayerSummaries(clan.members);
  const byId = Object.fromEntries(summaries.map((member) => [member.id, member]));
  const visibility = await getProfileVisibility(clan.members);
  const avatars = await getAvatarIds(clan.members);
  const rows = await Promise.all(
    clan.members.map(async (id) => {
      const source = byId[id] ?? { id, name: "Chevalier du clan", rating: 600 };
      const sharesProgress = id === currentPlayerId || Boolean(visibility[id]);
      const weekly = await getPlayerMatchStatsForDateKeys(id, weekDateKeys);
      const progression = sharesProgress
        ? await getNoxProgression({ id, name: source.name })
        : null;
      const games = weekly.wins + weekly.draws + weekly.losses;
      return {
        member: {
          publicId: publicMemberId(id),
          name: source.name,
          rating: source.rating,
          avatarId: avatars[id] ?? "iron-squire",
          noxRank: progression?.rank ?? null,
          noxRankLabel: progression?.rankLabel ?? null,
          activityLabel: sharesProgress
            ? games > 0
              ? `${games} partie${games > 1 ? "s" : ""} cette semaine`
              : "Prêt pour une partie"
            : "Progression privée",
          isCurrentPlayer: id === currentPlayerId,
          isOwner: id === clan.ownerId,
          sharesProgress,
        } satisfies CommunityClanMember,
        games,
      };
    }),
  );
  const activity: ClanActivityItem[] = rows
    .filter((row) => row.member.sharesProgress && row.games > 0)
    .map((row) => ({
      id: `week-${row.member.publicId}`,
      kind: "game" as const,
      message: `${row.member.name} a joué ${row.games} partie${row.games > 1 ? "s" : ""} avec la troupe cette semaine.`,
      occurredAt: weekDateKeys[0],
    }));
  activity.push({
    id: `welcome-${clan.id}`,
    kind: "welcome",
    message: `La bannière ${clan.name} est levée. Bienvenue dans la troupe !`,
    occurredAt: clan.createdAt,
  });
  return { members: rows.map((row) => row.member), activity };
}

export async function getCommunityDashboard(
  player: AuthenticatedPlayer,
): Promise<CommunityDashboard> {
  const database = getPool();
  let friendIds: string[];
  let ownAvatarId: CommunityAvatarId;

  if (!database) {
    const community = await withLocalLock((value) => {
      value.profiles[player.id] ??= { avatarId: "iron-squire", shareProgress: false };
      return value;
    });
    ownAvatarId = community.profiles[player.id].avatarId;
    friendIds = community.friendships.flatMap(([first, second]) =>
      first === player.id ? [second] : second === player.id ? [first] : [],
    );
  } else {
    await databaseReady;
    const profile = await database.query<{ avatar_id: CommunityAvatarId }>(
      `INSERT INTO community_profiles (player_id)
       VALUES ($1)
       ON CONFLICT (player_id) DO UPDATE SET updated_at = NOW()
       RETURNING avatar_id`,
      [player.id],
    );
    ownAvatarId = profile.rows[0]?.avatar_id ?? "iron-squire";
    const friends = await database.query<{ friend_id: string }>(
      `SELECT CASE WHEN player_a = $1 THEN player_b ELSE player_a END AS friend_id
       FROM community_friendships
       WHERE player_a = $1 OR player_b = $1`,
      [player.id],
    );
    friendIds = friends.rows.map((row) => row.friend_id);
  }

  const [rating, friendPlayers, cosmetics] = await Promise.all([
    getOnlinePlayerRating(player.id),
    getOnlinePlayerSummaries(friendIds),
    getBattleRewardCosmetics(player.id),
  ]);
  const [profile] = await buildMembers([
    { id: player.id, name: player.name, rating },
  ]);
  profile.avatarId = ownAvatarId;
  profile.bannerId = cosmetics.selectedBannerId;
  const friends = (await buildMembers(friendPlayers)).sort(
    (first, second) => second.rating - first.rating,
  );
  const leagueMembers = [profile, ...friends].sort(
    (first, second) =>
      second.monthlyPoints - first.monthlyPoints ||
      second.rating - first.rating,
  );
  const storedClans = await listClans();
  const clans = await Promise.all(storedClans.map(buildClan));
  clans.sort(
    (first, second) =>
      second.monthlyPoints - first.monthlyPoints ||
      second.memberCount - first.memberCount,
  );
  const ownStoredClan = storedClans.find((clan) =>
    clan.members.includes(player.id),
  );
  const ownClanId = ownStoredClan?.id;
  const weekDateKeys = getParisWeekDateKeys();
  const clanExpedition = ownStoredClan
    ? await buildStoredClanExpedition(ownStoredClan, weekDateKeys)
    : null;
  const clanSocial = ownStoredClan
    ? await buildClanMembers(ownStoredClan, player.id, weekDateKeys)
    : { members: [], activity: [] };
  const ownVisibility = await getProfileVisibility([player.id]);
  const gamesThisWeek = clanExpedition?.contributions.reduce(
    (total, contribution) => total + contribution.games,
    0,
  ) ?? 0;
  const weeklyTarget = Math.max(4, (ownStoredClan?.members.length ?? 1) * 2);

  return {
    profile,
    friends,
    league: {
      monthLabel: currentMonth().label,
      tier: leagueTier(profile.monthlyPoints),
      points: profile.monthlyPoints,
      rank:
        leagueMembers.findIndex((member) => member.id === player.id) + 1,
    },
    clan: ownClanId
      ? {
          ...(clans.find((clan) => clan.id === ownClanId) as CommunityClan),
          inviteCode: ownStoredClan?.inviteCode ?? ownStoredClan?.tag,
        }
      : null,
    clanExpedition,
    clanLeaderboard: clans.slice(0, 8),
    clanMembers: clanSocial.members,
    clanActivity: clanSocial.activity,
    clanWeeklyGoal: ownStoredClan
      ? {
          label: "Jouer ensemble cette semaine",
          current: gamesThisWeek,
          target: weeklyTarget,
          completed: gamesThisWeek >= weeklyTarget,
          weekLabel: clanExpedition?.weekLabel ?? "Cette semaine",
        }
      : null,
    clanRole: ownStoredClan
      ? ownStoredClan.ownerId === player.id
        ? "owner"
        : "member"
      : null,
    shareProgress: ownVisibility[player.id] ?? false,
  };
}

async function buildStoredClanExpedition(
  clan: StoredClan,
  weekDateKeys: string[],
) {
  const summaries = await getOnlinePlayerSummaries(clan.members);
  const names = Object.fromEntries(
    summaries.map((member) => [member.id, member.name]),
  );
  const contributions = await Promise.all(
    clan.members.map(async (id) => ({
      id,
      name: names[id] ?? "Chevalier mystérieux",
      ...(await getPlayerMatchStatsForDateKeys(id, weekDateKeys)),
    })),
  );
  return buildClanExpedition(contributions, weekDateKeys);
}

export async function selectCommunityAvatar(
  player: AuthenticatedPlayer,
  avatarId: CommunityAvatarId,
): Promise<void> {
  const avatar = getCommunityAvatar(avatarId);
  const rating = await getOnlinePlayerRating(player.id);
  if (rating < avatar.requiredRating) throw new Error("AVATAR_LOCKED");
  const database = getPool();

  if (!database) {
    await withLocalLock((community) => {
      community.profiles[player.id] = {
        avatarId,
        shareProgress: community.profiles[player.id]?.shareProgress ?? false,
      };
    });
    return;
  }
  await databaseReady;
  await database.query(
    `INSERT INTO community_profiles (player_id, avatar_id)
     VALUES ($1, $2)
     ON CONFLICT (player_id) DO UPDATE
       SET avatar_id = EXCLUDED.avatar_id, updated_at = NOW()`,
    [player.id, avatarId],
  );
}

export async function addCommunityFriend(
  player: AuthenticatedPlayer,
  query: string,
): Promise<void> {
  const matches = await searchOnlinePlayers(query, player.id);
  const normalized = query.trim().toLocaleLowerCase("fr");
  const friend =
    matches.find(
      (match) =>
        match.id.toLocaleLowerCase("fr") === normalized ||
        match.name.toLocaleLowerCase("fr") === normalized,
    ) ?? matches[0];
  if (!friend) throw new Error("PLAYER_NOT_FOUND");
  const [first, second] = friendshipPair(player.id, friend.id);
  const database = getPool();

  if (!database) {
    await withLocalLock((community) => {
      if (
        !community.friendships.some(
          ([a, b]) => a === first && b === second,
        )
      ) {
        community.friendships.push([first, second]);
      }
    });
    return;
  }
  await databaseReady;
  await database.query(
    `INSERT INTO community_friendships (player_a, player_b)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [first, second],
  );
}

export async function createCommunityClan(
  player: AuthenticatedPlayer,
  name: string,
  tag: string,
): Promise<void> {
  const cleanName = name.trim();
  const cleanTag = tag.trim().toUpperCase();
  if (cleanName.length < 3 || !/^[A-Z0-9]{2,8}$/.test(cleanTag)) {
    throw new Error("INVALID_REQUEST");
  }
  const database = getPool();
  const inviteCode = createInviteCode();

  if (!database) {
    await withLocalLock((community) => {
      if (
        Object.values(community.clans).some(
          (clan) => clan.members.includes(player.id) || clan.tag === cleanTag,
        )
      ) {
        throw new Error("CLAN_CONFLICT");
      }
      const id = randomUUID();
      community.clans[id] = {
        id,
        name: cleanName,
        tag: cleanTag,
        ownerId: player.id,
        members: [player.id],
        createdAt: new Date().toISOString(),
        inviteCode,
        inviteRotatedAt: new Date().toISOString(),
      };
    });
    return;
  }
  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const clanId = randomUUID();
    await client.query(
      `INSERT INTO community_clans (id, name, tag, owner_id, invite_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [clanId, cleanName, cleanTag, player.id, inviteCode],
    );
    await client.query(
      `INSERT INTO community_clan_members (clan_id, player_id)
       VALUES ($1, $2)`,
      [clanId, player.id],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("CLAN_CONFLICT");
  } finally {
    client.release();
  }
}

export async function joinCommunityClan(
  player: AuthenticatedPlayer,
  inviteCode: string,
): Promise<void> {
  const cleanCode = normalizeClanInviteCode(inviteCode);
  if (!cleanCode) {
    throw new Error("CLAN_INVITE_INVALID");
  }
  const database = getPool();

  if (!database) {
    await withLocalLock((community) => {
      if (
        Object.values(community.clans).some((clan) =>
          clan.members.includes(player.id),
        )
      ) {
        throw new Error("CLAN_CONFLICT");
      }
      const clan = Object.values(community.clans).find(
        (candidate) =>
          candidate.inviteCode === cleanCode ||
          (!candidate.inviteCode && candidate.tag === cleanCode),
      );
      if (!clan) throw new Error("CLAN_INVITE_INVALID");
      if (clan.members.length >= CLAN_MEMBER_LIMIT) throw new Error("CLAN_FULL");
      clan.members.push(player.id);
    });
    return;
  }
  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string }>(
      `SELECT c.id FROM community_clans c
       WHERE c.invite_code = $1 OR (c.invite_code IS NULL AND c.tag = $1)
       LIMIT 1 FOR UPDATE`,
      [cleanCode],
    );
    if (!result.rows[0]) throw new Error("CLAN_INVITE_INVALID");
    const size = await client.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM community_clan_members WHERE clan_id = $1",
      [result.rows[0].id],
    );
    if (Number(size.rows[0]?.count ?? 0) >= CLAN_MEMBER_LIMIT) throw new Error("CLAN_FULL");
    await client.query(
      `INSERT INTO community_clan_members (clan_id, player_id)
       VALUES ($1, $2)`,
      [result.rows[0].id, player.id],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && ["CLAN_INVITE_INVALID", "CLAN_FULL"].includes(error.message)) throw error;
    throw new Error("CLAN_CONFLICT");
  } finally {
    client.release();
  }
}

export async function setCommunityProgressSharing(
  player: AuthenticatedPlayer,
  shareProgress: boolean,
): Promise<void> {
  const database = getPool();
  if (!database) {
    await withLocalLock((community) => {
      const current = community.profiles[player.id];
      community.profiles[player.id] = {
        avatarId: current?.avatarId ?? "iron-squire",
        shareProgress,
      };
    });
    return;
  }
  await databaseReady;
  await database.query(
    `INSERT INTO community_profiles (player_id, share_progress)
     VALUES ($1, $2)
     ON CONFLICT (player_id) DO UPDATE
       SET share_progress = EXCLUDED.share_progress, updated_at = NOW()`,
    [player.id, shareProgress],
  );
}

export async function rotateCommunityClanInvite(
  player: AuthenticatedPlayer,
): Promise<string> {
  const inviteCode = createInviteCode();
  const database = getPool();
  if (!database) {
    return withLocalLock((community) => {
      const clan = Object.values(community.clans).find((item) => item.ownerId === player.id);
      if (!clan) throw new Error("CLAN_OWNER_REQUIRED");
      if (clan.inviteRotatedAt && Date.now() - Date.parse(clan.inviteRotatedAt) < 10_000) {
        throw new Error("CLAN_RATE_LIMIT");
      }
      clan.inviteCode = inviteCode;
      clan.inviteRotatedAt = new Date().toISOString();
      return inviteCode;
    });
  }
  await databaseReady;
  const result = await database.query<{ invite_code: string }>(
    `UPDATE community_clans SET invite_code = $2, invite_rotated_at = NOW()
     WHERE owner_id = $1
       AND COALESCE(invite_rotated_at, created_at) <= NOW() - INTERVAL '10 seconds'
     RETURNING invite_code`,
    [player.id, inviteCode],
  );
  if (!result.rows[0]) {
    const ownsClan = await database.query("SELECT 1 FROM community_clans WHERE owner_id = $1", [player.id]);
    throw new Error(ownsClan.rowCount ? "CLAN_RATE_LIMIT" : "CLAN_OWNER_REQUIRED");
  }
  return result.rows[0].invite_code;
}

export async function leaveCommunityClan(
  player: AuthenticatedPlayer,
): Promise<"left" | "transferred" | "dissolved"> {
  const database = getPool();
  if (!database) {
    return withLocalLock((community) => {
      const clan = Object.values(community.clans).find((item) => item.members.includes(player.id));
      if (!clan) throw new Error("CLAN_NOT_FOUND");
      clan.members = clan.members.filter((id) => id !== player.id);
      if (clan.members.length === 0) {
        delete community.clans[clan.id];
        return "dissolved";
      }
      if (clan.ownerId === player.id) {
        clan.ownerId = clan.members[0];
        return "transferred";
      }
      return "left";
    });
  }
  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const membership = await client.query<{ clan_id: string; owner_id: string }>(
      `SELECT m.clan_id, c.owner_id FROM community_clan_members m
       JOIN community_clans c ON c.id = m.clan_id WHERE m.player_id = $1 FOR UPDATE`,
      [player.id],
    );
    const row = membership.rows[0];
    if (!row) throw new Error("CLAN_NOT_FOUND");
    await client.query("DELETE FROM community_clan_members WHERE clan_id = $1 AND player_id = $2", [row.clan_id, player.id]);
    const next = await client.query<{ player_id: string }>(
      "SELECT player_id FROM community_clan_members WHERE clan_id = $1 ORDER BY joined_at ASC LIMIT 1",
      [row.clan_id],
    );
    let result: "left" | "transferred" | "dissolved" = "left";
    if (!next.rows[0]) {
      await client.query("DELETE FROM community_clans WHERE id = $1", [row.clan_id]);
      result = "dissolved";
    } else if (row.owner_id === player.id) {
      await client.query("UPDATE community_clans SET owner_id = $2 WHERE id = $1", [row.clan_id, next.rows[0].player_id]);
      result = "transferred";
    }
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function isCommunityAvatarId(value: string): value is CommunityAvatarId {
  return COMMUNITY_AVATARS.some((avatar) => avatar.id === value);
}
