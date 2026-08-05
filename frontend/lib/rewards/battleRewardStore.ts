import "server-only";

import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import {
  getOnlinePlayerRating,
  listFinishedOnlineGames,
} from "@/lib/multiplayer/gameStore";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import {
  getBattleArena,
  getDailyCrowns,
  getParisDateKey,
  type BattleArena,
} from "@/lib/rewards/battleRewards";
import {
  getBattleBanner,
  type BattleBannerId,
} from "@/lib/rewards/banners";

export type BattleRewardDashboard = {
  date: string;
  crowns: number;
  crownGoal: number;
  claimed: boolean;
  bannerShards: number;
  chestShards: number;
  rating: number;
  arena: BattleArena;
  unlockedBannerIds: BattleBannerId[];
  selectedBannerId: BattleBannerId;
};

type LocalBattleRewards = {
  profiles: Record<
    string,
    {
      bannerShards: number;
      unlockedBannerIds?: BattleBannerId[];
      selectedBannerId?: BattleBannerId;
    }
  >;
  claims: Record<
    string,
    {
      playerId: string;
      rewardDate: string;
      amount: number;
    }
  >;
};

const CROWN_GOAL = 6;
const CHEST_SHARDS = 20;
const dataDirectory = path.join(
  process.cwd(),
  ".data",
);
const rewardsFile = path.join(
  dataDirectory,
  "battle-rewards.json",
);
let localQueue: Promise<unknown> =
  Promise.resolve();
let pool: Pool | null = null;
let databaseReady:
  | Promise<void>
  | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  pool ??= new Pool({
    connectionString:
      process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV ===
      "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  databaseReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS battle_reward_profiles (
        player_id TEXT PRIMARY KEY,
        banner_shards INTEGER NOT NULL DEFAULT 0,
        unlocked_banner_ids JSONB NOT NULL DEFAULT '["royal-blue"]'::jsonb,
        selected_banner_id VARCHAR(40) NOT NULL DEFAULT 'royal-blue',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() =>
      Promise.all([
        pool!.query(`
          ALTER TABLE battle_reward_profiles
          ADD COLUMN IF NOT EXISTS unlocked_banner_ids JSONB
          NOT NULL DEFAULT '["royal-blue"]'::jsonb
        `),
        pool!.query(`
          ALTER TABLE battle_reward_profiles
          ADD COLUMN IF NOT EXISTS selected_banner_id VARCHAR(40)
          NOT NULL DEFAULT 'royal-blue'
        `),
        pool!.query(`
      CREATE TABLE IF NOT EXISTS battle_reward_claims (
        player_id TEXT NOT NULL,
        reward_date TEXT NOT NULL,
        amount INTEGER NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (player_id, reward_date)
      )
        `),
      ]),
    )
    .then(() => undefined);
  return pool;
}

export async function getBattleRewardDashboard(
  player: AuthenticatedPlayer,
): Promise<BattleRewardDashboard> {
  const date = getParisDateKey();
  const [games, rating, stored] =
    await Promise.all([
      listFinishedOnlineGames(player),
      getOnlinePlayerRating(player.id),
      readRewardState(
        player.id,
        date,
      ),
    ]);
  return {
    date,
    crowns: getDailyCrowns(
      games,
      date,
    ),
    crownGoal: CROWN_GOAL,
    claimed: stored.claimed,
    bannerShards:
      stored.bannerShards,
    chestShards: CHEST_SHARDS,
    rating,
    arena: getBattleArena(rating),
    unlockedBannerIds:
      stored.unlockedBannerIds,
    selectedBannerId:
      stored.selectedBannerId,
  };
}

export async function getBattleRewardCosmetics(playerId: string): Promise<{
  bannerShards: number;
  unlockedBannerIds: BattleBannerId[];
  selectedBannerId: BattleBannerId;
}> {
  const stored = await readRewardState(playerId, getParisDateKey());
  return {
    bannerShards: stored.bannerShards,
    unlockedBannerIds: stored.unlockedBannerIds,
    selectedBannerId: stored.selectedBannerId,
  };
}

export async function claimBattleReward(
  player: AuthenticatedPlayer,
): Promise<BattleRewardDashboard> {
  const dashboard =
    await getBattleRewardDashboard(
      player,
    );
  if (
    dashboard.crowns <
    dashboard.crownGoal
  ) {
    throw new Error(
      "REWARD_NOT_READY",
    );
  }
  if (dashboard.claimed) {
    throw new Error(
      "REWARD_ALREADY_CLAIMED",
    );
  }

  const database = getPool();
  if (!database) {
    await withLocalLock((value) => {
      const claimKey = `${player.id}:${dashboard.date}`;
      if (value.claims[claimKey]) {
        throw new Error(
          "REWARD_ALREADY_CLAIMED",
        );
      }
      value.claims[claimKey] = {
        playerId: player.id,
        rewardDate:
          dashboard.date,
        amount: CHEST_SHARDS,
      };
      value.profiles[player.id] = {
        ...value.profiles[player.id],
        bannerShards:
          (value.profiles[player.id]
            ?.bannerShards ?? 0) +
          CHEST_SHARDS,
      };
    });
  } else {
    await databaseReady;
    const client =
      await database.connect();
    try {
      await client.query("BEGIN");
      const claim =
        await client.query(
          `INSERT INTO battle_reward_claims (
             player_id,
             reward_date,
             amount
           )
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING
           RETURNING player_id`,
          [
            player.id,
            dashboard.date,
            CHEST_SHARDS,
          ],
        );
      if (claim.rowCount !== 1) {
        throw new Error(
          "REWARD_ALREADY_CLAIMED",
        );
      }
      await client.query(
        `INSERT INTO battle_reward_profiles (
           player_id,
           banner_shards,
           updated_at
         )
         VALUES ($1, $2, NOW())
         ON CONFLICT (player_id) DO UPDATE
           SET banner_shards =
             battle_reward_profiles.banner_shards +
             EXCLUDED.banner_shards,
             updated_at = NOW()`,
        [player.id, CHEST_SHARDS],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return getBattleRewardDashboard(
    player,
  );
}

export async function unlockBattleBanner(
  player: AuthenticatedPlayer,
  bannerId: BattleBannerId,
): Promise<BattleRewardDashboard> {
  const banner = getBattleBanner(bannerId);
  const database = getPool();

  if (!database) {
    await withLocalLock((value) => {
      const profile = normalizeLocalProfile(value.profiles[player.id]);
      if (profile.unlockedBannerIds.includes(bannerId)) return;
      if (profile.bannerShards < banner.cost) {
        throw new Error("BANNER_SHARDS_MISSING");
      }
      profile.bannerShards -= banner.cost;
      profile.unlockedBannerIds.push(bannerId);
      value.profiles[player.id] = profile;
    });
  } else {
    await databaseReady;
    const client = await database.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO battle_reward_profiles (player_id)
         VALUES ($1)
         ON CONFLICT DO NOTHING`,
        [player.id],
      );
      const result = await client.query<{
        banner_shards: number;
        unlocked_banner_ids: unknown;
      }>(
        `SELECT banner_shards, unlocked_banner_ids
         FROM battle_reward_profiles
         WHERE player_id = $1
         FOR UPDATE`,
        [player.id],
      );
      const stored = result.rows[0];
      const unlocked = normalizeBannerIds(stored?.unlocked_banner_ids);
      if (!unlocked.includes(bannerId)) {
        if ((stored?.banner_shards ?? 0) < banner.cost) {
          throw new Error("BANNER_SHARDS_MISSING");
        }
        await client.query(
          `UPDATE battle_reward_profiles
           SET banner_shards = banner_shards - $2,
               unlocked_banner_ids = $3::jsonb,
               updated_at = NOW()
           WHERE player_id = $1`,
          [player.id, banner.cost, JSON.stringify([...unlocked, bannerId])],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return getBattleRewardDashboard(player);
}

export async function selectBattleBanner(
  player: AuthenticatedPlayer,
  bannerId: BattleBannerId,
): Promise<BattleRewardDashboard> {
  const database = getPool();

  if (!database) {
    await withLocalLock((value) => {
      const profile = normalizeLocalProfile(value.profiles[player.id]);
      if (!profile.unlockedBannerIds.includes(bannerId)) {
        throw new Error("BANNER_LOCKED");
      }
      profile.selectedBannerId = bannerId;
      value.profiles[player.id] = profile;
    });
  } else {
    await databaseReady;
    const result = await database.query<{
      unlocked_banner_ids: unknown;
    }>(
      `SELECT unlocked_banner_ids
       FROM battle_reward_profiles
       WHERE player_id = $1`,
      [player.id],
    );
    const unlocked = normalizeBannerIds(
      result.rows[0]?.unlocked_banner_ids,
    );
    if (!unlocked.includes(bannerId)) throw new Error("BANNER_LOCKED");
    await database.query(
      `UPDATE battle_reward_profiles
       SET selected_banner_id = $2, updated_at = NOW()
       WHERE player_id = $1`,
      [player.id, bannerId],
    );
  }

  return getBattleRewardDashboard(player);
}

async function readRewardState(
  playerId: string,
  date: string,
): Promise<{
  bannerShards: number;
  claimed: boolean;
  unlockedBannerIds: BattleBannerId[];
  selectedBannerId: BattleBannerId;
}> {
  const database = getPool();
  if (!database) {
    const value =
      await readLocalRewards();
    return {
      bannerShards:
        value.profiles[playerId]
          ?.bannerShards ?? 0,
      unlockedBannerIds: normalizeBannerIds(
        value.profiles[playerId]?.unlockedBannerIds,
      ),
      selectedBannerId: normalizeSelectedBanner(
        value.profiles[playerId]?.selectedBannerId,
        value.profiles[playerId]?.unlockedBannerIds,
      ),
      claimed: Boolean(
        value.claims[
          `${playerId}:${date}`
        ],
      ),
    };
  }
  await databaseReady;
  const [profile, claim] =
    await Promise.all([
      database.query<{
        banner_shards: number;
        unlocked_banner_ids: unknown;
        selected_banner_id: string;
      }>(
        `SELECT banner_shards, unlocked_banner_ids, selected_banner_id
         FROM battle_reward_profiles
         WHERE player_id = $1`,
        [playerId],
      ),
      database.query(
        `SELECT 1
         FROM battle_reward_claims
         WHERE player_id = $1
           AND reward_date = $2`,
        [playerId, date],
      ),
    ]);
  return {
    bannerShards:
      profile.rows[0]
        ?.banner_shards ?? 0,
    unlockedBannerIds: normalizeBannerIds(
      profile.rows[0]?.unlocked_banner_ids,
    ),
    selectedBannerId: normalizeSelectedBanner(
      profile.rows[0]?.selected_banner_id,
      profile.rows[0]?.unlocked_banner_ids,
    ),
    claimed:
      (claim.rowCount ?? 0) > 0,
  };
}

function normalizeBannerIds(value: unknown): BattleBannerId[] {
  const values = Array.isArray(value) ? value : [];
  const unlocked = values.filter(
    (id): id is BattleBannerId =>
      typeof id === "string" && getBattleBanner(id).id === id,
  );
  return Array.from(new Set<BattleBannerId>(["royal-blue", ...unlocked]));
}

function normalizeSelectedBanner(
  selected: unknown,
  unlockedValue: unknown,
): BattleBannerId {
  const unlocked = normalizeBannerIds(unlockedValue);
  return typeof selected === "string" &&
    unlocked.includes(selected as BattleBannerId)
    ? (selected as BattleBannerId)
    : "royal-blue";
}

function normalizeLocalProfile(
  profile: LocalBattleRewards["profiles"][string] | undefined,
) {
  const unlockedBannerIds = normalizeBannerIds(profile?.unlockedBannerIds);
  return {
    bannerShards: profile?.bannerShards ?? 0,
    unlockedBannerIds,
    selectedBannerId: normalizeSelectedBanner(
      profile?.selectedBannerId,
      unlockedBannerIds,
    ),
  };
}

async function readLocalRewards(): Promise<LocalBattleRewards> {
  try {
    const parsed = JSON.parse(
      await readFile(
        rewardsFile,
        "utf8",
      ),
    ) as Partial<LocalBattleRewards>;
    return {
      profiles:
        parsed.profiles ?? {},
      claims: parsed.claims ?? {},
    };
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        profiles: {},
        claims: {},
      };
    }
    throw error;
  }
}

function withLocalLock<T>(
  operation: (
    value: LocalBattleRewards,
  ) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(
    async () => {
      const value =
        await readLocalRewards();
      const result =
        await operation(value);
      await mkdir(dataDirectory, {
        recursive: true,
      });
      await writeFile(
        rewardsFile,
        JSON.stringify(
          value,
          null,
          2,
        ),
        "utf8",
      );
      return result;
    },
  );
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
