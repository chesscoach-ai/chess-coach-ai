import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { ensureDatabaseMigrations, getPostgresPool } from "@/lib/database/postgres";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { applyLearningEvent, createNoxMemoryProfile, summarizeNoxMemory } from "@/lib/nox/memoryRules";
import type {
  LearningEvent,
  NoxMemoryEnvelope,
  NoxMemoryProfile,
} from "@/lib/nox/memoryTypes";

type LocalMemoryData = {
  profiles: Record<string, NoxMemoryProfile>;
  events: Record<string, LearningEvent>;
};

export type NoxMemoryEvidence = {
  profile: NoxMemoryProfile;
  events: LearningEvent[];
};

const runtimeDeduplication = { counted: 0, ignored: 0 };

export type NoxMemoryDiagnostics = {
  profiles: number;
  learningEvents: number;
  conceptsTracked: number;
  strengths: number;
  weaknesses: number;
  milestones: number;
  persistence: "postgresql" | "local-json";
};

const memoryFile = path.join(process.cwd(), ".data", "nox-memory.json");
let localQueue: Promise<unknown> = Promise.resolve();

function envelope(profile: NoxMemoryProfile, persistent: boolean): NoxMemoryEnvelope {
  return { profile, summary: summarizeNoxMemory(profile), persistent };
}

async function readLocal(): Promise<LocalMemoryData> {
  try {
    const parsed = JSON.parse(await readFile(memoryFile, "utf8")) as Partial<LocalMemoryData>;
    return {
      profiles: parsed.profiles ?? {},
      events: parsed.events ?? {},
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { profiles: {}, events: {} };
    }
    throw error;
  }
}

async function writeLocal(data: LocalMemoryData): Promise<void> {
  await mkdir(path.dirname(memoryFile), { recursive: true });
  await writeFile(memoryFile, JSON.stringify(data, null, 2), "utf8");
}

function withLocalLock<T>(operation: (data: LocalMemoryData) => Promise<T> | T): Promise<T> {
  const run = localQueue.then(async () => {
    const data = await readLocal();
    const result = await operation(data);
    await writeLocal(data);
    return result;
  });
  localQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function getNoxMemory(
  player: AuthenticatedPlayer | null,
): Promise<NoxMemoryEnvelope> {
  if (!player) return envelope(createNoxMemoryProfile(), false);
  const database = getPostgresPool();
  if (!database) {
    const profile = (await readLocal()).profiles[player.id] ?? createNoxMemoryProfile();
    return envelope(profile, true);
  }
  await ensureDatabaseMigrations(database);
  const result = await database.query<{ profile: NoxMemoryProfile }>(
    "SELECT profile FROM nox_profiles WHERE user_id = $1 LIMIT 1",
    [player.id],
  );
  return envelope(result.rows[0]?.profile ?? createNoxMemoryProfile(), true);
}

export async function getNoxMemoryEvidence(
  player: AuthenticatedPlayer | null,
): Promise<NoxMemoryEvidence> {
  if (!player) return { profile: createNoxMemoryProfile(), events: [] };
  const database = getPostgresPool();
  if (!database) {
    const data = await readLocal();
    return {
      profile: data.profiles[player.id] ?? createNoxMemoryProfile(),
      events: Object.entries(data.events)
        .filter(([key]) => key.startsWith(`${player.id}:`))
        .map(([, event]) => event),
    };
  }
  await ensureDatabaseMigrations(database);
  const [profileResult, eventsResult] = await Promise.all([
    database.query<{ profile: NoxMemoryProfile }>("SELECT profile FROM nox_profiles WHERE user_id = $1 LIMIT 1", [player.id]),
    database.query<LearningEvent & { occurredat: Date }>(
      `SELECT id, event_type AS type, concept_id AS "conceptId", outcome,
              source_id AS "sourceId", occurred_at AS "occurredAt"
       FROM nox_learning_events WHERE user_id = $1 ORDER BY occurred_at ASC`,
      [player.id],
    ),
  ]);
  return {
    profile: profileResult.rows[0]?.profile ?? createNoxMemoryProfile(),
    events: eventsResult.rows.map((event) => ({ ...event, occurredAt: new Date(event.occurredAt).toISOString() })),
  };
}

export function getNoxMemoryRuntimeStats() {
  return { ...runtimeDeduplication };
}

export async function recordNoxLearningEvents(
  player: AuthenticatedPlayer,
  events: LearningEvent[],
): Promise<NoxMemoryEnvelope> {
  const database = getPostgresPool();
  if (!database) {
    return withLocalLock((data) => {
      let profile = data.profiles[player.id] ?? createNoxMemoryProfile();
      for (const event of events) {
        const key = `${player.id}:${event.sourceId}`;
        if (data.events[key]) {
          runtimeDeduplication.ignored += 1;
          continue;
        }
        data.events[key] = event;
        runtimeDeduplication.counted += 1;
        profile = applyLearningEvent(profile, event);
      }
      data.profiles[player.id] = profile;
      return envelope(profile, true);
    });
  }

  await ensureDatabaseMigrations(database);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [player.id]);
    const stored = await client.query<{ profile: NoxMemoryProfile }>(
      "SELECT profile FROM nox_profiles WHERE user_id = $1 FOR UPDATE",
      [player.id],
    );
    let profile = stored.rows[0]?.profile ?? createNoxMemoryProfile();
    for (const event of events) {
      const inserted = await client.query(
        `INSERT INTO nox_learning_events
           (id, user_id, event_type, concept_id, outcome, source_id, occurred_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
         ON CONFLICT (user_id, source_id) DO NOTHING
         RETURNING id`,
        [event.id, player.id, event.type, event.conceptId, event.outcome, event.sourceId, event.occurredAt],
      );
      if (inserted.rowCount === 1) {
        runtimeDeduplication.counted += 1;
        profile = applyLearningEvent(profile, event);
      } else {
        runtimeDeduplication.ignored += 1;
      }
    }
    await client.query(
      `INSERT INTO nox_profiles (user_id, profile, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET profile = EXCLUDED.profile, updated_at = NOW()`,
      [player.id, JSON.stringify(profile)],
    );
    await client.query("COMMIT");
    return envelope(profile, true);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetNoxMemory(player: AuthenticatedPlayer): Promise<NoxMemoryEnvelope> {
  const database = getPostgresPool();
  if (!database) {
    return withLocalLock((data) => {
      delete data.profiles[player.id];
      for (const key of Object.keys(data.events)) {
        if (key.startsWith(`${player.id}:`)) delete data.events[key];
      }
      return envelope(createNoxMemoryProfile(), true);
    });
  }
  await ensureDatabaseMigrations(database);
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM nox_learning_events WHERE user_id = $1", [player.id]);
    await client.query("DELETE FROM nox_profiles WHERE user_id = $1", [player.id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return envelope(createNoxMemoryProfile(), true);
}

export async function getNoxMemoryDiagnostics(): Promise<NoxMemoryDiagnostics> {
  const database = getPostgresPool();
  if (!database) return diagnosticsFromLocal(await readLocal());
  await ensureDatabaseMigrations(database);
  const result = await database.query<{
    profiles: number;
    events: number;
    concepts: number;
    strengths: number;
    weaknesses: number;
    milestones: number;
  }>(`
    SELECT
      COUNT(*)::int AS profiles,
      COALESCE((SELECT COUNT(*) FROM nox_learning_events), 0)::int AS events,
      COALESCE(SUM(jsonb_object_length(profile->'mastery')), 0)::int AS concepts,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_each(profile->'mastery') item WHERE item.value->>'status' = 'mastered')), 0)::int AS strengths,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_each(profile->'mastery') item WHERE item.value->>'status' = 'weakness')), 0)::int AS weaknesses,
      COALESCE(SUM(jsonb_array_length(profile->'milestones')), 0)::int AS milestones
    FROM nox_profiles
  `);
  const row = result.rows[0];
  return {
    profiles: row?.profiles ?? 0,
    learningEvents: row?.events ?? 0,
    conceptsTracked: row?.concepts ?? 0,
    strengths: row?.strengths ?? 0,
    weaknesses: row?.weaknesses ?? 0,
    milestones: row?.milestones ?? 0,
    persistence: "postgresql",
  };
}

function diagnosticsFromLocal(data: LocalMemoryData): NoxMemoryDiagnostics {
  const profiles = Object.values(data.profiles);
  const mastery = profiles.flatMap((profile) => Object.values(profile.mastery));
  return {
    profiles: profiles.length,
    learningEvents: Object.keys(data.events).length,
    conceptsTracked: mastery.length,
    strengths: mastery.filter((item) => item?.status === "mastered").length,
    weaknesses: mastery.filter((item) => item?.status === "weakness").length,
    milestones: profiles.reduce((sum, profile) => sum + profile.milestones.length, 0),
    persistence: "local-json",
  };
}
