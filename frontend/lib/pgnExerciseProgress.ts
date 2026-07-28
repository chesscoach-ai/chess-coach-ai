export type PGNExerciseProgress = {
  exampleId: string;
  startedAt: string;
  completedAt: string | null;
  attempts: number;
  bestTimeSeconds?: number;
  lastMistakes?: number;
  needsReview?: boolean;
};

const PROGRESS_KEY =
  "chess-coach:pgn-exercise-progress";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readProgressMap(): Record<
  string,
  PGNExerciseProgress
> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw =
      window.localStorage.getItem(
        PROGRESS_KEY,
      );

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function writeProgressMap(
  map: Record<
    string,
    PGNExerciseProgress
  >,
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify(map),
  );
}

export function getAllExerciseProgress(): Record<
  string,
  PGNExerciseProgress
> {
  return readProgressMap();
}

export function getExerciseProgress(
  exampleId: string,
): PGNExerciseProgress | null {
  return (
    readProgressMap()[exampleId] ??
    null
  );
}

export function markExerciseStarted(
  exampleId: string,
): PGNExerciseProgress {
  const map = readProgressMap();
  const now = new Date().toISOString();
  const existing = map[exampleId];

  const next: PGNExerciseProgress = {
    exampleId,
    startedAt:
      existing?.startedAt ?? now,
    completedAt:
      existing?.completedAt ?? null,
    attempts:
      (existing?.attempts ?? 0) + 1,
  };

  map[exampleId] = next;
  writeProgressMap(map);

  return next;
}

export function markExerciseCompleted(
  exampleId: string,
  result?: {
    elapsedTime: number;
    mistakes: number;
    hintsUsed: number;
  },
): PGNExerciseProgress {
  const map = readProgressMap();
  const now = new Date().toISOString();
  const existing = map[exampleId];

  const next: PGNExerciseProgress = {
    exampleId,
    startedAt:
      existing?.startedAt ?? now,
    completedAt: now,
    attempts:
      existing?.attempts ?? 1,
    bestTimeSeconds:
      result
        ? Math.min(
            existing?.bestTimeSeconds ??
              Number.POSITIVE_INFINITY,
            result.elapsedTime,
          )
        : existing?.bestTimeSeconds,
    lastMistakes:
      result?.mistakes ??
      existing?.lastMistakes,
    needsReview:
      result
        ? result.mistakes > 0 ||
          result.hintsUsed > 1
        : existing?.needsReview,
  };

  map[exampleId] = next;
  writeProgressMap(map);

  return next;
}

export function resetExerciseProgress(
  exampleId: string,
): void {
  const map = readProgressMap();
  delete map[exampleId];
  writeProgressMap(map);
}

export function getProgressSummary(): {
  started: number;
  completed: number;
} {
  const items = Object.values(
    readProgressMap(),
  );

  return {
    started: items.length,
    completed: items.filter(
      (item) =>
        item.completedAt !== null,
    ).length,
  };
}


export type PGNTrainingActivity = {
  date: string;
  started: number;
  completed: number;
};

const ACTIVITY_KEY =
  "chess-coach:pgn-training-activity";

function readActivityMap(): Record<
  string,
  PGNTrainingActivity
> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const raw =
      window.localStorage.getItem(
        ACTIVITY_KEY,
      );

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function writeActivityMap(
  map: Record<
    string,
    PGNTrainingActivity
  >,
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    ACTIVITY_KEY,
    JSON.stringify(map),
  );
}

function getLocalDateKey(
  date = new Date(),
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function recordTrainingActivity(
  type: "started" | "completed",
): void {
  const map = readActivityMap();
  const key = getLocalDateKey();
  const current = map[key] ?? {
    date: key,
    started: 0,
    completed: 0,
  };

  map[key] = {
    ...current,
    [type]: current[type] + 1,
  };

  writeActivityMap(map);
}

export function getTrainingActivity(
  days = 28,
): PGNTrainingActivity[] {
  const map = readActivityMap();
  const output: PGNTrainingActivity[] =
    [];

  for (
    let offset = days - 1;
    offset >= 0;
    offset -= 1
  ) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(
      date.getDate() - offset,
    );

    const key = getLocalDateKey(date);

    output.push(
      map[key] ?? {
        date: key,
        started: 0,
        completed: 0,
      },
    );
  }

  return output;
}

export function getTrainingStreak(): {
  current: number;
  best: number;
  activeDays: number;
} {
  const map = readActivityMap();
  const activeDates = Object.values(map)
    .filter(
      (item) =>
        item.started > 0 ||
        item.completed > 0,
    )
    .map((item) => item.date)
    .sort();

  const activeSet = new Set(activeDates);
  let current = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  while (
    activeSet.has(
      getLocalDateKey(cursor),
    )
  ) {
    current += 1;
    cursor.setDate(
      cursor.getDate() - 1,
    );
  }

  let best = 0;
  let running = 0;
  let previous: Date | null = null;

  for (const value of activeDates) {
    const currentDate = new Date(
      `${value}T12:00:00`,
    );

    if (!previous) {
      running = 1;
    } else {
      const difference =
        Math.round(
          (currentDate.getTime() -
            previous.getTime()) /
            86_400_000,
        );

      running =
        difference === 1
          ? running + 1
          : 1;
    }

    best = Math.max(best, running);
    previous = currentDate;
  }

  return {
    current,
    best,
    activeDays: activeDates.length,
  };
}
