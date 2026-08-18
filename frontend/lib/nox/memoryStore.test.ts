import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { LearningEvent } from "@/lib/nox/memoryTypes";

vi.mock("server-only", () => ({}));

describe("persistance locale de la mémoire Nox", () => {
  const originalDirectory = process.cwd();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let temporaryDirectory = "";
  let store: typeof import("@/lib/nox/memoryStore");
  const playerA = { id: "player-a@example.test", name: "A" };
  const playerB = { id: "player-b@example.test", name: "B" };
  const learningEvent: LearningEvent = {
    id: "event-a",
    type: "exercise_failure",
    conceptId: "forks",
    outcome: "failure",
    occurredAt: "2026-08-01T12:00:00Z",
    sourceId: "exercise:one",
  };

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "knightly-nox-memory-"));
    process.chdir(temporaryDirectory);
    delete process.env.DATABASE_URL;
    vi.resetModules();
    store = await import("@/lib/nox/memoryStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("sépare les utilisateurs et ignore un événement dupliqué", async () => {
    await store.recordNoxLearningEvents(playerA, [learningEvent, learningEvent]);
    const memoryA = await store.getNoxMemory(playerA);
    const memoryB = await store.getNoxMemory(playerB);
    expect(memoryA.profile.mastery.forks?.observations).toBe(1);
    expect(memoryB.profile.mastery.forks).toBeUndefined();
  });

  it("ne crée aucune fausse persistance pour un visiteur", async () => {
    const guest = await store.getNoxMemory(null);
    expect(guest.persistent).toBe(false);
    expect(guest.profile.mastery).toEqual({});
  });

  it("réinitialise profil et événements sans conserver le contenu pédagogique", async () => {
    await store.resetNoxMemory(playerA);
    expect((await store.getNoxMemory(playerA)).profile.mastery).toEqual({});
    const stored = await readFile(path.join(temporaryDirectory, ".data", "nox-memory.json"), "utf8");
    expect(stored).not.toContain("exercise:one");
  });
});

