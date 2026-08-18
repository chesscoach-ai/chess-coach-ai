import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDatabaseMigrations, getPostgresPool } from "@/lib/database/postgres";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { buildNoxMission } from "@/lib/nox/missionRules";
import type { NoxMission } from "@/lib/nox/missionTypes";
import { getNoxMemoryEvidence, recordNoxLearningEvents } from "@/lib/nox/memoryStore";
import type { LearningEvent, NoxConceptId } from "@/lib/nox/memoryTypes";

type LocalData = Record<string, NoxMission[]>;
const missionFile = path.join(process.cwd(), ".data", "nox-missions.json");
let localQueue: Promise<unknown> = Promise.resolve();
const missionRuntime = { eventsProduced: 0, eventsIgnored: 0 };

export async function getActiveNoxMission(player: AuthenticatedPlayer | null, options: { forcedConcept?: NoxConceptId; date?: Date } = {}): Promise<NoxMission> {
  const evidence = await getNoxMemoryEvidence(player);
  const stored = player ? await listMissions(player.id) : [];
  const active = stored.find((mission) => mission.status !== "completed");
  if (active && !options.forcedConcept) return active;
  const latestCompleted = stored.find((mission) => mission.status === "completed");
  if (latestCompleted && !options.forcedConcept && new Date(latestCompleted.nextEligibleAt).getTime() > (options.date ?? new Date()).getTime()) return latestCompleted;
  const mission = buildNoxMission({
    ...evidence,
    date: options.date,
    recentConcepts: stored.filter((item) => item.status === "completed").slice(0, 3).map((item) => item.conceptId),
    forcedConcept: options.forcedConcept,
    persistent: Boolean(player),
  });
  if (player) await saveMission(player.id, mission);
  return mission;
}

export async function startNoxMission(player: AuthenticatedPlayer, missionId: string): Promise<NoxMission> {
  return updateMission(player.id, missionId, (mission) => mission.status === "offered" ? { ...mission, status: "started", startedAt: new Date().toISOString() } : mission);
}

export async function recordNoxMissionResult(player: AuthenticatedPlayer, input: { missionId: string; exerciseId: string; success: boolean; mistakes: number; hintsUsed: number }): Promise<NoxMission> {
  let added = false;
  const updated = await updateMission(player.id, input.missionId, (mission) => {
    if (mission.status === "completed" || mission.results.some((item) => item.exerciseId === input.exerciseId) || !mission.exerciseIds.includes(input.exerciseId)) { missionRuntime.eventsIgnored += 1; return mission; }
    added = true;
    const results = [...mission.results, { ...input, completedAt: new Date().toISOString() }];
    const completed = results.length >= mission.exerciseIds.length;
    return { ...mission, results, currentStep: Math.min(results.length, mission.exerciseIds.length), status: completed ? "completed" : "started", startedAt: mission.startedAt ?? new Date().toISOString(), completedAt: completed ? new Date().toISOString() : null };
  });
  if (added) {
    const events: LearningEvent[] = [{
      id: randomUUID(), type: input.success ? "exercise_success" as const : "exercise_failure" as const,
      conceptId: updated.conceptId, outcome: input.success ? "success" as const : "failure" as const,
      occurredAt: new Date().toISOString(), sourceId: `mission:${updated.id}:exercise:${input.exerciseId}`,
    }];
    if (updated.status === "completed") events.push({ id: randomUUID(), type: "mission_completed", conceptId: updated.conceptId, outcome: updated.results.filter((item) => item.success).length >= Math.ceil(updated.exerciseIds.length / 2) ? "success" : "neutral", occurredAt: new Date().toISOString(), sourceId: `mission:${updated.id}:completed` });
    await recordNoxLearningEvents(player, events);
    missionRuntime.eventsProduced += events.length;
  }
  return updated;
}

export async function getNoxMissionDiagnostics(player: AuthenticatedPlayer | null) {
  const mission = player ? (await listMissions(player.id))[0] : null;
  const storedEvents = mission ? mission.results.length + (mission.status === "completed" ? 1 : 0) : 0;
  return mission
    ? { active: mission.id, concept: mission.conceptId, reason: mission.reasonCode, difficulty: mission.difficulty, exercises: mission.exerciseIds.length, progress: `${mission.currentStep}/${mission.exerciseIds.length}`, status: mission.status, eventsProduced: storedEvents + missionRuntime.eventsProduced, eventsIgnored: missionRuntime.eventsIgnored, nextEligibility: mission.nextEligibleAt }
    : { active: "aucune", concept: "—", reason: "—", difficulty: "—", exercises: 0, progress: "0/0", status: "absente", eventsProduced: missionRuntime.eventsProduced, eventsIgnored: missionRuntime.eventsIgnored, nextEligibility: "—" };
}

async function updateMission(playerId: string, id: string, transform: (mission: NoxMission) => NoxMission): Promise<NoxMission> {
  const missions = await listMissions(playerId);
  const current = missions.find((mission) => mission.id === id);
  if (!current) throw new Error("MISSION_NOT_FOUND");
  const next = transform(current);
  await saveMission(playerId, next);
  return next;
}

async function listMissions(playerId: string): Promise<NoxMission[]> {
  const database = getPostgresPool();
  if (!database) return (await readLocal())[playerId] ?? [];
  await ensureDatabaseMigrations(database);
  const result = await database.query<{ mission: NoxMission }>("SELECT mission FROM nox_missions WHERE user_id = $1 ORDER BY updated_at DESC", [playerId]);
  return result.rows.map((row) => row.mission);
}

async function saveMission(playerId: string, mission: NoxMission): Promise<void> {
  const database = getPostgresPool();
  if (!database) {
    const run = localQueue.then(async () => { const data = await readLocal(); const missions = data[playerId] ?? []; data[playerId] = [mission, ...missions.filter((item) => item.id !== mission.id)].slice(0, 12); await mkdir(path.dirname(missionFile), { recursive: true }); await writeFile(missionFile, JSON.stringify(data, null, 2), "utf8"); });
    localQueue = run.then(() => undefined, () => undefined); await run; return;
  }
  await ensureDatabaseMigrations(database);
  await database.query(`INSERT INTO nox_missions (id, user_id, mission, updated_at) VALUES ($1,$2,$3::jsonb,NOW()) ON CONFLICT (user_id, id) DO UPDATE SET mission=EXCLUDED.mission, updated_at=NOW()`, [mission.id, playerId, JSON.stringify(mission)]);
}

async function readLocal(): Promise<LocalData> { try { return JSON.parse(await readFile(missionFile, "utf8")) as LocalData; } catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return {}; throw error; } }
