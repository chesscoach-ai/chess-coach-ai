import "server-only";

import { Pool } from "pg";

export type NativePushPlatform = "ios" | "android";

let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;
const memoryTokens = new Map<string, { playerId: string; platform: NativePushPlatform }>();

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
      CREATE TABLE IF NOT EXISTS native_push_tokens (
        token TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined);
  return pool;
}

export async function saveNativePushToken(
  playerId: string,
  token: string,
  platform: NativePushPlatform,
): Promise<void> {
  const database = getPool();
  if (!database) {
    memoryTokens.set(token, { playerId, platform });
    return;
  }
  await databaseReady;
  await database.query(
    `INSERT INTO native_push_tokens (token, player_id, platform, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (token) DO UPDATE SET
       player_id = EXCLUDED.player_id,
       platform = EXCLUDED.platform,
       updated_at = NOW()`,
    [token, playerId, platform],
  );
}

export async function removeNativePushTokens(playerId: string): Promise<void> {
  const database = getPool();
  if (!database) {
    for (const [token, record] of memoryTokens) {
      if (record.playerId === playerId) memoryTokens.delete(token);
    }
    return;
  }
  await databaseReady;
  await database.query("DELETE FROM native_push_tokens WHERE player_id = $1", [playerId]);
}
