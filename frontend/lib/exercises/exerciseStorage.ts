import type { ExerciseSession } from "@/types/exercise";

const EXERCISE_STORAGE_KEY = "chess-coach:exercise-session";

export function saveExerciseSession(
  session: ExerciseSession,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    EXERCISE_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export function getExerciseSession():
  | ExerciseSession
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSession = window.localStorage.getItem(
    EXERCISE_STORAGE_KEY,
  );

  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(
      storedSession,
    ) as ExerciseSession;
  } catch {
    window.localStorage.removeItem(
      EXERCISE_STORAGE_KEY,
    );

    return null;
  }
}

export function clearExerciseSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    EXERCISE_STORAGE_KEY,
  );
}