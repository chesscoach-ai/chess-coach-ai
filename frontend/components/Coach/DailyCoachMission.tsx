"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PGN_EXAMPLES } from "@/data/pgn/examples";
import { buildExercise } from "@/lib/exercise/buildExercise";
import { saveExerciseSession } from "@/lib/exercises/exerciseStorage";
import { useNoxMission } from "@/hooks/useNoxMission";
import type { LearningProfile } from "@/lib/learning/types";

export default function DailyCoachMission({ profile: _profile }: { profile: LearningProfile | null }) {
  void _profile;
  const router = useRouter();
  const { mission, loading, setMission } = useNoxMission();
  const [answer, setAnswer] = useState<number | null>(null);
  if (loading || !mission) return <section className="rounded-2xl border border-indigo-900/60 bg-gray-900/60 p-4 text-sm text-gray-400">Nox prépare une courte mission…</section>;
  const completed = mission.status === "completed";
  const currentExerciseId = mission.exerciseIds[mission.currentStep];
  const progress = Math.round((mission.currentStep / mission.exerciseIds.length) * 100);
  const correctCount = mission.results.filter((result) => result.success).length;

  async function begin() {
    if (!currentExerciseId) return;
    const example = PGN_EXAMPLES.find((item) => item.id === currentExerciseId);
    if (!example) return;
    if (mission!.persistent && mission!.status === "offered") {
      const response = await fetch("/api/nox/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", missionId: mission!.id }) });
      if (response.ok) setMission(await response.json());
    }
    const session = buildExercise(example.pgn, { id: example.id, title: example.title, description: example.description });
    saveExerciseSession({ ...session, sourceExampleId: example.id, missionId: mission!.id, missionStep: mission!.currentStep + 1, missionTotal: mission!.exerciseIds.length, missionConceptId: mission!.conceptId, coachNote: `${mission!.reason} Nox ne donnera pas la réponse, mais il t’aidera à regarder au bon endroit.`, returnHref: "/?focus=daily-mission", returnLabel: "Continuer la mission de Nox" });
    router.push("/exercises/training?mission=1");
  }

  return (
    <details id="daily-coach" open={!completed} className="group scroll-mt-24 overflow-hidden rounded-2xl border border-indigo-800/70 bg-gradient-to-br from-indigo-950/55 via-gray-900 to-violet-950/35 shadow-xl">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">{mission.preview ? "Aperçu DEV · Mission de Nox" : mission.persistent ? "Mission de Nox" : "Mission découverte"}</p><h2 className="mt-1 truncate font-black text-white">{mission.title}</h2><p className="mt-1 text-xs text-gray-400">{mission.estimatedMinutes} min · {mission.currentStep}/{mission.exerciseIds.length} positions</p></div>
        <span className="text-indigo-300 transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-indigo-900/50 p-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300 transition-[width]" style={{ width: `${completed ? 100 : progress}%` }} /></div>
        <p className="mt-4 text-sm leading-6 text-gray-200">{mission.reason}</p>
        <p className="mt-2 text-xs text-gray-500">Difficulté : {mission.difficulty === "discovery" ? "découverte" : mission.difficulty === "consolidation" ? "consolidation" : "maîtrise"}. Positions vérifiées de la bibliothèque Knightly.</p>
        {mission.quiz && mission.currentStep === 0 && !completed && (
          <div className="mt-4 rounded-xl border border-indigo-900/60 bg-gray-950/45 p-3"><p className="text-sm font-bold text-white">{mission.quiz.question}</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{mission.quiz.answers.map((choice, index) => <button key={choice} type="button" onClick={() => setAnswer(index)} className={`rounded-lg border px-3 py-2 text-left text-xs ${answer === index ? index === mission.quiz!.correctAnswer ? "border-emerald-600 bg-emerald-950/40 text-emerald-200" : "border-amber-700 bg-amber-950/30 text-amber-200" : "border-gray-700 text-gray-300"}`}>{choice}</button>)}</div>{answer !== null && <p className="mt-2 text-xs text-gray-300">{answer === mission.quiz.correctAnswer ? "Bien vu. " : "Pas tout à fait. "}{mission.quiz.explanation}</p>}</div>
        )}
        {completed ? <div className="mt-4 rounded-xl border border-emerald-700/70 bg-emerald-950/25 p-4"><p className="font-black text-emerald-200">Mission terminée</p><p className="mt-1 text-sm text-gray-300">{correctCount}/{mission.exerciseIds.length} positions comprises. Bien joué : ce concept entre maintenant dans notre mémoire commune.</p><p className="mt-2 text-xs font-bold text-indigo-300">Progression de Nox recalculée depuis tes apprentissages ✓</p></div> : <button type="button" onClick={() => void begin()} disabled={Boolean(mission.quiz && answer === null && mission.currentStep === 0)} className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-black text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500">{mission.status === "started" ? "Continuer la mission" : "Commencer"}</button>}
      </div>
    </details>
  );
}
