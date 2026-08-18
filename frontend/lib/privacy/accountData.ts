import "server-only";

import { createHash } from "node:crypto";
import { Pool, type PoolClient } from "pg";

import { deleteUserByEmail } from "@/lib/auth/userStore";

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return pool;
}

async function optionalRows(
  database: Pool,
  query: string,
  values: unknown[],
): Promise<unknown[]> {
  try {
    const result = await database.query<{
      record: unknown;
    }>(query, values);
    return result.rows.map((row) => row.record);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "42P01"
    ) {
      return [];
    }
    throw error;
  }
}

export async function exportAccountData(
  playerId: string,
  playerName: string,
) {
  const database = getPool();
  if (!database) {
    return {
      exportedAt: new Date().toISOString(),
      account: {
        email: playerId,
        name: playerName,
      },
      notice:
        "Export local limité : la base PostgreSQL n’est pas configurée.",
    };
  }

  const [
    account,
    subscription,
    player,
    games,
    learning,
    placement,
    progression,
    exercises,
    rewards,
    noxMemory,
    noxLearningEvents,
    noxProgression,
  ] = await Promise.all([
    optionalRows(
      database,
      `SELECT jsonb_build_object(
         'name', name, 'email', email, 'createdAt', created_at
       ) AS record FROM users WHERE email = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT to_jsonb(t) - 'customer_id' - 'subscription_id' AS record
       FROM billing_subscriptions t WHERE user_id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT to_jsonb(t) AS record
       FROM multiplayer_players t WHERE id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT data AS record FROM multiplayer_games
       WHERE data->>'whiteId' = $1 OR data->>'blackId' = $1
       ORDER BY created_at DESC`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT data AS record FROM learning_profiles WHERE user_id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT result AS record FROM learning_placements WHERE player_id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT to_jsonb(t) AS record FROM progression_profiles t
       WHERE player_id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT to_jsonb(t) AS record FROM progression_exercise_events t
       WHERE player_id = $1 ORDER BY completed_on DESC`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT to_jsonb(t) AS record FROM battle_reward_profiles t
       WHERE player_id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT profile AS record FROM nox_profiles WHERE user_id = $1`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT jsonb_build_object(
         'type', event_type,
         'conceptId', concept_id,
         'outcome', outcome,
         'occurredAt', occurred_at
       ) AS record
       FROM nox_learning_events
       WHERE user_id = $1
       ORDER BY occurred_at DESC`,
      [playerId],
    ),
    optionalRows(
      database,
      `SELECT to_jsonb(t) AS record FROM nox_progression t WHERE user_id = $1`,
      [playerId],
    ),
  ]);

  const scrubbedGames = games.map((record) => {
    if (!record || typeof record !== "object") return record;
    const game = { ...record } as Record<string, unknown>;
    if (game.whiteId !== playerId) delete game.whiteId;
    if (game.blackId !== playerId) delete game.blackId;
    return game;
  });

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    account: account[0] ?? {
      email: playerId,
      name: playerName,
    },
    subscription: subscription[0] ?? null,
    multiplayerProfile: player[0] ?? null,
    games: scrubbedGames,
    learningProfile: learning[0] ?? null,
    placement: placement[0] ?? null,
    progression: progression[0] ?? null,
    exerciseEvents: exercises,
    rewards: rewards[0] ?? null,
    noxMemory: noxMemory[0] ?? null,
    noxLearningEvents,
    noxProgression: noxProgression[0] ?? null,
  };
}

async function optionalMutation(
  client: PoolClient,
  query: string,
  values: unknown[],
): Promise<void> {
  try {
    await client.query(query, values);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "42P01"
    ) {
      return;
    }
    throw error;
  }
}

export async function deleteAccountData(
  playerId: string,
  deletedSubscriptionId: string | null = null,
): Promise<void> {
  const database = getPool();
  if (!database) {
    await deleteUserByEmail(playerId);
    return;
  }
  const client = await database.connect();
  const anonymousId = `deleted:${createHash("sha256")
    .update(playerId)
    .digest("hex")
    .slice(0, 20)}`;
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_deletion_tombstones (
        subscription_hash TEXT PRIMARY KEY,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    if (deletedSubscriptionId) {
      await client.query(
        `INSERT INTO account_deletion_tombstones (subscription_hash)
         VALUES ($1)
         ON CONFLICT (subscription_hash) DO NOTHING`,
        [hashIdentifier(deletedSubscriptionId)],
      );
    }
    await optionalMutation(
      client,
      `UPDATE multiplayer_games
       SET data = jsonb_set(
         jsonb_set(data, '{whiteId}', to_jsonb($2::text)),
         '{whiteName}', to_jsonb('Compte supprimé'::text)
       )
       WHERE data->>'whiteId' = $1`,
      [playerId, anonymousId],
    );
    await optionalMutation(
      client,
      `UPDATE multiplayer_games
       SET data = jsonb_set(
         jsonb_set(data, '{blackId}', to_jsonb($2::text)),
         '{blackName}', to_jsonb('Compte supprimé'::text)
       )
       WHERE data->>'blackId' = $1`,
      [playerId, anonymousId],
    );

    const mutations = [
      "UPDATE community_clans SET owner_id = $2 WHERE owner_id = $1",
      "DELETE FROM push_subscriptions WHERE player_id = $1",
      "DELETE FROM native_push_tokens WHERE player_id = $1",
      "DELETE FROM progression_exercise_events WHERE player_id = $1",
      "DELETE FROM progression_profiles WHERE player_id = $1",
      "DELETE FROM battle_reward_claims WHERE player_id = $1",
      "DELETE FROM battle_reward_profiles WHERE player_id = $1",
      "DELETE FROM learning_placements WHERE player_id = $1",
      "DELETE FROM learning_profiles WHERE user_id = $1",
      "DELETE FROM nox_learning_events WHERE user_id = $1",
      "DELETE FROM nox_profiles WHERE user_id = $1",
      "DELETE FROM nox_progression WHERE user_id = $1",
      "DELETE FROM game_review_usage WHERE user_id = $1",
      "DELETE FROM community_friendships WHERE player_a = $1 OR player_b = $1",
      "DELETE FROM community_clan_members WHERE player_id = $1",
      "DELETE FROM community_profiles WHERE player_id = $1",
      "DELETE FROM multiplayer_players WHERE id = $1",
      "DELETE FROM billing_subscriptions WHERE user_id = $1",
      "DELETE FROM users WHERE email = $1",
    ];
    for (const query of mutations) {
      await optionalMutation(
        client,
        query,
        query.startsWith("UPDATE community_clans")
          ? [playerId, anonymousId]
          : [playerId],
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

function hashIdentifier(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export async function isDeletedSubscription(
  subscriptionId: string,
): Promise<boolean> {
  const database = getPool();
  if (!database) return false;
  try {
    const result = await database.query(
      `SELECT 1 FROM account_deletion_tombstones
       WHERE subscription_hash = $1 LIMIT 1`,
      [hashIdentifier(subscriptionId)],
    );
    return result.rowCount === 1;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "42P01"
    ) {
      return false;
    }
    throw error;
  }
}
