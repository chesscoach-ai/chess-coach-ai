import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import {
  buildLearningProfile,
  inferLearningTheme,
} from "@/lib/learning/profileRules";
import type {
  LearningProfile,
  LearningSessionInput,
  LearningTheme,
  StoredLearningProfile,
} from "@/lib/learning/types";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { getOnlinePlayerRating } from "@/lib/multiplayer/gameStore";
import type { MoveClassification } from "@/services/api/ApiService";

const dataDirectory = path.join(process.cwd(), ".data");
const profilesFile = path.join(dataDirectory, "learning-profiles.json");
let pool: Pool | null = null;
let databaseReady: Promise<void> | null = null;
let localQueue: Promise<unknown> = Promise.resolve();

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
      CREATE TABLE IF NOT EXISTS learning_profiles (
        user_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined);
  return pool;
}

async function readLocalProfiles(): Promise<
  Record<string, StoredLearningProfile>
> {
  try {
    const contents = await readFile(profilesFile, "utf8");
    const parsed: unknown = JSON.parse(contents);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, StoredLearningProfile>)
      : {};
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeLocalProfiles(
  profiles: Record<string, StoredLearningProfile>,
): Promise<void> {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(profilesFile, JSON.stringify(profiles, null, 2), "utf8");
}

function withLocalLock<T>(
  operation: (
    profiles: Record<string, StoredLearningProfile>,
  ) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(async () => {
    const profiles = await readLocalProfiles();
    const result = await operation(profiles);
    await writeLocalProfiles(profiles);
    return result;
  });
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function emptyProfile(userId: string): StoredLearningProfile {
  const classifications: Record<MoveClassification, number> = {
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  const themes = Object.fromEntries(
    (
      [
        "opening",
        "tactics",
        "material",
        "calculation",
        "positional",
        "endgame",
      ] satisfies LearningTheme[]
    ).map((theme) => [
      theme,
      { occurrences: 0, severeErrors: 0, totalLoss: 0 },
    ]),
  ) as StoredLearningProfile["themes"];
  return {
    userId,
    sessionsCount: 0,
    analyzedMoves: 0,
    totalEvaluationLoss: 0,
    classifications,
    themes,
    fingerprints: [],
    updatedAt: new Date().toISOString(),
  };
}

function mergeSession(
  current: StoredLearningProfile,
  session: LearningSessionInput,
): StoredLearningProfile {
  const fingerprint = createHash("sha256")
    .update(session.moves.join(" "))
    .digest("hex");
  if (current.fingerprints.includes(fingerprint)) return current;

  const next = structuredClone(current);
  next.sessionsCount += 1;
  next.analyzedMoves += session.reviews.length;
  next.fingerprints = [...next.fingerprints.slice(-99), fingerprint];
  next.updatedAt = new Date().toISOString();

  for (const review of session.reviews) {
    next.classifications[review.classification] += 1;
    next.totalEvaluationLoss += Math.max(0, review.evaluationLoss);
    if (
      review.classification !== "inaccuracy" &&
      review.classification !== "mistake" &&
      review.classification !== "blunder"
    ) {
      continue;
    }
    const theme = inferLearningTheme(review, session.moves.length);
    const aggregate = next.themes[theme];
    aggregate.occurrences += 1;
    aggregate.totalLoss += Math.max(0, review.evaluationLoss);
    if (
      review.classification === "mistake" ||
      review.classification === "blunder"
    ) {
      aggregate.severeErrors += 1;
    }
  }
  return next;
}

async function readStoredProfile(
  userId: string,
): Promise<StoredLearningProfile | null> {
  const database = getPool();
  if (!database) {
    return (await readLocalProfiles())[userId] ?? null;
  }
  await databaseReady;
  const result = await database.query<{ data: StoredLearningProfile }>(
    `SELECT data FROM learning_profiles WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0]?.data ?? null;
}

export async function getLearningProfile(
  player: AuthenticatedPlayer,
): Promise<LearningProfile> {
  const [stored, rating] = await Promise.all([
    readStoredProfile(player.id),
    getOnlinePlayerRating(player.id),
  ]);
  return buildLearningProfile({
    playerName: player.name,
    rating,
    stored,
  });
}

export async function recordLearningSession(
  player: AuthenticatedPlayer,
  session: LearningSessionInput,
): Promise<LearningProfile> {
  const database = getPool();
  if (!database) {
    await withLocalLock((profiles) => {
      profiles[player.id] = mergeSession(
        profiles[player.id] ?? emptyProfile(player.id),
        session,
      );
    });
    return getLearningProfile(player);
  }

  await databaseReady;
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ data: StoredLearningProfile }>(
      `SELECT data
       FROM learning_profiles
       WHERE user_id = $1
       FOR UPDATE`,
      [player.id],
    );
    const merged = mergeSession(
      result.rows[0]?.data ?? emptyProfile(player.id),
      session,
    );
    await client.query(
      `INSERT INTO learning_profiles (user_id, data, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET data = EXCLUDED.data, updated_at = NOW()`,
      [player.id, JSON.stringify(merged)],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getLearningProfile(player);
}
