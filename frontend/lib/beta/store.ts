import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

import type { BetaEventName } from "@/lib/beta/constants";
import type { BetaDiagnostics } from "@/lib/beta/types";

type BetaEvent = { id: string; visitorId: string; eventName: BetaEventName; page: string; platform: string; version: string; createdAt: string };
export type BetaFeedbackInput = { visitorId: string; liked: string; friction: string; noxHelped: boolean | null; rating: number; comment: string; page: string; platform: string; version: string };
export type BetaBugInput = { visitorId: string; comment: string; page: string; platform: string; browser: string; version: string; appState: string };
type LocalData = { events: BetaEvent[]; feedback: Array<BetaFeedbackInput & { id: string; createdAt: string }>; bugs: Array<BetaBugInput & { id: string; createdAt: string }> };

let pool: Pool | null = null;
const localPath = path.join(process.cwd(), ".data", "beta-observability.json");

function database(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined });
  return pool;
}

async function readLocal(): Promise<LocalData> {
  try { return JSON.parse(await readFile(localPath, "utf8")) as LocalData; }
  catch { return { events: [], feedback: [], bugs: [] }; }
}

async function mutateLocal(operation: (data: LocalData) => void): Promise<void> {
  const data = await readLocal();
  operation(data);
  data.events = data.events.slice(-10_000);
  data.feedback = data.feedback.slice(-1_000);
  data.bugs = data.bugs.slice(-1_000);
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, JSON.stringify(data, null, 2), "utf8");
}

export async function recordBetaEvent(input: Omit<BetaEvent, "id" | "createdAt">): Promise<void> {
  const db = database();
  if (db) {
    await db.query(`INSERT INTO beta_events (id, visitor_id, event_name, page, platform, app_version) VALUES ($1,$2,$3,$4,$5,$6)`, [randomUUID(), input.visitorId, input.eventName, input.page, input.platform, input.version]);
    return;
  }
  await mutateLocal((data) => data.events.push({ ...input, id: randomUUID(), createdAt: new Date().toISOString() }));
}

export async function recordBetaFeedback(input: BetaFeedbackInput): Promise<void> {
  const db = database();
  if (db) {
    await db.query(`INSERT INTO beta_feedback (id, visitor_id, liked, friction, nox_helped, rating, comment, page, platform, app_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [randomUUID(), input.visitorId, input.liked, input.friction, input.noxHelped, input.rating, input.comment, input.page, input.platform, input.version]);
    return;
  }
  await mutateLocal((data) => data.feedback.push({ ...input, id: randomUUID(), createdAt: new Date().toISOString() }));
}

export async function recordBetaBug(input: BetaBugInput): Promise<void> {
  const db = database();
  if (db) {
    await db.query(`INSERT INTO beta_bug_reports (id, visitor_id, comment, page, platform, browser, app_version, app_state) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [randomUUID(), input.visitorId, input.comment, input.page, input.platform, input.browser, input.version, input.appState]);
    return;
  }
  await mutateLocal((data) => data.bugs.push({ ...input, id: randomUUID(), createdAt: new Date().toISOString() }));
}

export async function getBetaDiagnostics(): Promise<BetaDiagnostics> {
  const db = database();
  let events: BetaEvent[]; let feedback: number; let bugs: number;
  if (db) {
    const [eventRows, feedbackRows, bugRows] = await Promise.all([
      db.query<{ id: string; visitorId: string; eventName: BetaEventName; page: string; platform: string; version: string; createdAt: Date }>(`SELECT id, visitor_id AS "visitorId", event_name AS "eventName", page, platform, app_version AS version, created_at AS "createdAt" FROM beta_events ORDER BY created_at DESC LIMIT 10000`),
      db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM beta_feedback"),
      db.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM beta_bug_reports"),
    ]);
    events = eventRows.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
    feedback = feedbackRows.rows[0]?.count ?? 0; bugs = bugRows.rows[0]?.count ?? 0;
  } else {
    const data = await readLocal(); events = data.events; feedback = data.feedback.length; bugs = data.bugs.length;
  }
  const counts: Record<string, number> = {};
  const opened = new Map<string, Date[]>();
  for (const event of events) {
    counts[event.eventName] = (counts[event.eventName] ?? 0) + 1;
    if (event.eventName === "app_opened") opened.set(event.visitorId, [...(opened.get(event.visitorId) ?? []), new Date(event.createdAt)]);
  }
  const retention = (days: number) => {
    let eligible = 0; let returned = 0; const now = Date.now();
    for (const dates of opened.values()) {
      const first = Math.min(...dates.map(Number));
      if (now - first < days * 86_400_000) continue;
      eligible += 1;
      if (dates.some((date) => Number(date) - first >= days * 86_400_000)) returned += 1;
    }
    return eligible ? Math.round((returned / eligible) * 100) : null;
  };
  return { storage: db ? "postgresql" : "local-json", events: counts, visitors: opened.size, feedback, bugs, retentionJ1: retention(1), retentionJ7: retention(7) };
}
