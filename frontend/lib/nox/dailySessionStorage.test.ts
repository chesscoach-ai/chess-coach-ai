import { beforeEach, describe, expect, it, vi } from "vitest";

import { readStoredNoxDailySession, recordStoredDailyExercise } from "@/lib/nox/dailySessionStorage";

describe("persistance locale de la Session du jour", () => {
  const values = new Map<string, string>();
  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  });

  it("déduplique le même résultat après refresh ou double clic", () => {
    values.set("knightly:nox-daily-session:v1", JSON.stringify({ schemaVersion: 1, sessionId: "daily:x", dateKey: "2026-09-02", timeZone: "Europe/Paris", status: "started", completedExerciseIds: [], successfulExercises: 0, startedAt: "2026-09-02T10:00:00Z", completedAt: null, updatedAt: "2026-09-02T10:00:00Z", completionEventSent: false }));
    recordStoredDailyExercise({ sessionId: "daily:x", exerciseId: "a", success: true, exercisesTotal: 2 });
    recordStoredDailyExercise({ sessionId: "daily:x", exerciseId: "a", success: true, exercisesTotal: 2 });
    expect(readStoredNoxDailySession()).toMatchObject({ completedExerciseIds: ["a"], successfulExercises: 1, status: "started" });
  });

  it("conserve une complétion durable au dernier exercice", () => {
    values.set("knightly:nox-daily-session:v1", JSON.stringify({ schemaVersion: 1, sessionId: "daily:x", dateKey: "2026-09-02", timeZone: "Europe/Paris", status: "started", completedExerciseIds: ["a"], successfulExercises: 1, startedAt: "2026-09-02T10:00:00Z", completedAt: null, updatedAt: "2026-09-02T10:00:00Z", completionEventSent: false }));
    recordStoredDailyExercise({ sessionId: "daily:x", exerciseId: "b", success: false, exercisesTotal: 2 });
    expect(readStoredNoxDailySession()).toMatchObject({ completedExerciseIds: ["a", "b"], successfulExercises: 1, status: "completed" });
  });
});
