"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import NoxAvatar from "@/components/Nox/NoxAvatar";
import { trackBetaEvent } from "@/lib/beta/client";
import type { NoxMemoryEnvelope } from "@/lib/nox/memoryTypes";
import { NOX_CONCEPT_LABELS } from "@/lib/nox/memoryRules";
import type { NoxDailySession } from "@/lib/nox/dailySessionTypes";
import type { NoxMission } from "@/lib/nox/missionTypes";
import type { NoxProgressionSnapshot } from "@/lib/nox/progressionTypes";
import { buildNoxReturnRecommendation, buildNoxWeeklySummary, buildRitualPreviewContext, resolveRitualPreview, type NoxReturnContext, type NoxReturnRecommendation, type NoxWeeklySummary, type RitualActionType } from "@/lib/nox/ritualRules";
import type { OnlineGame, OnlineGameHistoryItem } from "@/lib/multiplayer/types";
import { getTrainingActivity } from "@/lib/pgnExerciseProgress";

const LAST_ACTIVE_KEY = "knightly:ritual:last-active-at:v1";
const ACTIVE_GAME_KEY = "chess-coach-active-online-game";

export default function KnightlyRitualCard({ currentUser, mission, dailySession, onPlay, onProgress, onDiscover }: {
  currentUser: CurrentUser | null;
  mission: NoxMission | null;
  dailySession: NoxDailySession | null;
  onPlay: () => void;
  onProgress: () => void;
  onDiscover: () => void;
}) {
  const [state, setState] = useState<{ recommendation: NoxReturnRecommendation; summary: NoxWeeklySummary; preview: boolean; progression: NoxProgressionSnapshot | null } | null>(null);
  const [previewNotice, setPreviewNotice] = useState("");
  const tracked = useRef(false);
  const weeklyTracked = useRef(false);
  const visit = useRef<{ lastActiveAt: string | null; firstVisit: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const previewScenario = resolveRitualPreview(params.get("ritualPreview"), process.env.NODE_ENV);
      const now = new Date();
      if (previewScenario) {
        const context = buildRitualPreviewContext(previewScenario);
        const previewSummary = buildNoxWeeklySummary({ now: context.now, timeZone: context.timeZone, activityDateKeys: ["2026-09-01", "2026-09-03", "2026-09-04"], gameEndedAt: ["2026-09-02T14:00:00Z", "2026-09-04T10:00:00Z"], sessionCompletedAt: ["2026-09-03T09:00:00Z"], consolidatedAt: ["2026-09-01T12:00:00Z"] });
        if (!cancelled) setState({ recommendation: buildNoxReturnRecommendation(context), summary: previewSummary, preview: true, progression: null });
        return;
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
      if (!visit.current) {
        let lastActiveAt: string | null = null;
        try { lastActiveAt = window.localStorage.getItem(LAST_ACTIVE_KEY); } catch { /* Storage can be unavailable in private browsing. */ }
        visit.current = { lastActiveAt, firstVisit: !lastActiveAt };
      }
      const { lastActiveAt, firstVisit } = visit.current;
      const activeGameId = window.localStorage.getItem(ACTIVE_GAME_KEY);
      const requests = await Promise.allSettled([
        currentUser ? fetch("/api/nox/memory", { cache: "no-store", signal: AbortSignal.timeout(4000) }).then(async (response) => response.ok ? await response.json() as NoxMemoryEnvelope : null) : Promise.resolve(null),
        currentUser ? fetch("/api/nox/progression", { cache: "no-store", signal: AbortSignal.timeout(4000) }).then(async (response) => response.ok ? await response.json() as NoxProgressionSnapshot : null) : Promise.resolve(null),
        currentUser ? fetch("/api/multiplayer/history", { cache: "no-store", signal: AbortSignal.timeout(4000) }).then(async (response) => response.ok ? (await response.json() as { games: OnlineGameHistoryItem[] }).games : []) : Promise.resolve([] as OnlineGameHistoryItem[]),
        currentUser && activeGameId ? fetch(`/api/multiplayer/games/${encodeURIComponent(activeGameId)}`, { cache: "no-store", signal: AbortSignal.timeout(4000) }).then(async (response) => response.ok ? (await response.json() as { game: OnlineGame }).game : null) : Promise.resolve(null),
        currentUser ? fetch("/api/nox/ritual", { cache: "no-store", signal: AbortSignal.timeout(4000) }).then(async response => response.ok ? (await response.json() as { sessionCompletedAt: string[] }).sessionCompletedAt : []) : Promise.resolve([] as string[]),
      ]);
      const value = <T,>(result: PromiseSettledResult<T>, fallback: T): T => result.status === "fulfilled" ? result.value : fallback;
      const memory = value(requests[0], null);
      const progression = value(requests[1], null);
      const games = value(requests[2], []);
      const activeGame = value(requests[3], null);
      const masteries = Object.values(memory?.profile.mastery ?? {}).filter(Boolean);
      const recent = [...masteries].filter((item) => item!.observations >= 2).sort((a, b) => Date.parse(b!.lastObservedAt) - Date.parse(a!.lastObservedAt))[0];
      const improving = [...masteries].filter((item) => item!.observations >= 3 && item!.successes >= 2 && item!.trend === "up" && (item!.status === "improving" || item!.status === "mastered")).sort((a, b) => Date.parse(b!.lastObservedAt) - Date.parse(a!.lastObservedAt))[0];
      const context: NoxReturnContext = {
        now, timeZone, firstVisit, lastActiveAt, activeGame: activeGame?.status === "active",
        dailySessionStatus: dailySession?.status ?? null,
        dailySessionStep: dailySession?.status === "started" ? { current: Math.min(dailySession.currentStep + 1, dailySession.stepsCount), total: dailySession.stepsCount } : null,
        recentConcept: recent ? { label: NOX_CONCEPT_LABELS[recent!.conceptId], lastObservedAt: recent!.lastObservedAt, observations: recent!.observations } : null,
        recentImprovement: improving ? { label: NOX_CONCEPT_LABELS[improving!.conceptId], evidenceCount: improving!.observations, lastObservedAt: improving!.lastObservedAt } : null,
        pendingMission: mission && mission.status !== "completed" ? { label: mission.conceptLabel } : null,
        nearEvolution: progression?.nextRankLabel && progression.progressPercent >= 70 && progression.remaining[0] ? { nextRankLabel: progression.nextRankLabel, remaining: progression.remaining[0] } : null,
        guest: !currentUser,
        offline: requests.some((request) => request.status === "rejected"),
      };
      const training = getTrainingActivity(7);
      const summary = buildNoxWeeklySummary({
        now, timeZone,
        activityDateKeys: training.filter((day) => day.started > 0 || day.completed > 0).map((day) => day.date),
        gameEndedAt: games.map((game) => game.endedAt),
        sessionCompletedAt: currentUser ? value(requests[4], []) : dailySession?.completedAt ? [dailySession.completedAt] : [],
        consolidatedAt: (memory?.profile.milestones ?? []).filter((item) => item.kind === "first_mastery").map((item) => item.occurredAt),
      });
      if (cancelled) return;
      try { window.localStorage.setItem(LAST_ACTIVE_KEY, now.toISOString()); } catch { /* The greeting remains usable without storage. */ }
      if (!cancelled) setState({ recommendation: buildNoxReturnRecommendation(context), summary, preview: false, progression });
    }
    void load().catch(() => {
      if (!cancelled) setState({ recommendation: buildNoxReturnRecommendation({ now: new Date(), timeZone: "Europe/Paris", firstVisit: false, lastActiveAt: null, activeGame: false, dailySessionStatus: dailySession?.status ?? null, offline: true }), summary: buildNoxWeeklySummary({ now: new Date(), timeZone: "Europe/Paris", activityDateKeys: [], gameEndedAt: [], sessionCompletedAt: [], consolidatedAt: [] }), preview: false, progression: null });
    });
    return () => { cancelled = true; };
  }, [currentUser, dailySession, mission]);

  useEffect(() => {
    if (!state || state.preview || tracked.current) return;
    tracked.current = true;
    trackBetaEvent("return_context_viewed");
    if (state.recommendation.bucket === "return_long") trackBetaEvent("return_after_absence");
    if (state.recommendation.moment) trackBetaEvent("nox_progress_moment_viewed");
  }, [state]);

  const action = useMemo(() => ({ onPlay, onProgress, onDiscover }), [onDiscover, onPlay, onProgress]);
  function perform(type: RitualActionType) {
    if (!state) return;
    if (state.preview) { setPreviewNotice("Aperçu DEV : la navigation est simulée et aucune donnée réelle n’est modifiée."); return; }
    trackBetaEvent("resume_action_clicked");
    if (type === "resume_session" || type === "start_session" || type === "start_mission") action.onProgress();
    else if (type === "discover_position") action.onDiscover();
    else action.onPlay();
  }

  if (!state) return <section aria-busy="true" className="border-b border-gray-800 bg-gradient-to-r from-blue-950/70 via-gray-900 to-violet-950/50 px-4 py-3 sm:px-6"><div className="flex items-center gap-3"><span className="h-10 w-10 animate-pulse rounded-xl bg-indigo-900/60 motion-reduce:animate-none" aria-hidden="true" /><p className="text-sm text-gray-400">Nox prépare la prochaine action utile…</p></div></section>;
  const { recommendation, summary } = state;
  return (
    <section className="border-b border-gray-800 bg-gradient-to-r from-blue-950/75 via-gray-900 to-violet-950/55 px-4 py-3 sm:px-6 sm:py-4" aria-labelledby="ritual-title" data-ritual-preview={state.preview || undefined}>
      <div className="flex items-start gap-3 sm:gap-4">
        <NoxAvatar rank={state.progression?.rank} rankLabel={state.progression?.rankLabel} state={recommendation.moment ? "success" : recommendation.contextSource === "active_game" || recommendation.contextSource === "active_session" ? "thinking" : "tip"} size="compact" priority />
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">{state.preview ? `Aperçu DEV · ${recommendation.bucket}` : "Aujourd’hui avec Nox"}</p><h1 id="ritual-title" className="mt-1 text-lg font-black leading-6 text-white sm:text-2xl">{recommendation.message}</h1>{state.preview && <p className="mt-1 text-xs text-gray-500">Source vérifiée : {recommendation.reason}</p>}</div>
      </div>
      {recommendation.moment && <p className="mt-3 rounded-xl border border-indigo-800/70 bg-indigo-950/35 px-3 py-2 text-sm text-indigo-100">✦ {recommendation.moment.message}</p>}
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => perform(recommendation.primaryAction.type)} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">{recommendation.primaryAction.label}</button>{recommendation.secondaryAction && <button type="button" onClick={() => perform(recommendation.secondaryAction!.type)} className="min-h-11 rounded-xl border border-gray-700 px-4 text-sm font-bold text-gray-300">{recommendation.secondaryAction.label}</button>}</div>
      <details onToggle={(event) => { if (!state.preview && event.currentTarget.open && !weeklyTracked.current) { weeklyTracked.current = true; trackBetaEvent("weekly_summary_viewed"); } }} className="mt-3 rounded-xl border border-white/5 bg-black/15"><summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-gray-300">Cette semaine avec Nox <span className="text-gray-500">· {summary.activeDays} jour{summary.activeDays > 1 ? "s" : ""} actif{summary.activeDays > 1 ? "s" : ""}</span></summary><div className="border-t border-white/5 p-3"><div className="flex items-center gap-1.5" aria-label={`${summary.activeDays} jours actifs sur les sept derniers jours`}>{summary.days.map((day) => <span key={day.dateKey} className="text-center text-xs font-bold text-gray-500">{day.label}<span className={`mx-auto mt-1 block h-2.5 w-2.5 rounded-full ${day.active ? "bg-emerald-400" : "border border-gray-700"}`} /></span>)}</div><p className="mt-3 text-xs text-gray-400">{summary.games} partie{summary.games > 1 ? "s" : ""} · {summary.sessions} session{summary.sessions > 1 ? "s" : ""} · {summary.consolidatedConcepts} notion{summary.consolidatedConcepts > 1 ? "s" : ""} consolidée{summary.consolidatedConcepts > 1 ? "s" : ""}</p><p className="mt-1 text-xs text-gray-500">Ce résumé sert seulement à retrouver le fil de ton entraînement.</p></div></details>
      {!currentUser && <p className="mt-2 text-[11px] text-gray-500">Cette continuité reste sur cet appareil. Connecte-toi pour que Nox retrouve votre progression ailleurs.</p>}
      {previewNotice && <p role="status" className="mt-2 text-xs text-amber-200">{previewNotice}</p>}
    </section>
  );
}
