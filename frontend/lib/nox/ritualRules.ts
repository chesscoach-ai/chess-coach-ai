export const RITUAL_PREVIEW_SCENARIOS = [
  "first_visit",
  "same_day",
  "return_1_day",
  "return_3_days",
  "return_14_days",
  "active_game",
  "active_session",
  "recent_improvement",
  "near_evolution",
  "no_context",
] as const;

export type RitualPreviewScenario = (typeof RITUAL_PREVIEW_SCENARIOS)[number];
export type ReturnBucket = "first_visit" | "same_day" | "return_1_3_days" | "return_long" | "no_context";
export type RitualActionType = "resume_game" | "resume_session" | "start_session" | "start_mission" | "play" | "discover_position";

export type NoxReturnContext = {
  now: Date;
  timeZone: string;
  firstVisit: boolean;
  lastActiveAt: string | null;
  activeGame: boolean;
  dailySessionStatus: "offered" | "started" | "completed" | null;
  dailySessionStep?: { current: number; total: number } | null;
  recentConcept?: { label: string; lastObservedAt: string; observations: number } | null;
  recentImprovement?: { label: string; evidenceCount: number; lastObservedAt: string } | null;
  pendingMission?: { label: string } | null;
  nearEvolution?: { nextRankLabel: string; remaining: string } | null;
  clanGamesThisWeek?: number | null;
  offline?: boolean;
  guest?: boolean;
};

export type NoxReturnRecommendation = {
  bucket: ReturnBucket;
  message: string;
  primaryAction: { type: RitualActionType; label: string };
  secondaryAction?: { type: RitualActionType; label: string };
  reason: string;
  contextSource: "active_game" | "active_session" | "daily_session" | "memory" | "mission" | "absence" | "fallback";
  moment?: { kind: "improvement" | "near_evolution"; message: string };
};

export type NoxWeeklySummary = {
  days: Array<{ dateKey: string; label: string; active: boolean }>;
  activeDays: number;
  games: number;
  sessions: number;
  consolidatedConcepts: number;
};

export function getRitualDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function getReturnBucket(context: Pick<NoxReturnContext, "firstVisit" | "lastActiveAt" | "now" | "timeZone">): ReturnBucket {
  if (context.firstVisit) return "first_visit";
  if (!context.lastActiveAt || Number.isNaN(Date.parse(context.lastActiveAt))) return "no_context";
  const current = getRitualDateKey(context.now, context.timeZone);
  const previous = getRitualDateKey(new Date(context.lastActiveAt), context.timeZone);
  const days = Math.max(0, Math.round((Date.parse(`${current}T12:00:00Z`) - Date.parse(`${previous}T12:00:00Z`)) / 86_400_000));
  if (days === 0) return "same_day";
  if (days <= 3) return "return_1_3_days";
  return "return_long";
}

export function buildNoxReturnRecommendation(context: NoxReturnContext): NoxReturnRecommendation {
  const bucket = getReturnBucket(context);
  const choose = (values: readonly string[], source: string) => values[stableIndex(`${getRitualDateKey(context.now, context.timeZone)}:${bucket}:${source}`, values.length)];
  const moment = buildMoment(context);

  if (context.activeGame) return {
    bucket,
    message: choose(["Ta partie est toujours là. On reprend le fil ?", "Une partie est en cours. Retrouvons l’échiquier."], "active-game"),
    primaryAction: { type: "resume_game", label: "Reprendre la partie" }, reason: "Une partie active a été vérifiée.", contextSource: "active_game", moment,
  };
  if (context.dailySessionStatus === "started") return {
    bucket,
    message: context.dailySessionStep ? `On reprend ta Session du jour à l’étape ${context.dailySessionStep.current}/${context.dailySessionStep.total} ?` : "On reprend ta Session du jour ?",
    primaryAction: { type: "resume_session", label: "Continuer ma session" }, reason: "Une session locale réellement commencée est disponible.", contextSource: "active_session", moment,
  };
  if (bucket === "first_visit") return {
    bucket, message: "On commence par une partie ? Ça m’aidera à découvrir ton jeu.",
    primaryAction: { type: "play", label: "Jouer" }, secondaryAction: { type: "discover_position", label: "Découvrir une position" }, reason: "Aucune observation pédagogique n’existe encore.", contextSource: "fallback",
  };
  if (bucket === "same_day" && context.dailySessionStatus === "completed") return {
    bucket, message: choose(["Ta Session du jour est terminée. On met ça en pratique dans une partie ?", "Beau travail aujourd’hui. Un duel pour laisser les idées respirer ?"], "same-day-complete"),
    primaryAction: { type: "play", label: "Jouer une partie" }, reason: "La session du jour est réellement terminée.", contextSource: "daily_session", moment,
  };
  if (bucket === "return_long") return {
    bucket, message: choose(["Content de te revoir. On reprend tranquillement ?", "Heureux de te retrouver. Une petite partie pour renouer avec l’échiquier ?"], "long-return"),
    primaryAction: context.dailySessionStatus === "offered" ? { type: "start_session", label: "Voir ma session" } : { type: "play", label: "Jouer tranquillement" },
    secondaryAction: context.dailySessionStatus === "offered" ? { type: "play", label: "Jouer une partie" } : undefined,
    reason: "Le retour suit une pause de plus de trois jours, sans culpabilisation.", contextSource: "absence", moment,
  };
  if (bucket === "return_1_3_days" && isReliableRecentConcept(context.recentConcept, context.now)) return {
    bucket, message: `Nous avons récemment travaillé ${context.recentConcept!.label}. Tu veux vérifier si ça tient ?`,
    primaryAction: context.dailySessionStatus === "offered" ? { type: "start_session", label: "Vérifier avec Nox" } : { type: "play", label: "Jouer une partie" },
    reason: `${context.recentConcept!.observations} observations réelles soutiennent ce rappel.`, contextSource: "memory", moment,
  };
  if (context.dailySessionStatus === "offered") return {
    bucket, message: choose(["J’ai préparé une courte intention pour aujourd’hui.", "On travaille une idée utile, puis tu retournes jouer ?"], "daily-offered"),
    primaryAction: { type: "start_session", label: "Voir ma Session du jour" }, secondaryAction: { type: "play", label: "Jouer maintenant" }, reason: "Une Session du jour est disponible.", contextSource: "daily_session", moment,
  };
  if (context.pendingMission) return {
    bucket, message: `Je te propose de continuer avec ${context.pendingMission.label}.`,
    primaryAction: { type: "start_mission", label: "Voir la mission" }, secondaryAction: { type: "play", label: "Jouer" }, reason: "Une mission existante est disponible.", contextSource: "mission", moment,
  };
  return {
    bucket, message: bucket === "same_day" ? choose(["On reprend où nous en étions ?", "Encore une partie, ou une idée à travailler ?"], "same-fallback") : "On continue ?",
    primaryAction: { type: "play", label: "Jouer une partie" }, secondaryAction: { type: "discover_position", label: "Découvrir une position" }, reason: context.offline ? "Les données distantes sont indisponibles ; aucun contexte n’est inventé." : "Aucun contexte assez fiable n’est disponible.", contextSource: "fallback", moment,
  };
}

export function buildNoxWeeklySummary(input: { now: Date; timeZone: string; activityDateKeys: string[]; gameEndedAt: string[]; sessionCompletedAt: string[]; consolidatedAt: string[] }): NoxWeeklySummary {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${getRitualDateKey(input.now, input.timeZone)}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    return { dateKey, label: new Intl.DateTimeFormat("fr-FR", { weekday: "narrow", timeZone: "UTC" }).format(date), active: false };
  });
  const allowed = new Set(days.map((day) => day.dateKey));
  const gameKeys = input.gameEndedAt.map((value) => getRitualDateKey(new Date(value), input.timeZone)).filter((value) => allowed.has(value));
  const sessionKeys = input.sessionCompletedAt.map((value) => getRitualDateKey(new Date(value), input.timeZone)).filter((value) => allowed.has(value));
  const activity = new Set([...input.activityDateKeys.filter((value) => allowed.has(value)), ...gameKeys, ...sessionKeys]);
  return {
    days: days.map((day) => ({ ...day, active: activity.has(day.dateKey) })), activeDays: activity.size, games: gameKeys.length, sessions: sessionKeys.length,
    consolidatedConcepts: input.consolidatedAt.filter((value) => allowed.has(getRitualDateKey(new Date(value), input.timeZone))).length,
  };
}

export function resolveRitualPreview(value: string | null, environment: string): RitualPreviewScenario | null {
  if (environment === "production") return null;
  return RITUAL_PREVIEW_SCENARIOS.includes(value as RitualPreviewScenario) ? value as RitualPreviewScenario : null;
}

export function buildRitualPreviewContext(scenario: RitualPreviewScenario, now = new Date("2026-09-04T12:00:00Z")): NoxReturnContext {
  const base: NoxReturnContext = { now, timeZone: "Europe/Paris", firstVisit: false, lastActiveAt: "2026-09-04T08:00:00Z", activeGame: false, dailySessionStatus: "offered", pendingMission: { label: "la sécurité du roi" }, guest: false };
  if (scenario === "first_visit") return { ...base, firstVisit: true, lastActiveAt: null, dailySessionStatus: null, pendingMission: null };
  if (scenario === "return_1_day" || scenario === "return_3_days") return { ...base, lastActiveAt: new Date(now.getTime() - (scenario === "return_1_day" ? 1 : 3) * 86_400_000).toISOString(), recentConcept: { label: "la sécurité du roi", lastObservedAt: new Date(now.getTime() - 2 * 86_400_000).toISOString(), observations: 4 } };
  if (scenario === "return_14_days") return { ...base, lastActiveAt: new Date(now.getTime() - 14 * 86_400_000).toISOString() };
  if (scenario === "active_game") return { ...base, activeGame: true };
  if (scenario === "active_session") return { ...base, dailySessionStatus: "started", dailySessionStep: { current: 2, total: 4 } };
  if (scenario === "recent_improvement") return { ...base, recentImprovement: { label: "mettre ton roi en sécurité", evidenceCount: 4, lastObservedAt: now.toISOString() } };
  if (scenario === "near_evolution") return { ...base, nearEvolution: { nextRankLabel: "Chevalier", remaining: "une maîtrise à confirmer" } };
  if (scenario === "no_context") return { ...base, lastActiveAt: null, dailySessionStatus: null, pendingMission: null, offline: true };
  return base;
}

function isReliableRecentConcept(concept: NoxReturnContext["recentConcept"], now: Date): boolean {
  return Boolean(concept && concept.observations >= 2 && Date.parse(concept.lastObservedAt) <= now.getTime() && now.getTime() - Date.parse(concept.lastObservedAt) <= 14 * 86_400_000);
}

function buildMoment(context: NoxReturnContext): NoxReturnRecommendation["moment"] {
  const improvement = context.recentImprovement;
  if (improvement && improvement.evidenceCount >= 3 && Date.parse(improvement.lastObservedAt) <= context.now.getTime() && context.now.getTime() - Date.parse(improvement.lastObservedAt) <= 7 * 86_400_000) return { kind: "improvement", message: `Tes résultats récents progressent sur ce thème : ${improvement.label}.` };
  if (context.nearEvolution) return { kind: "near_evolution", message: `Nox se rapproche du rang ${context.nearEvolution.nextRankLabel}. Il reste notamment ${context.nearEvolution.remaining}.` };
  return undefined;
}

function stableIndex(value: string, length: number): number {
  let hash = 0; for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % Math.max(1, length);
}
