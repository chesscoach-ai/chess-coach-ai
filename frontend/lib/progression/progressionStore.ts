import "server-only";

import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import { getCommunityDashboard } from "@/lib/community/communityStore";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import { listFinishedOnlineGames } from "@/lib/multiplayer/gameStore";
import type { SyncedExerciseProgress } from "@/lib/progression/exerciseProgress";
import {
  applyStreakFreeze,
  buildJourneyLedger,
  getAvailableStreakFreezes,
  getLocalDateKey,
  getJourneySummary,
  mergeJourneyLedgers,
  type JourneyDashboard,
  type JourneyFriendQuest,
  type JourneyLedger,
  type JourneyLeaderboardEntry,
} from "@/lib/progression/journey";

type StoredJourneyProfile = {
  playerId: string;
  name: string;
  ledger: JourneyLedger;
  freezeUsed: number;
  updatedAt: string;
};

export type VerifiedExerciseResult = {
  exerciseId: string;
  elapsedTime: number;
  mistakes: number;
  hintsUsed: number;
};

type StoredExerciseEvent =
  VerifiedExerciseResult & {
    playerId: string;
    completedOn: string;
    completedAt: string;
  };

type LocalProgression = Record<
  string,
  StoredJourneyProfile
>;
type LocalExerciseEvents = Record<
  string,
  StoredExerciseEvent
>;

const dataDirectory = path.join(
  process.cwd(),
  ".data",
);
const progressionFile = path.join(
  dataDirectory,
  "progression.json",
);
const exerciseEventsFile = path.join(
  dataDirectory,
  "progression-exercises.json",
);
let localQueue: Promise<unknown> =
  Promise.resolve();
let localExerciseQueue: Promise<unknown> =
  Promise.resolve();
let pool: Pool | null = null;
let databaseReady:
  | Promise<void>
  | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  pool ??= new Pool({
    connectionString:
      process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV ===
      "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  databaseReady ??= Promise.all([
    pool.query(`
        CREATE TABLE IF NOT EXISTS progression_profiles (
          player_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          ledger JSONB NOT NULL DEFAULT '{}'::jsonb,
          freeze_used INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
    pool.query(`
        CREATE TABLE IF NOT EXISTS progression_exercise_events (
          player_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          completed_on DATE NOT NULL,
          elapsed_seconds INTEGER NOT NULL,
          mistakes INTEGER NOT NULL,
          hints_used INTEGER NOT NULL,
          completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (player_id, exercise_id, completed_on)
        )
      `),
  ])
    .then(() =>
      pool!.query(`
        ALTER TABLE progression_profiles
        ADD COLUMN IF NOT EXISTS freeze_used INTEGER NOT NULL DEFAULT 0
      `),
    )
    .then(() => undefined);
  return pool;
}

async function readLocalProgression(): Promise<LocalProgression> {
  try {
    const parsed = JSON.parse(
      await readFile(
        progressionFile,
        "utf8",
      ),
    ) as unknown;
    return parsed &&
      typeof parsed === "object"
      ? (parsed as LocalProgression)
      : {};
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
}

async function writeLocalProgression(
  value: LocalProgression,
): Promise<void> {
  await mkdir(dataDirectory, {
    recursive: true,
  });
  await writeFile(
    progressionFile,
    JSON.stringify(value, null, 2),
    "utf8",
  );
}

function withLocalLock<T>(
  operation: (
    profiles: LocalProgression,
  ) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(
    async () => {
      const profiles =
        await readLocalProgression();
      const result =
        await operation(profiles);
      await writeLocalProgression(
        profiles,
      );
      return result;
    },
  );
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readLocalExerciseEvents(): Promise<LocalExerciseEvents> {
  try {
    const parsed = JSON.parse(
      await readFile(
        exerciseEventsFile,
        "utf8",
      ),
    ) as unknown;
    return parsed &&
      typeof parsed === "object"
      ? (parsed as LocalExerciseEvents)
      : {};
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {};
    }
    throw error;
  }
}

function withLocalExerciseLock<T>(
  operation: (
    events: LocalExerciseEvents,
  ) => Promise<T> | T,
): Promise<T> {
  const run = localExerciseQueue.then(
    async () => {
      const events =
        await readLocalExerciseEvents();
      const result =
        await operation(events);
      await mkdir(dataDirectory, {
        recursive: true,
      });
      await writeFile(
        exerciseEventsFile,
        JSON.stringify(events, null, 2),
        "utf8",
      );
      return result;
    },
  );
  localExerciseQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function syncJourneyDashboard(
  player: AuthenticatedPlayer,
  clientLedger: JourneyLedger,
): Promise<JourneyDashboard> {
  const [games, training] =
    await Promise.all([
      listFinishedOnlineGames(player),
      listVerifiedExerciseActivity(
        player.id,
      ),
    ]);
  const authoritativeLedger =
    buildJourneyLedger(
      games,
      training,
    );
  const safeClientLedger =
    sanitizeJourneyLedger(clientLedger);
  const profile = await upsertProfile(
    player,
    mergeJourneyLedgers(
      authoritativeLedger,
      safeClientLedger,
    ),
  );
  const [profiles, community] =
    await Promise.all([
      listStoredProfiles(),
      getCommunityDashboard(player),
    ]);

  return {
    ledger: profile.ledger,
    leaderboard: buildLeaderboard(
      profiles,
      player.id,
      profile,
    ),
    friendQuest: buildFriendQuest(
      profile,
      profiles,
      community.friends,
    ),
    streakFreezes:
      getAvailableStreakFreezes(
        profile.ledger,
        profile.freezeUsed,
      ),
    lastProtectedDate:
      getLastProtectedDate(
        profile.ledger,
      ),
  };
}

export async function recordVerifiedExercise(
  player: AuthenticatedPlayer,
  result: VerifiedExerciseResult,
): Promise<void> {
  const database = getPool();
  const completedOn =
    getLocalDateKey();
  const completedAt =
    new Date().toISOString();

  if (!database) {
    await withLocalExerciseLock(
      (events) => {
        const key = [
          player.id,
          completedOn,
          result.exerciseId,
        ].join(":");
        const current = events[key];
        events[key] = {
          ...result,
          playerId: player.id,
          completedOn,
          completedAt,
          elapsedTime: Math.min(
            current?.elapsedTime ??
              result.elapsedTime,
            result.elapsedTime,
          ),
          mistakes: Math.min(
            current?.mistakes ??
              result.mistakes,
            result.mistakes,
          ),
          hintsUsed: Math.min(
            current?.hintsUsed ??
              result.hintsUsed,
            result.hintsUsed,
          ),
        };
      },
    );
    return;
  }

  await databaseReady;
  await database.query(
    `INSERT INTO progression_exercise_events (
       player_id,
       exercise_id,
       completed_on,
       elapsed_seconds,
       mistakes,
       hints_used,
       completed_at
     )
     VALUES ($1, $2, $3::date, $4, $5, $6, NOW())
     ON CONFLICT (player_id, exercise_id, completed_on)
     DO UPDATE SET
       elapsed_seconds = LEAST(
         progression_exercise_events.elapsed_seconds,
         EXCLUDED.elapsed_seconds
       ),
       mistakes = LEAST(
         progression_exercise_events.mistakes,
         EXCLUDED.mistakes
       ),
       hints_used = LEAST(
         progression_exercise_events.hints_used,
         EXCLUDED.hints_used
       ),
       completed_at = NOW()`,
    [
      player.id,
      result.exerciseId,
      completedOn,
      result.elapsedTime,
      result.mistakes,
      result.hintsUsed,
    ],
  );
}

export async function listVerifiedExerciseProgress(
  playerId: string,
): Promise<SyncedExerciseProgress[]> {
  const database = getPool();

  if (!database) {
    const events = Object.values(await readLocalExerciseEvents()).filter(
      (event) => event.playerId === playerId,
    );
    const grouped = new Map<string, SyncedExerciseProgress>();
    for (const event of events) {
      const current = grouped.get(event.exerciseId);
      grouped.set(event.exerciseId, {
        exerciseId: event.exerciseId,
        completedAt:
          !current || event.completedAt > current.completedAt
            ? event.completedAt
            : current.completedAt,
        bestTimeSeconds: Math.min(
          current?.bestTimeSeconds ?? Number.POSITIVE_INFINITY,
          event.elapsedTime,
        ),
        mistakes: Math.min(
          current?.mistakes ?? Number.POSITIVE_INFINITY,
          event.mistakes,
        ),
        hintsUsed: Math.min(
          current?.hintsUsed ?? Number.POSITIVE_INFINITY,
          event.hintsUsed,
        ),
        repetitions: (current?.repetitions ?? 0) + 1,
      });
    }
    return [...grouped.values()];
  }

  await databaseReady;
  const result = await database.query<{
    exercise_id: string;
    completed_at: Date;
    best_time_seconds: number;
    mistakes: number;
    hints_used: number;
    repetitions: number;
  }>(
    `SELECT exercise_id,
            MAX(completed_at) AS completed_at,
            MIN(elapsed_seconds)::int AS best_time_seconds,
            MIN(mistakes)::int AS mistakes,
            MIN(hints_used)::int AS hints_used,
            COUNT(DISTINCT completed_on)::int AS repetitions
     FROM progression_exercise_events
     WHERE player_id = $1
     GROUP BY exercise_id
     ORDER BY MAX(completed_at) DESC`,
    [playerId],
  );
  return result.rows.map((row) => ({
    exerciseId: row.exercise_id,
    completedAt: row.completed_at.toISOString(),
    bestTimeSeconds: row.best_time_seconds,
    mistakes: row.mistakes,
    hintsUsed: row.hints_used,
    repetitions: row.repetitions,
  }));
}

async function listVerifiedExerciseActivity(
  playerId: string,
): Promise<
  Array<{
    date: string;
    started: number;
    completed: number;
  }>
> {
  const database = getPool();
  if (!database) {
    const events = Object.values(
      await readLocalExerciseEvents(),
    ).filter(
      (event) =>
        event.playerId === playerId,
    );
    const counts = new Map<
      string,
      number
    >();
    for (const event of events) {
      counts.set(
        event.completedOn,
        (counts.get(event.completedOn) ??
          0) + 1,
      );
    }
    return [...counts].map(
      ([date, completed]) => ({
        date,
        started: 0,
        completed,
      }),
    );
  }

  await databaseReady;
  const result =
    await database.query<{
      completed_on: string;
      completed: string;
    }>(
      `SELECT completed_on::text,
              COUNT(*)::text AS completed
       FROM progression_exercise_events
       WHERE player_id = $1
         AND completed_on >= CURRENT_DATE - INTERVAL '120 days'
       GROUP BY completed_on
       ORDER BY completed_on`,
      [playerId],
    );
  return result.rows.map((row) => ({
    date: row.completed_on,
    started: 0,
    completed: Number(row.completed),
  }));
}

async function upsertProfile(
  player: AuthenticatedPlayer,
  incomingLedger: JourneyLedger,
): Promise<StoredJourneyProfile> {
  const database = getPool();
  const updatedAt =
    new Date().toISOString();

  if (!database) {
    return withLocalLock(
      (profiles) => {
        const current =
          profiles[player.id];
        const protectedProgress =
          applyStreakFreeze(
            mergeJourneyLedgers(
              current?.ledger ?? {},
              incomingLedger,
            ),
            current?.freezeUsed ?? 0,
          );
        const next = {
          playerId: player.id,
          name: player.name,
          ledger:
            protectedProgress.ledger,
          freezeUsed:
            protectedProgress.used,
          updatedAt,
        };
        profiles[player.id] = next;
        return next;
      },
    );
  }

  await databaseReady;
  const client =
    await database.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [player.id],
    );
    const stored =
      await client.query<{
        ledger: JourneyLedger;
        freeze_used: number;
      }>(
        `SELECT ledger,
                freeze_used
         FROM progression_profiles
         WHERE player_id = $1`,
        [player.id],
      );
    const protectedProgress =
      applyStreakFreeze(
        mergeJourneyLedgers(
        stored.rows[0]?.ledger ?? {},
        incomingLedger,
        ),
        stored.rows[0]?.freeze_used ??
          0,
      );
    const ledger =
      protectedProgress.ledger;
    await client.query(
      `INSERT INTO progression_profiles (
         player_id,
         display_name,
         ledger,
         freeze_used,
         updated_at
       )
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (player_id) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             ledger = EXCLUDED.ledger,
             freeze_used = EXCLUDED.freeze_used,
             updated_at = NOW()`,
      [
        player.id,
        player.name,
        JSON.stringify(ledger),
        protectedProgress.used,
      ],
    );
    await client.query("COMMIT");
    return {
      playerId: player.id,
      name: player.name,
      ledger,
      freezeUsed:
        protectedProgress.used,
      updatedAt,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function listStoredProfiles(): Promise<
  StoredJourneyProfile[]
> {
  const database = getPool();
  if (!database) {
    return Object.values(
      await readLocalProgression(),
    );
  }

  await databaseReady;
  const result =
    await database.query<{
      player_id: string;
      display_name: string;
      ledger: JourneyLedger;
      freeze_used: number;
      updated_at: Date;
    }>(
      `SELECT player_id,
              display_name,
              ledger,
              freeze_used,
              updated_at
       FROM progression_profiles`,
    );
  return result.rows.map((row) => ({
    playerId: row.player_id,
    name: row.display_name,
    ledger: row.ledger,
    freezeUsed: row.freeze_used,
    updatedAt:
      row.updated_at.toISOString(),
  }));
}

function buildLeaderboard(
  profiles: StoredJourneyProfile[],
  currentPlayerId: string,
  currentProfile: StoredJourneyProfile,
): JourneyLeaderboardEntry[] {
  const unique = new Map(
    profiles.map((profile) => [
      profile.playerId,
      profile,
    ]),
  );
  unique.set(
    currentPlayerId,
    currentProfile,
  );
  const currentLeague =
    getJourneySummary(
      currentProfile.ledger,
    ).league.name;
  const ranked = [
    ...unique.values(),
  ]
    .map((profile) => ({
      profile,
      summary: getJourneySummary(
        profile.ledger,
      ),
    }))
    .filter(
      ({ summary }) =>
        summary.league.name ===
        currentLeague,
    )
    .sort(
      (first, second) =>
        second.summary.weeklyXp -
          first.summary.weeklyXp ||
        first.profile.updatedAt.localeCompare(
          second.profile.updatedAt,
        ),
    );

  return ranked
    .map(
      (
        { profile, summary },
        index,
      ) => ({
        playerId: profile.playerId,
        name: profile.name,
        weeklyXp: summary.weeklyXp,
        rank: index + 1,
        currentPlayer:
          profile.playerId ===
          currentPlayerId,
      }),
    )
    .filter(
      (entry) =>
        entry.rank <= 10 ||
        entry.currentPlayer,
    );
}

function buildFriendQuest(
  currentProfile: StoredJourneyProfile,
  profiles: StoredJourneyProfile[],
  friends: Array<{
    id: string;
    name: string;
  }>,
): JourneyFriendQuest | null {
  if (friends.length === 0) {
    return null;
  }
  const sortedFriends = [...friends].sort(
    (first, second) =>
      first.id.localeCompare(second.id),
  );
  const weekNumber = Math.floor(
    Date.now() /
      (7 * 24 * 60 * 60 * 1_000),
  );
  const friend =
    sortedFriends[
      weekNumber %
        sortedFriends.length
    ];
  const friendProfile =
    profiles.find(
      (profile) =>
        profile.playerId === friend.id,
    );
  const combinedXp =
    getJourneySummary(
      currentProfile.ledger,
    ).weeklyXp +
    getJourneySummary(
      friendProfile?.ledger ?? {},
    ).weeklyXp;
  const goalXp = 120;

  return {
    friendId: friend.id,
    friendName: friend.name,
    combinedXp,
    goalXp,
    completed: combinedXp >= goalXp,
  };
}

function sanitizeJourneyLedger(
  value: JourneyLedger,
): JourneyLedger {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return {};
  }
  const minimumDate = new Date();
  minimumDate.setDate(
    minimumDate.getDate() - 120,
  );
  const minimumKey =
    minimumDate.toISOString().slice(0, 10);
  const maximumDate = new Date();
  maximumDate.setDate(
    maximumDate.getDate() + 1,
  );
  const maximumKey =
    maximumDate.toISOString().slice(0, 10);
  const safe: JourneyLedger = {};

  for (const [key, entry] of Object.entries(
    value,
  )) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        key,
      ) ||
      key < minimumKey ||
      key > maximumKey ||
      !entry ||
      entry.date !== key ||
      !entry.tasks
    ) {
      continue;
    }
    safe[key] = {
      date: key,
      tasks: {
        // Toutes les quêtes classées sont reconstruites
        // depuis les événements serveur. Le navigateur
        // conserve seulement une copie d'affichage locale.
        play: false,
        exercise: false,
        review: false,
      },
    };
  }
  return safe;
}

function getLastProtectedDate(
  ledger: JourneyLedger,
): string | null {
  return (
    Object.values(ledger)
      .filter(
        (entry) => entry.protected,
      )
      .map((entry) => entry.date)
      .sort()
      .at(-1) ?? null
  );
}
