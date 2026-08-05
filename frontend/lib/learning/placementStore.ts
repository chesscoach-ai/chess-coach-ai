import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import type { PlacementResult } from "@/lib/learning/placement";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";

const dataDirectory = path.join(process.cwd(), ".data");
const placementFile = path.join(dataDirectory, "learning-placement.json");
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
      CREATE TABLE IF NOT EXISTS learning_placements (
        player_id TEXT PRIMARY KEY,
        result JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined);
  return pool;
}

async function readLocalPlacements(): Promise<Record<string, PlacementResult>> {
  try {
    const parsed = JSON.parse(
      await readFile(placementFile, "utf8"),
    ) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, PlacementResult>)
      : {};
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function getPlacementResult(
  playerId: string,
): Promise<PlacementResult | null> {
  const database = getPool();
  if (!database) return (await readLocalPlacements())[playerId] ?? null;
  await databaseReady;
  const result = await database.query<{ result: PlacementResult }>(
    `SELECT result
     FROM learning_placements
     WHERE player_id = $1
     LIMIT 1`,
    [playerId],
  );
  return result.rows[0]?.result ?? null;
}

export async function savePlacementResult(
  player: AuthenticatedPlayer,
  result: PlacementResult,
): Promise<PlacementResult> {
  const database = getPool();
  if (!database) {
    const run = localQueue.then(async () => {
      const placements = await readLocalPlacements();
      placements[player.id] = result;
      await mkdir(dataDirectory, { recursive: true });
      await writeFile(placementFile, JSON.stringify(placements, null, 2), "utf8");
    });
    localQueue = run.then(
      () => undefined,
      () => undefined,
    );
    await run;
    return result;
  }

  await databaseReady;
  await database.query(
    `INSERT INTO learning_placements (player_id, result, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (player_id) DO UPDATE
       SET result = EXCLUDED.result, updated_at = NOW()`,
    [player.id, JSON.stringify(result)],
  );
  return result;
}
