import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createNoxMemoryProfile } from "@/lib/nox/memoryRules";
import type { ConceptMastery, LearningEvent, NoxConceptId } from "@/lib/nox/memoryTypes";

vi.mock("server-only", () => ({}));
const PLAYER_A_ID = "rank-a@example.test";

describe("persistance locale de la progression Nox", () => {
  const originalDirectory = process.cwd();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let temporaryDirectory = "";
  let store: typeof import("@/lib/nox/progressionStore");
  let memoryStore: typeof import("@/lib/nox/memoryStore");
  const playerA = { id: PLAYER_A_ID, name: "A" };
  const playerB = { id: "rank-b@example.test", name: "B" };

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "knightly-nox-rank-"));
    process.chdir(temporaryDirectory);
    delete process.env.DATABASE_URL;
    await mkdir(path.join(temporaryDirectory, ".data"), { recursive: true });
    await writeFile(path.join(temporaryDirectory, ".data", "nox-memory.json"), JSON.stringify(seedMemory()), "utf8");
    vi.resetModules();
    store = await import("@/lib/nox/progressionStore");
    memoryStore = await import("@/lib/nox/memoryStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("crée un milestone lors du rang atteint et isole les comptes", async () => {
    const ranked = await store.getNoxProgression(playerA);
    const other = await store.getNoxProgression(playerB);
    expect(ranked.rank).toBe("knight");
    expect(ranked.milestones[0]?.id).toBe("NOX_REACHED_KNIGHT");
    expect(other.rank).toBe("squire");
  });

  it("conserve le rang après un reset de mémoire sans conserver les acquis en cours", async () => {
    await memoryStore.resetNoxMemory(playerA);
    const ranked = await store.getNoxProgression(playerA);
    expect(ranked.rank).toBe("knight");
    expect(ranked.growthScore).toBe(0);
  });

  it("ne persiste rien pour un visiteur", async () => {
    const guest = await store.getNoxProgression(null);
    expect(guest).toMatchObject({ rank: "squire", persistent: false });
  });
});

function seedMemory() {
  const ids: NoxConceptId[] = ["development", "king_safety", "forks", "calculation"];
  const base = createNoxMemoryProfile(new Date("2026-08-10T12:00:00Z"));
  const mastery = Object.fromEntries(ids.map((conceptId, index) => [conceptId, {
    conceptId,
    status: index < 2 ? "mastered" : "learning",
    weaknessObserved: index === 0,
    score: index < 2 ? 82 : 55,
    observations: 5,
    successes: 4,
    failures: 1,
    lastObservedAt: "2026-08-10T12:00:00Z",
    trend: "up",
  } satisfies ConceptMastery]));
  const profile = { ...base, mastery, milestones: ids.slice(0, 2).map((conceptId, index) => ({ id: `m-${index}`, kind: "first_mastery" as const, conceptId, label: "Acquis", occurredAt: "2026-08-10T12:00:00Z" })) };
  const eventConcepts: NoxConceptId[] = ["development", "development", "development", "king_safety", "forks", "calculation"];
  const events = Object.fromEntries(eventConcepts.map((conceptId, index) => {
    const event: LearningEvent = { id: `e-${index}`, sourceId: `source-${index}`, type: index === 0 ? "mission_completed" : "concept_detected", conceptId, outcome: "success", occurredAt: `2026-08-0${index + 1}T12:00:00Z` };
    return [`${PLAYER_A_ID}:${event.sourceId}`, event];
  }));
  return { profiles: { [PLAYER_A_ID]: profile }, events };
}
