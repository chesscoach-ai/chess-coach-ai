import type { NoxDailySession, StoredNoxDailySession } from "@/lib/nox/dailySessionTypes";

export const NOX_DAILY_SESSION_STORAGE_KEY = "knightly:nox-daily-session:v1";

export function readStoredNoxDailySession(): StoredNoxDailySession | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(NOX_DAILY_SESSION_STORAGE_KEY) ?? "null") as StoredNoxDailySession | null;
    return parsed?.schemaVersion === 1 ? parsed : null;
  } catch { return null; }
}

export function storeNoxDailySession(session: NoxDailySession, completionEventSent = false): StoredNoxDailySession {
  const previous = readStoredNoxDailySession();
  const stored: StoredNoxDailySession = {
    schemaVersion: 1,
    sessionId: session.sessionId,
    dateKey: session.dateKey,
    timeZone: session.timeZone,
    status: session.status,
    completedExerciseIds: session.completedExerciseIds,
    successfulExercises: session.successfulExercises,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    updatedAt: session.updatedAt,
    completionEventSent: completionEventSent || (previous?.sessionId === session.sessionId && previous.completionEventSent),
  };
  window.localStorage.setItem(NOX_DAILY_SESSION_STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function startStoredNoxDailySession(session: NoxDailySession, now = new Date()): StoredNoxDailySession {
  return storeNoxDailySession({ ...session, status: "started", startedAt: session.startedAt ?? now.toISOString(), updatedAt: now.toISOString() });
}

export function recordStoredDailyExercise(input: { sessionId: string; exerciseId: string; success: boolean; exercisesTotal: number; now?: Date }): StoredNoxDailySession | null {
  const stored = readStoredNoxDailySession();
  if (!stored || stored.sessionId !== input.sessionId || stored.completedExerciseIds.includes(input.exerciseId)) return stored;
  const completedExerciseIds = [...stored.completedExerciseIds, input.exerciseId];
  const now = input.now ?? new Date();
  const completed = completedExerciseIds.length >= input.exercisesTotal;
  const next = { ...stored, status: completed ? "completed" as const : "started" as const, completedExerciseIds, successfulExercises: stored.successfulExercises + (input.success ? 1 : 0), completedAt: completed ? now.toISOString() : null, updatedAt: now.toISOString() };
  window.localStorage.setItem(NOX_DAILY_SESSION_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function markDailySessionCompletionTracked(session: NoxDailySession): StoredNoxDailySession {
  return storeNoxDailySession(session, true);
}
