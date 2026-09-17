"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import NoxAvatar from "@/components/Nox/NoxAvatar";
import { PGN_EXAMPLES } from "@/data/pgn/examples";
import { useNoxMission } from "@/hooks/useNoxMission";
import { buildExercise } from "@/lib/exercise/buildExercise";
import { saveExerciseSession } from "@/lib/exercises/exerciseStorage";
import { trackBetaEvent } from "@/lib/beta/client";
import { buildNoxDailySession, explainDailySessionChoice, resolvedTimeZone } from "@/lib/nox/dailySessionRules";
import { markDailySessionCompletionTracked, readStoredNoxDailySession, startStoredNoxDailySession, storeNoxDailySession } from "@/lib/nox/dailySessionStorage";
import type { StoredNoxDailySession } from "@/lib/nox/dailySessionTypes";
import type { LearningProfile } from "@/lib/learning/types";
import { getTrainingActivity } from "@/lib/pgnExerciseProgress";

export default function DailyCoachMission({
  profile: _profile,
  onOpenExercises,
}: {
  profile: LearningProfile | null;
  onOpenExercises?: () => void;
}) {
  void _profile;
  const router = useRouter();
  const { mission, loading, error, setMission } = useNoxMission();
  const [answer, setAnswer] = useState<number | null>(null);
  const [stored, setStored] = useState<StoredNoxDailySession | null>(null);
  const viewed = useRef<string | null>(null);
  const completionTracked = useRef<string | null>(null);
  const session = mission ? buildNoxDailySession({ mission, stored, timeZone: resolvedTimeZone() }) : null;

  useEffect(() => {
    const timer = window.setTimeout(() => setStored(readStoredNoxDailySession()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session || viewed.current === session.sessionId || session.preview) return;
    viewed.current = session.sessionId;
    trackBetaEvent("daily_session_viewed");
    setStored(storeNoxDailySession(session));
  }, [session]);

  useEffect(() => {
    if (!session || session.status !== "completed" || session.preview || stored?.completionEventSent || completionTracked.current === session.sessionId) return;
    completionTracked.current = session.sessionId;
    trackBetaEvent("daily_session_completed");
    markDailySessionCompletionTracked(session);
  }, [session, stored?.completionEventSent]);

  if (loading || !mission || !session) {
    return <section className="rounded-2xl border border-indigo-900/60 bg-gray-900/60 p-4 text-sm text-gray-400">Nox prépare ta Session du jour…</section>;
  }

  const nextExerciseId = session.exerciseIds.find((id) => !session.completedExerciseIds.includes(id));
  const progress = Math.round((session.currentStep / session.stepsCount) * 100);
  const needsQuiz = Boolean(mission.quiz && session.currentStep === 0 && session.status !== "completed");

  async function begin() {
    if (!nextExerciseId || !session || !mission) return;
    const activeSession = session;
    const activeMission = mission;
    const isResume = activeSession.status === "started";
    trackBetaEvent(isResume ? "daily_session_resumed" : "daily_session_started");
    setStored(startStoredNoxDailySession(activeSession));

    const example = PGN_EXAMPLES.find((item) => item.id === nextExerciseId);
    if (!example) return;
    if (activeMission.persistent && !activeMission.preview && activeMission.status === "offered") {
      try {
        const response = await fetch("/api/nox/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", missionId: activeMission.id }) });
        if (response.ok) setMission(await response.json());
      } catch {
        // La copie locale versionnée permet de continuer ; le serveur resynchronisera au retour.
      }
    }
    const exercise = buildExercise(example.pgn, { id: example.id, title: example.title, description: example.description });
    saveExerciseSession({
      ...exercise,
      sourceExampleId: example.id,
      missionId: activeMission.id,
      missionStep: activeSession.completedExerciseIds.length + 1,
      missionTotal: activeSession.exerciseIds.length,
      missionConceptId: activeMission.conceptId,
      dailySessionId: activeSession.sessionId,
      coachNote: `${activeSession.reason} Nox ne donnera pas la réponse : regarde d’abord les échecs, prises et menaces utiles à ce thème.`,
      returnHref: "/?mode=progression&focus=daily-session",
      returnLabel: "Continuer ma Session du jour",
    });
    router.push("/exercises/training?dailySession=1");
  }

  function leaveForGame() {
    if (session?.status === "started" && !session.preview) trackBetaEvent("daily_session_abandoned");
  }

  return (
    <section id="daily-session" className="scroll-mt-24 overflow-hidden rounded-3xl border border-indigo-600/70 bg-gradient-to-br from-indigo-950/75 via-gray-900 to-violet-950/45 shadow-[0_22px_70px_rgba(49,46,129,0.22)]" aria-labelledby="daily-session-title">
      <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
        <NoxAvatar state={session.status === "completed" ? "success" : session.status === "started" ? "thinking" : "tip"} size="regular" priority />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">{session.preview ? "Aperçu DEV · " : ""}{session.title}</p>
            <span className="rounded-full border border-indigo-700/70 bg-indigo-950/70 px-2.5 py-1 text-xs font-black text-indigo-100">≈ {session.estimatedMinutes} min</span>
          </div>
          <h2 id="daily-session-title" className="mt-2 text-xl font-black text-white sm:text-2xl">{session.status === "completed" ? `Tu as travaillé à ${session.conceptLabel}` : `Aujourd’hui, travaillons à ${session.conceptLabel}`}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-300">{session.reason}</p>
        </div>
      </div>

      <div className="border-t border-indigo-900/55 px-4 py-4 sm:px-6">
        {error && <p role="status" className="mb-3 rounded-xl border border-amber-800/70 bg-amber-950/25 px-3 py-2 text-xs text-amber-100">{error} Tu peux continuer une session déjà chargée.</p>}
        <div className="flex items-center justify-between gap-3 text-xs"><span className="font-bold text-indigo-200">Étape {Math.min(session.currentStep + 1, session.stepsCount)} sur {session.stepsCount}</span><span className="text-gray-500">{session.completedExerciseIds.length}/{session.exerciseIds.length} positions</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800" aria-label={`Progression de la session : ${session.status === "completed" ? 100 : progress} %`}><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300 transition-[width] motion-reduce:transition-none" style={{ width: `${session.status === "completed" ? 100 : progress}%` }} /></div>

        <details className="mt-3 rounded-xl border border-white/5 bg-black/15"><summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-indigo-200">Pourquoi cette session ? <span aria-hidden="true">⌄</span></summary><p className="border-t border-white/5 px-3 py-3 text-xs leading-5 text-gray-400">{explainDailySessionChoice(session)}</p></details>

        {mission.quiz && needsQuiz && (
          <div className="mt-4 rounded-xl border border-indigo-900/60 bg-gray-950/45 p-3"><p className="text-sm font-bold text-white">Un rappel avant le plateau : {mission.quiz.question}</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{mission.quiz.answers.map((choice, index) => <button key={choice} type="button" onClick={() => setAnswer(index)} className={`min-h-11 rounded-lg border px-3 py-2 text-left text-xs ${answer === index ? index === mission.quiz!.correctAnswer ? "border-emerald-600 bg-emerald-950/40 text-emerald-200" : "border-amber-700 bg-amber-950/30 text-amber-200" : "border-gray-700 text-gray-300"}`}>{choice}</button>)}</div>{answer !== null && <p className="mt-2 text-xs text-gray-300">{answer === mission.quiz.correctAnswer ? "Bien vu. " : "Pas tout à fait. "}{mission.quiz.explanation}</p>}</div>
        )}

        {session.status === "completed" ? (
          <div className="mt-4 rounded-2xl border border-emerald-700/70 bg-emerald-950/25 p-4" aria-live="polite"><p className="text-lg font-black text-emerald-200">Session terminée ✓</p><p className="mt-1 text-sm leading-6 text-gray-300">Bien joué. Je garde ce résultat en mémoire : tu as reconnu {session.successfulExercises} situation{session.successfulExercises > 1 ? "s" : ""} liée{session.successfulExercises > 1 ? "s" : ""} à ce thème. On le met en pratique dans une partie ?</p><p className="mt-2 text-xs leading-5 text-gray-500">La mémoire et la progression de Nox utilisent uniquement ces résultats vérifiés.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/?mode=multiplayer" onClick={leaveForGame} className="flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white">Jouer une partie</Link><button type="button" onClick={onOpenExercises} className="min-h-11 rounded-xl border border-emerald-700 px-4 text-sm font-black text-emerald-200">Continuer à s’entraîner</button></div>{!session.persistent && <p className="mt-3 text-xs text-gray-400">Connecte-toi pour que Nox puisse se souvenir de ce que vous travaillez ensemble.</p>}</div>
        ) : (
          <button type="button" onClick={() => void begin()} disabled={Boolean(needsQuiz && answer === null)} className="mt-4 min-h-12 w-full rounded-xl bg-indigo-600 px-5 font-black text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500">{session.status === "started" ? "Continuer ma session" : "Commencer"}</button>
        )}

        <RecentPractice />
      </div>
    </section>
  );
}

function RecentPractice() {
  const days = getTrainingActivity(7);
  const activeCount = days.filter((day) => day.completed > 0).length;
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  return <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3"><p className="text-[11px] text-gray-500">Nox vous a vus travailler {activeCount} jour{activeCount > 1 ? "s" : ""} récemment.</p><div className="flex gap-1" aria-label={`${activeCount} jours d’entraînement parmi les 7 derniers`}>{days.map((day, index) => <span key={day.date} title={day.date} className="text-center text-[9px] font-bold text-gray-500">{labels[index]}<span className={`mx-auto mt-1 block h-2 w-2 rounded-full ${day.completed > 0 ? "bg-emerald-400" : "border border-gray-700"}`} /></span>)}</div></div>;
}
