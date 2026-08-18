import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { LearningEvent } from "@/lib/nox/memoryTypes";
vi.mock("server-only", () => ({}));

describe("boucle complète des missions Nox", () => {
  const cwd = process.cwd(); let temp = "";
  const player = { id: "mission@example.test", name: "Mission" };
  let memoryStore: typeof import("@/lib/nox/memoryStore");
  let missionStore: typeof import("@/lib/nox/missionStore");
  let progressionStore: typeof import("@/lib/nox/progressionStore");
  beforeAll(async () => { temp = await mkdtemp(path.join(os.tmpdir(), "knightly-mission-")); process.chdir(temp); delete process.env.DATABASE_URL; vi.resetModules(); memoryStore = await import("@/lib/nox/memoryStore"); missionStore = await import("@/lib/nox/missionStore"); progressionStore = await import("@/lib/nox/progressionStore"); });
  afterAll(async () => { process.chdir(cwd); await rm(temp, { recursive: true, force: true }); });

  it("relie faiblesse, mission, exercices, mémoire et progression sans doublon", async () => {
    const failures: LearningEvent[] = Array.from({ length: 3 }, (_, index) => ({ id: `f${index}`, sourceId: `review:${index}`, type: "move_review", conceptId: "king_safety", outcome: "failure", occurredAt: `2026-08-0${index + 1}T12:00:00Z` }));
    await memoryStore.recordNoxLearningEvents(player, failures);
    expect((await memoryStore.getNoxMemory(player)).profile.mastery.king_safety?.status).toBe("weakness");
    const before = await progressionStore.getNoxProgression(player);
    const mission = await missionStore.getActiveNoxMission(player, { date: new Date("2026-08-10T12:00:00Z") });
    expect(mission.reasonCode).toBe("weakness_confirmed");
    await missionStore.startNoxMission(player, mission.id);
    for (const exerciseId of mission.exerciseIds) await missionStore.recordNoxMissionResult(player, { missionId: mission.id, exerciseId, success: true, mistakes: 0, hintsUsed: 0 });
    const completed = await missionStore.recordNoxMissionResult(player, { missionId: mission.id, exerciseId: mission.exerciseIds[0], success: true, mistakes: 0, hintsUsed: 0 });
    expect(completed.status).toBe("completed");
    expect(completed.results).toHaveLength(mission.exerciseIds.length);
    expect((await memoryStore.getNoxMemory(player)).profile.mastery.king_safety?.status).toBe("improving");
    expect((await progressionStore.getNoxProgression(player)).growthScore).toBeGreaterThan(before.growthScore);
  });

  it("isole les comptes et propose une mission visiteur non persistante", async () => {
    expect((await missionStore.getActiveNoxMission({ id: "other@example.test", name: "Other" })).status).toBe("offered");
    expect((await missionStore.getActiveNoxMission(null)).persistent).toBe(false);
  });
});
