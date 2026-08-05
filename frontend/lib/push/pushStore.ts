import "server-only";

import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import webpush from "web-push";

import { getReminderMessage } from "@/lib/content/playfulVoice";
import type { AuthenticatedPlayer } from "@/lib/multiplayer/playerSession";
import type { JourneyLedger } from "@/lib/progression/journey";

export type StoredPushSubscription = {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  reminderTime: string;
  timezone: string;
};

type PushRecord =
  StoredPushSubscription & {
    playerId: string;
    playerName: string;
    lastSentOn: string | null;
    updatedAt: string;
    ledger?: JourneyLedger;
  };

type LocalPushStore = Record<
  string,
  PushRecord
>;

const dataDirectory = path.join(
  process.cwd(),
  ".data",
);
const pushFile = path.join(
  dataDirectory,
  "push-subscriptions.json",
);
let localQueue: Promise<unknown> =
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
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          endpoint TEXT PRIMARY KEY,
          player_id TEXT NOT NULL,
          player_name TEXT NOT NULL,
          auth_key TEXT NOT NULL,
          p256dh_key TEXT NOT NULL,
          reminder_time TEXT NOT NULL DEFAULT '19:00',
          timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
          last_sent_on TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
    pool.query(`
        CREATE TABLE IF NOT EXISTS progression_profiles (
          player_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          ledger JSONB NOT NULL DEFAULT '{}'::jsonb,
          freeze_used INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
  ])
    .then(() => undefined);
  return pool;
}

export function getPushPublicKey():
  | string
  | null {
  return (
    process.env
      .NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    null
  );
}

export function isPushConfigured(): boolean {
  return Boolean(
    getPushPublicKey() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

export function isValidTimeZone(
  timezone: string,
): boolean {
  try {
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone,
    }).format();
    return true;
  } catch {
    return false;
  }
}

export async function savePushSubscription(
  player: AuthenticatedPlayer,
  subscription: StoredPushSubscription,
): Promise<void> {
  const database = getPool();
  const record: PushRecord = {
    ...subscription,
    playerId: player.id,
    playerName: player.name,
    lastSentOn: null,
    updatedAt: new Date().toISOString(),
  };

  if (!database) {
    await withLocalLock((records) => {
      const current =
        records[subscription.endpoint];
      records[subscription.endpoint] = {
        ...record,
        lastSentOn:
          current?.playerId === player.id
            ? current.lastSentOn
            : null,
      };
    });
    return;
  }

  await databaseReady;
  await database.query(
    `INSERT INTO push_subscriptions (
       endpoint,
       player_id,
       player_name,
       auth_key,
       p256dh_key,
       reminder_time,
       timezone,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       player_id = EXCLUDED.player_id,
       player_name = EXCLUDED.player_name,
       auth_key = EXCLUDED.auth_key,
       p256dh_key = EXCLUDED.p256dh_key,
       reminder_time = EXCLUDED.reminder_time,
       timezone = EXCLUDED.timezone,
       last_sent_on = CASE
         WHEN push_subscriptions.player_id = EXCLUDED.player_id
         THEN push_subscriptions.last_sent_on
         ELSE NULL
       END,
       updated_at = NOW()`,
    [
      subscription.endpoint,
      player.id,
      player.name,
      subscription.keys.auth,
      subscription.keys.p256dh,
      subscription.reminderTime,
      subscription.timezone,
    ],
  );
}

export async function removePushSubscription(
  playerId: string,
  endpoint: string,
): Promise<void> {
  await deleteSubscription(
    endpoint,
    playerId,
  );
}

export async function sendTestPush(
  player: AuthenticatedPlayer,
): Promise<number> {
  ensurePushConfigured();
  const records =
    await listPlayerSubscriptions(
      player.id,
    );
  if (records.length === 0) {
    throw new Error(
      "PUSH_SUBSCRIPTION_REQUIRED",
    );
  }

  let sent = 0;
  for (const record of records) {
    if (
      await sendPush(record, {
        title:
          "Chess Clan · Liaison royale établie",
        body: `${player.name}, le pigeon messager fonctionne. Aucun roi n’a été dérangé pendant ce test.`,
        tag: "push-test",
        url: "/",
      })
    ) {
      sent += 1;
    }
  }
  if (sent === 0) {
    throw new Error(
      "PUSH_SEND_FAILED",
    );
  }
  return sent;
}

export async function dispatchDuePushes(
  now = new Date(),
): Promise<{
  checked: number;
  sent: number;
  removed: number;
}> {
  ensurePushConfigured();
  const records =
    await listAllSubscriptions();
  let sent = 0;
  let removed = 0;

  for (const record of records) {
    const local = getLocalClock(
      now,
      record.timezone,
    );
    if (
      record.lastSentOn === local.date ||
      isMissionComplete(
        record.ledger,
        local.date,
      ) ||
      !isReminderDue(
        local.time,
        record.reminderTime,
      )
    ) {
      continue;
    }
    const delivered = await sendPush(
      record,
      {
        title: `Chess Clan · ${record.playerName}, ta série t’observe`,
        body: getReminderMessage(now),
        tag: `daily-coach-${local.date}`,
        url: "/?focus=daily-mission",
      },
    );
    if (delivered) {
      sent += 1;
      await markSent(
        record.endpoint,
        local.date,
      );
    } else {
      removed += 1;
    }
  }

  return {
    checked: records.length,
    sent,
    removed,
  };
}

export function isReminderDue(
  currentTime: string,
  reminderTime: string,
): boolean {
  const current =
    toMinutes(currentTime);
  const reminder =
    toMinutes(reminderTime);
  return (
    current >= reminder &&
    current < reminder + 90
  );
}

function ensurePushConfigured(): void {
  if (!isPushConfigured()) {
    throw new Error(
      "PUSH_NOT_CONFIGURED",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    getPushPublicKey()!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

async function sendPush(
  record: PushRecord,
  payload: {
    title: string;
    body: string;
    tag: string;
    url: string;
  },
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: record.endpoint,
        keys: record.keys,
      },
      JSON.stringify({
        ...payload,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      }),
      {
        TTL: 60 * 60,
        urgency: "normal",
      },
    );
    return true;
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error &&
      "statusCode" in error
        ? Number(error.statusCode)
        : 0;
    if (
      statusCode === 404 ||
      statusCode === 410
    ) {
      await deleteSubscription(
        record.endpoint,
      );
      return false;
    }
    throw error;
  }
}

async function listPlayerSubscriptions(
  playerId: string,
): Promise<PushRecord[]> {
  const database = getPool();
  if (!database) {
    return Object.values(
      await readLocalStore(),
    ).filter(
      (record) =>
        record.playerId === playerId,
    );
  }
  await databaseReady;
  const result =
    await database.query<PushRow>(
      `SELECT *
       FROM push_subscriptions
       WHERE player_id = $1`,
      [playerId],
    );
  return result.rows.map(mapRow);
}

async function listAllSubscriptions(): Promise<
  PushRecord[]
> {
  const database = getPool();
  if (!database) {
    return Object.values(
      await readLocalStore(),
    );
  }
  await databaseReady;
  const result =
    await database.query<PushRow>(
      `SELECT push_subscriptions.*,
              progression_profiles.ledger
       FROM push_subscriptions
       LEFT JOIN progression_profiles
         ON progression_profiles.player_id =
            push_subscriptions.player_id`,
    );
  return result.rows.map(mapRow);
}

async function markSent(
  endpoint: string,
  localDate: string,
): Promise<void> {
  const database = getPool();
  if (!database) {
    await withLocalLock((records) => {
      if (records[endpoint]) {
        records[endpoint].lastSentOn =
          localDate;
      }
    });
    return;
  }
  await databaseReady;
  await database.query(
    `UPDATE push_subscriptions
     SET last_sent_on = $2,
         updated_at = NOW()
     WHERE endpoint = $1`,
    [endpoint, localDate],
  );
}

async function deleteSubscription(
  endpoint: string,
  playerId?: string,
): Promise<void> {
  const database = getPool();
  if (!database) {
    await withLocalLock((records) => {
      if (
        records[endpoint] &&
        (!playerId ||
          records[endpoint]
            .playerId === playerId)
      ) {
        delete records[endpoint];
      }
    });
    return;
  }
  await databaseReady;
  await database.query(
    `DELETE FROM push_subscriptions
     WHERE endpoint = $1
       AND ($2::text IS NULL OR player_id = $2)`,
    [endpoint, playerId ?? null],
  );
}

type PushRow = {
  endpoint: string;
  player_id: string;
  player_name: string;
  auth_key: string;
  p256dh_key: string;
  reminder_time: string;
  timezone: string;
  last_sent_on: string | null;
  updated_at: Date;
  ledger?: JourneyLedger | null;
};

function mapRow(row: PushRow): PushRecord {
  return {
    endpoint: row.endpoint,
    playerId: row.player_id,
    playerName: row.player_name,
    keys: {
      auth: row.auth_key,
      p256dh: row.p256dh_key,
    },
    reminderTime:
      row.reminder_time,
    timezone: row.timezone,
    lastSentOn: row.last_sent_on,
    updatedAt:
      row.updated_at.toISOString(),
    ledger: row.ledger ?? undefined,
  };
}

function isMissionComplete(
  ledger: JourneyLedger | undefined,
  date: string,
): boolean {
  const tasks = ledger?.[date]?.tasks;
  return Boolean(
    tasks &&
      tasks.play &&
      tasks.exercise &&
      tasks.review,
  );
}

function getLocalClock(
  date: Date,
  timezone: string,
): {
  date: string;
  time: string;
} {
  const parts =
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
  const read = (type: string) =>
    parts.find(
      (part) => part.type === type,
    )?.value ?? "00";
  return {
    date: `${read("year")}-${read("month")}-${read("day")}`,
    time: `${read("hour")}:${read("minute")}`,
  };
}

function toMinutes(value: string): number {
  const [hours, minutes] = value
    .split(":")
    .map(Number);
  return hours * 60 + minutes;
}

async function readLocalStore(): Promise<LocalPushStore> {
  try {
    const parsed = JSON.parse(
      await readFile(pushFile, "utf8"),
    ) as unknown;
    return parsed &&
      typeof parsed === "object"
      ? (parsed as LocalPushStore)
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

function withLocalLock<T>(
  operation: (
    records: LocalPushStore,
  ) => Promise<T> | T,
): Promise<T> {
  const run = localQueue.then(
    async () => {
      const records =
        await readLocalStore();
      const result =
        await operation(records);
      await mkdir(dataDirectory, {
        recursive: true,
      });
      await writeFile(
        pushFile,
        JSON.stringify(records, null, 2),
        "utf8",
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
