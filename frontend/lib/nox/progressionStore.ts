import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ensureDatabaseMigrations, getPostgresPool } from "@/lib/database/postgres";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getNoxMemoryEvidence, getNoxMemoryRuntimeStats } from "@/lib/nox/memoryStore";
import { calculateNoxProgression, NOX_RANKS, rankIndex } from "@/lib/nox/progressionRules";
import type { NoxProgressionSnapshot, StoredNoxProgression } from "@/lib/nox/progressionTypes";

type LocalProgressionData = Record<string, StoredNoxProgression>;
const progressionFile = path.join(process.cwd(), ".data", "nox-progression.json");
let localQueue: Promise<unknown> = Promise.resolve();

const initialStored = (): StoredNoxProgression => ({ highestRank: "squire", lastRankChange: null, milestones: [] });

export async function getNoxProgression(player: AuthenticatedPlayer | null): Promise<NoxProgressionSnapshot> {
  const evidence = await getNoxMemoryEvidence(player);
  const stored = player ? await readStored(player.id) : initialStored();
  let snapshot = calculateNoxProgression({
    ...evidence,
    stored,
    persistent: Boolean(player),
    ignoredEvents: getNoxMemoryRuntimeStats().ignored,
  });
  if (!player || rankIndex(snapshot.rank) <= rankIndex(stored.highestRank)) return snapshot;

  const occurredAt = new Date().toISOString();
  const nextStored: StoredNoxProgression = {
    highestRank: snapshot.rank,
    lastRankChange: occurredAt,
    milestones: [
      {
        id: `NOX_REACHED_${snapshot.rank.toUpperCase().replaceAll("-", "_")}`,
        rank: snapshot.rank,
        label: `Nox est devenu ${NOX_RANKS[snapshot.rank].label}.`,
        occurredAt,
      },
      ...stored.milestones,
    ].slice(0, 12),
  };
  await writeStored(player.id, nextStored);
  snapshot = calculateNoxProgression({ ...evidence, stored: nextStored, persistent: true });
  return { ...snapshot, recentlyEvolved: true };
}

async function readStored(playerId: string): Promise<StoredNoxProgression> {
  const database = getPostgresPool();
  if (!database) return (await readLocal())[playerId] ?? initialStored();
  await ensureDatabaseMigrations(database);
  const result = await database.query<{
    highest_rank: StoredNoxProgression["highestRank"];
    last_rank_change: Date | null;
    milestones: StoredNoxProgression["milestones"];
  }>("SELECT highest_rank, last_rank_change, milestones FROM nox_progression WHERE user_id = $1 LIMIT 1", [playerId]);
  const row = result.rows[0];
  return row ? {
    highestRank: row.highest_rank,
    lastRankChange: row.last_rank_change?.toISOString() ?? null,
    milestones: row.milestones ?? [],
  } : initialStored();
}

async function writeStored(playerId: string, progression: StoredNoxProgression): Promise<void> {
  const database = getPostgresPool();
  if (!database) {
    const run = localQueue.then(async () => {
      const data = await readLocal();
      data[playerId] = progression;
      await mkdir(path.dirname(progressionFile), { recursive: true });
      await writeFile(progressionFile, JSON.stringify(data, null, 2), "utf8");
    });
    localQueue = run.then(() => undefined, () => undefined);
    await run;
    return;
  }
  await ensureDatabaseMigrations(database);
  await database.query(
    `INSERT INTO nox_progression (user_id, highest_rank, last_rank_change, milestones, updated_at)
     VALUES ($1, $2, $3::timestamptz, $4::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET highest_rank = EXCLUDED.highest_rank,
       last_rank_change = EXCLUDED.last_rank_change, milestones = EXCLUDED.milestones, updated_at = NOW()`,
    [playerId, progression.highestRank, progression.lastRankChange, JSON.stringify(progression.milestones)],
  );
}

async function readLocal(): Promise<LocalProgressionData> {
  try {
    return JSON.parse(await readFile(progressionFile, "utf8")) as LocalProgressionData;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return {};
    throw error;
  }
}
