import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("learning profile store", () => {
  const originalDirectory = process.cwd();
  let temporaryDirectory = "";
  let store: typeof import("@/lib/learning/profileStore");

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "chess-coach-learning-"),
    );
    process.chdir(temporaryDirectory);
    vi.resetModules();
    store = await import("@/lib/learning/profileStore");
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it("persists a personalized trend without counting the same game twice", async () => {
    const player = { id: "learner@example.test", name: "Nora" };
    const session = {
      moves: ["e4", "e5"],
      reviews: [
        {
          moveIndex: 0,
          classification: "blunder" as const,
          evaluationLoss: 2.5,
          isCapture: false,
          bestVariation: ["Nf3"],
        },
        {
          moveIndex: 1,
          classification: "good" as const,
          evaluationLoss: 0.1,
          isCapture: false,
          bestVariation: ["Nc6"],
        },
      ],
    };

    const first = await store.recordLearningSession(player, session);
    const duplicate = await store.recordLearningSession(player, session);

    expect(first.sessionsCount).toBe(1);
    expect(first.primaryWeakness).toBe("opening");
    expect(first.rating).toBe(1200);
    expect(duplicate.sessionsCount).toBe(1);
  });
});
