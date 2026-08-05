import type { OnlineGameHistoryItem } from "@/lib/multiplayer/types";
import type { PGNTrainingActivity } from "@/lib/pgnExerciseProgress";

export type JourneyTaskId =
  | "play"
  | "exercise"
  | "review";

export type JourneyDay = {
  date: string;
  tasks: Record<JourneyTaskId, boolean>;
  protected?: boolean;
};

export type JourneyLedger = Record<string, JourneyDay>;

export type JourneyLeague = {
  name: string;
  color: string;
  nextAt: number | null;
};

export type JourneyLeaderboardEntry = {
  playerId: string;
  name: string;
  weeklyXp: number;
  rank: number;
  currentPlayer: boolean;
};

export type JourneyFriendQuest = {
  friendId: string;
  friendName: string;
  combinedXp: number;
  goalXp: number;
  completed: boolean;
};

export type JourneyDashboard = {
  ledger: JourneyLedger;
  leaderboard: JourneyLeaderboardEntry[];
  friendQuest: JourneyFriendQuest | null;
  streakFreezes: number;
  lastProtectedDate: string | null;
};

export const JOURNEY_STORAGE_KEY =
  "chess-coach:journey-ledger";

const XP_BY_TASK: Record<JourneyTaskId, number> = {
  play: 20,
  exercise: 15,
  review: 25,
};

export function buildJourneyLedger(
  games: OnlineGameHistoryItem[],
  training: PGNTrainingActivity[],
  existing: JourneyLedger = {},
): JourneyLedger {
  const next = { ...existing };

  for (const activity of training) {
    mergeDay(next, activity.date, {
      exercise: activity.completed > 0,
    });
  }

  for (const game of games) {
    const date = getLocalDateKey(
      new Date(game.endedAt),
    );
    mergeDay(next, date, {
      play: true,
      review:
        game.whiteAccuracy !== null ||
        game.blackAccuracy !== null,
    });
  }

  return next;
}

export function mergeJourneyLedgers(
  current: JourneyLedger,
  incoming: JourneyLedger,
): JourneyLedger {
  const merged = structuredClone(current);

  for (const entry of Object.values(
    incoming,
  )) {
    mergeDay(
      merged,
      entry.date,
      entry.tasks,
      entry.protected,
    );
  }

  return merged;
}

export function getJourneySummary(
  ledger: JourneyLedger,
  today = new Date(),
) {
  const todayKey = getLocalDateKey(today);
  const todayEntry =
    ledger[todayKey] ?? emptyDay(todayKey);
  const weekStart = startOfWeek(today);
  const monthPrefix = todayKey.slice(0, 7);
  const weeklyXp = Object.values(ledger)
    .filter(
      (entry) =>
        entry.date >=
          getLocalDateKey(weekStart) &&
        entry.date <= todayKey,
    )
    .reduce(
      (total, entry) =>
        total + getDayXp(entry),
      0,
    );
  const monthlyQuests = Object.values(ledger)
    .filter((entry) =>
      entry.date.startsWith(monthPrefix),
    )
    .reduce(
      (total, entry) =>
        total +
        Object.values(entry.tasks).filter(
          Boolean,
        ).length,
      0,
    );

  return {
    today: todayEntry,
    completedToday: Object.values(
      todayEntry.tasks,
    ).filter(Boolean).length,
    todayXp: getDayXp(todayEntry),
    weeklyXp,
    monthlyQuests,
    streak: getCombinedStreak(
      ledger,
      today,
    ),
    league: getLeague(weeklyXp),
  };
}

export function getDayXp(
  entry: JourneyDay,
): number {
  return (
    (entry.tasks.play
      ? XP_BY_TASK.play
      : 0) +
    (entry.tasks.exercise
      ? XP_BY_TASK.exercise
      : 0) +
    (entry.tasks.review
      ? XP_BY_TASK.review
      : 0)
  );
}

export function getLeague(
  weeklyXp: number,
): JourneyLeague {
  if (weeklyXp >= 500) {
    return {
      name: "Ligue Couronne",
      color: "text-amber-300",
      nextAt: null,
    };
  }
  if (weeklyXp >= 250) {
    return {
      name: "Ligue Saphir",
      color: "text-blue-300",
      nextAt: 500,
    };
  }
  if (weeklyXp >= 100) {
    return {
      name: "Ligue Cristal",
      color: "text-cyan-300",
      nextAt: 250,
    };
  }
  return {
    name: "Ligue Bronze",
    color: "text-orange-300",
    nextAt: 100,
  };
}

export function getLocalDateKey(
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

export function getAvailableStreakFreezes(
  ledger: JourneyLedger,
  used: number,
): number {
  const perfectDays = Object.values(
    ledger,
  ).filter(
    (entry) =>
      !entry.protected &&
      Object.values(entry.tasks).every(
        Boolean,
      ),
  ).length;

  return Math.max(
    0,
    Math.min(
      2,
      1 +
        Math.floor(perfectDays / 7) -
        Math.max(0, used),
    ),
  );
}

export function applyStreakFreeze(
  ledger: JourneyLedger,
  used: number,
  today = new Date(),
): {
  ledger: JourneyLedger;
  used: number;
  protectedDate: string | null;
} {
  const next = structuredClone(ledger);
  const todayKey = getLocalDateKey(today);
  const yesterdayKey = shiftDateKey(
    today,
    -1,
  );
  const previousKey = shiftDateKey(
    today,
    -2,
  );
  const todayIsActive = isActiveDay(
    next[todayKey],
  );
  const yesterdayIsActive = isActiveDay(
    next[yesterdayKey],
  );
  const previousIsActive = isActiveDay(
    next[previousKey],
  );

  if (
    !todayIsActive ||
    yesterdayIsActive ||
    !previousIsActive ||
    getAvailableStreakFreezes(next, used) < 1
  ) {
    return {
      ledger: next,
      used,
      protectedDate: null,
    };
  }

  next[yesterdayKey] = {
    ...emptyDay(yesterdayKey),
    protected: true,
  };
  return {
    ledger: next,
    used: used + 1,
    protectedDate: yesterdayKey,
  };
}

function mergeDay(
  ledger: JourneyLedger,
  date: string,
  tasks: Partial<
    Record<JourneyTaskId, boolean>
  >,
  protectedDay = false,
): void {
  const current =
    ledger[date] ?? emptyDay(date);
  ledger[date] = {
    date,
    protected:
      current.protected ||
      protectedDay ||
      undefined,
    tasks: {
      play:
        current.tasks.play ||
        Boolean(tasks.play),
      exercise:
        current.tasks.exercise ||
        Boolean(tasks.exercise),
      review:
        current.tasks.review ||
        Boolean(tasks.review),
    },
  };
}

function emptyDay(date: string): JourneyDay {
  return {
    date,
    tasks: {
      play: false,
      exercise: false,
      review: false,
    },
  };
}

function getCombinedStreak(
  ledger: JourneyLedger,
  today: Date,
): number {
  const activeDates = new Set(
    Object.values(ledger)
      .filter(isActiveDay)
      .map((entry) => entry.date),
  );
  const cursor = new Date(today);
  cursor.setHours(12, 0, 0, 0);

  if (
    !activeDates.has(
      getLocalDateKey(cursor),
    )
  ) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (
    activeDates.has(
      getLocalDateKey(cursor),
    )
  ) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function isActiveDay(
  entry: JourneyDay | undefined,
): boolean {
  return Boolean(
    entry &&
      (entry.protected ||
        Object.values(entry.tasks).some(
          Boolean,
        )),
  );
}

function shiftDateKey(
  date: Date,
  days: number,
): string {
  const shifted = new Date(date);
  shifted.setHours(12, 0, 0, 0);
  shifted.setDate(
    shifted.getDate() + days,
  );
  return getLocalDateKey(shifted);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  const day = result.getDay();
  result.setDate(
    result.getDate() -
      (day === 0 ? 6 : day - 1),
  );
  return result;
}
