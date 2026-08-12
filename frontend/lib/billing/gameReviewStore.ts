import "server-only";

import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";
import {
  ensureDatabaseMigrations,
  getPostgresPool,
} from "@/lib/database/postgres";

const FREE_REVIEW_LIMIT = 3;
const dataDirectory = path.join(
  process.cwd(),
  ".data",
);
const reviewFile = path.join(
  dataDirectory,
  "game-reviews.json",
);

type ReviewUsage = Record<
  string,
  {
    gameIds: string[];
    updatedAt: string;
  }
>;

export type GameReviewAllowance = {
  freeLimit: number;
  freeUsed: number;
  freeRemaining: number;
  unlockedGameIds: string[];
  hasUnlimitedAccess: boolean;
};

let pool: Pool | null = null;
let databaseReady:
  | Promise<void>
  | null = null;
let localQueue: Promise<unknown> =
  Promise.resolve();

function getPool(): Pool | null {
  pool ??= getPostgresPool();
  if (!pool) return null;
  databaseReady ??= ensureDatabaseMigrations(pool);

  return pool;
}

async function readLocalUsage(): Promise<ReviewUsage> {
  try {
    const content = await readFile(
      reviewFile,
      "utf8",
    );
    const parsed: unknown =
      JSON.parse(content);
    return parsed &&
      typeof parsed === "object"
      ? (parsed as ReviewUsage)
      : {};
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
}

async function writeLocalUsage(
  usage: ReviewUsage,
): Promise<void> {
  await mkdir(dataDirectory, {
    recursive: true,
  });
  await writeFile(
    reviewFile,
    JSON.stringify(usage, null, 2),
    "utf8",
  );
}

async function getUnlockedGameIds(
  userId: string,
): Promise<string[]> {
  const database = getPool();

  if (!database) {
    const usage =
      await readLocalUsage();
    return usage[userId]?.gameIds ?? [];
  }

  await databaseReady;
  const result = await database.query<{
    game_ids: string[];
  }>(
    `SELECT game_ids
     FROM game_review_usage
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0]?.game_ids ?? [];
}

export async function getGameReviewAllowance(
  userId: string,
  hasUnlimitedAccess: boolean,
): Promise<GameReviewAllowance> {
  const gameIds =
    await getUnlockedGameIds(userId);

  return {
    freeLimit: FREE_REVIEW_LIMIT,
    freeUsed: gameIds.length,
    freeRemaining: Math.max(
      0,
      FREE_REVIEW_LIMIT -
        gameIds.length,
    ),
    unlockedGameIds: gameIds,
    hasUnlimitedAccess,
  };
}

export async function canAccessGameReview(
  userId: string,
  gameId: string,
  hasUnlimitedAccess: boolean,
): Promise<boolean> {
  if (hasUnlimitedAccess) {
    return true;
  }

  return (
    await getUnlockedGameIds(userId)
  ).includes(gameId);
}

export async function unlockGameReview(
  userId: string,
  gameId: string,
  hasUnlimitedAccess: boolean,
): Promise<GameReviewAllowance> {
  if (hasUnlimitedAccess) {
    return getGameReviewAllowance(
      userId,
      true,
    );
  }

  const database = getPool();

  if (!database) {
    const run = localQueue.then(
      async () => {
        const usage =
          await readLocalUsage();
        const current =
          usage[userId]?.gameIds ?? [];

        if (!current.includes(gameId)) {
          if (
            current.length >=
            FREE_REVIEW_LIMIT
          ) {
            throw new Error(
              "REVIEW_LIMIT_REACHED",
            );
          }
          usage[userId] = {
            gameIds: [
              ...current,
              gameId,
            ],
            updatedAt:
              new Date().toISOString(),
          };
          await writeLocalUsage(usage);
        }

        return getGameReviewAllowance(
          userId,
          false,
        );
      },
    );

    localQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  await databaseReady;
  const client =
    await database.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query<{
      game_ids: string[];
    }>(
      `SELECT game_ids
       FROM game_review_usage
       WHERE user_id = $1
       FOR UPDATE`,
      [userId],
    );
    const current =
      result.rows[0]?.game_ids ?? [];

    if (!current.includes(gameId)) {
      if (
        current.length >=
        FREE_REVIEW_LIMIT
      ) {
        throw new Error(
          "REVIEW_LIMIT_REACHED",
        );
      }

      const next = [...current, gameId];
      await client.query(
        `INSERT INTO game_review_usage (
           user_id, game_ids, updated_at
         )
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           game_ids = EXCLUDED.game_ids,
           updated_at = NOW()`,
        [userId, JSON.stringify(next)],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getGameReviewAllowance(
    userId,
    false,
  );
}
