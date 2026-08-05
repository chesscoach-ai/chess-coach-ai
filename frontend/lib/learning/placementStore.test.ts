import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("local placement store", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory = "";
  let store: typeof import("@/lib/learning/placementStore");

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "chess-coach-placement-"),
    );
    process.chdir(temporaryDirectory);
    vi.resetModules();
    store = await import("@/lib/learning/placementStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("persists an educational level without changing multiplayer data", async () => {
    const player = { id: "learner@example.test", name: "Lina" };
    const result = {
      completedAt: "2026-07-28T12:00:00.000Z",
      score: 74,
      estimatedRating: 1_525,
      levelLabel: "Intermédiaire solide",
      attempts: [],
    };

    await store.savePlacementResult(player, result);
    await expect(store.getPlacementResult(player.id)).resolves.toEqual(result);
  });
});
