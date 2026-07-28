import {
  mkdtemp,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

describe("game review allowance", () => {
  const originalDirectory =
    process.cwd();
  let temporaryDirectory = "";
  let store: typeof import("@/lib/billing/gameReviewStore");

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(
      path.join(
        os.tmpdir(),
        "chess-coach-reviews-",
      ),
    );
    process.chdir(temporaryDirectory);
    vi.resetModules();
    store = await import(
      "@/lib/billing/gameReviewStore"
    );
  });

  afterAll(async () => {
    process.chdir(originalDirectory);
    await rm(temporaryDirectory, {
      recursive: true,
      force: true,
    });
  });

  it("unlocks three different free reviews and keeps reopened reviews free", async () => {
    const userId =
      "reviewer@example.test";

    await store.unlockGameReview(
      userId,
      "game-1",
      false,
    );
    await store.unlockGameReview(
      userId,
      "game-1",
      false,
    );
    await store.unlockGameReview(
      userId,
      "game-2",
      false,
    );
    const allowance =
      await store.unlockGameReview(
        userId,
        "game-3",
        false,
      );

    expect(allowance.freeUsed).toBe(3);
    expect(allowance.freeRemaining).toBe(0);
    await expect(
      store.unlockGameReview(
        userId,
        "game-4",
        false,
      ),
    ).rejects.toThrow(
      "REVIEW_LIMIT_REACHED",
    );
  });

  it("does not limit subscribed players", async () => {
    const allowance =
      await store.unlockGameReview(
        "premium@example.test",
        "game-premium",
        true,
      );

    expect(
      allowance.hasUnlimitedAccess,
    ).toBe(true);
  });
});
