import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import {
  COMMUNITY_AVATARS,
  getCommunityAvatar,
  type CommunityAvatarId,
} from "@/lib/community/avatars";
import type {
  CommunityClan,
  CommunityDashboard,
  CommunityMember,
} from "@/lib/community/types";
import {
  getOnlinePlayerRating,
  getOnlinePlayerSummaries,
  getPlayerMatchStats,
  searchOnlinePlayers,
} from "@/lib/multiplayer/gameStore";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

type StoredProfile = {
  avatarId: CommunityAvatarId;
};

type StoredClan = {
  id: string;
  name: string;
  tag: string;
  ownerId: string;
  members: string[];
  createdAt: string;
};

type LocalCommunity = {
  profiles: Record<string, StoredProfile>;
  friendships: Array<[string, string]>;
  clans: Record<string, StoredClan>;
};

const dataDirectory = path.join(process.cwd(), ".data");
const communityFile = path.join(dataDirectory, "community.json");
let localQueue: Promise<unknown> = Promise.resolve();
let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  databaseReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS community_profiles (
        player_id TEXT PRIMARY KEY,
        avatar_id VARCHAR(40) NOT NULL DEFAULT 'iron-squire',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS community_friendships (
        player_a TEXT NOT NULL,
        player_b TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (player_a, player_b),
        CHECK (player_a < player_b)
      );
      CREATE TABLE IF NOT EXISTS community_clans (
        id UUID PRIMARY KEY,
        name VARCHAR(60) NOT NULL,
        tag VARCHAR(8) UNIQUE NOT NULL,
        owner_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS community_clan_members (
        clan_id UUID NOT NULL REFERENCES community_clans(id) ON DELETE CASCADE,
        player_id TEXT UNIQUE NOT NULL,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (clan_id, player_id)
      );
    `)
    .then(() => undefined);
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
  }>(
    `SELECT c.id, c.name, c.tag, c.owner_id, c.created_at,
            COALESCE(array_agg(m.player_id) FILTER (WHERE m.player_id IS NOT NULL), '{}') AS members
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

export async function getCommunityDashboard(
  player: AuthenticatedPlayer,
): Promise<CommunityDashboard> {
  const database = getPool();
  let friendIds: string[];
  let ownAvatarId: CommunityAvatarId;

  if (!database) {
    const community = await withLocalLock((value) => {
      value.profiles[player.id] ??= { avatarId: "iron-squire" };
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

  const rating = await getOnlinePlayerRating(player.id);
  const friendPlayers = await getOnlinePlayerSummaries(friendIds);
  const [profile] = await buildMembers([
    { id: player.id, name: player.name, rating },
  ]);
  profile.avatarId = ownAvatarId;
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
  const ownClanId = storedClans.find((clan) =>
    clan.members.includes(player.id),
  )?.id;

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
      ? clans.find((clan) => clan.id === ownClanId) ?? null
      : null,
    clanLeaderboard: clans.slice(0, 8),
  };
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
      community.profiles[player.id] = { avatarId };
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
      `INSERT INTO community_clans (id, name, tag, owner_id)
       VALUES ($1, $2, $3, $4)`,
      [clanId, cleanName, cleanTag, player.id],
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
  tag: string,
): Promise<void> {
  const cleanTag = tag.trim().toUpperCase();
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
        (candidate) => candidate.tag === cleanTag,
      );
      if (!clan) throw new Error("CLAN_NOT_FOUND");
      clan.members.push(player.id);
    });
    return;
  }
  await databaseReady;
  const result = await database.query<{ id: string }>(
    `SELECT id FROM community_clans WHERE tag = $1 LIMIT 1`,
    [cleanTag],
  );
  if (!result.rows[0]) throw new Error("CLAN_NOT_FOUND");
  try {
    await database.query(
      `INSERT INTO community_clan_members (clan_id, player_id)
       VALUES ($1, $2)`,
      [result.rows[0].id, player.id],
    );
  } catch {
    throw new Error("CLAN_CONFLICT");
  }
}

export function isCommunityAvatarId(value: string): value is CommunityAvatarId {
  return COMMUNITY_AVATARS.some((avatar) => avatar.id === value);
}
