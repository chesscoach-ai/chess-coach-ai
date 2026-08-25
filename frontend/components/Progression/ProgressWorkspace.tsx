"use client";

import Image from "next/image";
import DailyCoachMission from "@/components/Coach/DailyCoachMission";
import type { CurrentUser } from "@/components/Layout/ProductWorkspace";
import NoxNotebook from "@/components/Nox/NoxNotebook";
import ActivityStreak from "@/components/Statistics/ActivityStreak";
import PlayerStatistics from "@/components/Statistics/PlayerStatistics";
import { useNoxMemory } from "@/hooks/useNoxMemory";
import { useNoxProgression } from "@/hooks/useNoxProgression";
import { NOX_RANK_ASSETS } from "@/lib/nox/rankAssets";
import Link from "next/link";

export default function ProgressWorkspace({ currentUser, onOpenExercises }: { currentUser: CurrentUser | null; onOpenExercises: () => void }) {
  const memory = useNoxMemory();
  const progression = useNoxProgression();
  const rank = progression.progression;
  const asset = NOX_RANK_ASSETS[rank?.rank ?? "squire"];
  const mastery = Object.values(memory.memory?.profile.mastery ?? {});
  const mastered = mastery.filter((item) => item?.status === "mastered").length;
  const improving = mastery.filter((item) => item?.status === "improving").length;

  return (
    <div id="progression-workspace" className="mx-auto max-w-5xl scroll-mt-20 space-y-4 sm:space-y-6">
      <header className="flex items-center gap-3 px-1">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-indigo-800 bg-slate-950"><Image src={asset.avatar} alt="Nox, ton compagnon d’échecs" fill sizes="48px" className="object-cover" /></div>
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Progresser</p><h1 className="text-2xl font-black text-white">Ta prochaine étape avec Nox</h1><p className="mt-1 text-sm text-gray-400">Une mission utile maintenant, le reste quand tu en as envie.</p></div>
      </header>

      <DailyCoachMission profile={null} />

      {!currentUser && <section className="rounded-2xl border border-blue-900/70 bg-blue-950/20 p-4 text-sm leading-6 text-blue-100"><p className="font-black">Découvre librement la première mission</p><p className="mt-1 text-blue-100/75">Connecte-toi ensuite pour que Nox se souvienne de ce que vous apprenez ensemble et retrouve ta progression sur tous tes appareils.</p><Link href="/auth" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-blue-700 px-4 font-bold">Se connecter quand je veux</Link></section>}

      <section className="rounded-2xl border border-indigo-900/65 bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-950 p-4 sm:p-5" aria-labelledby="nox-progression-title">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-indigo-700 bg-slate-950"><Image src={asset.avatar} alt="" fill sizes="64px" className="object-cover" /></div>
          <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300">Progression de Nox</p><h2 id="nox-progression-title" className="mt-1 text-xl font-black text-white">Nox — {rank?.rankLabel ?? "Écuyer"}</h2><p className="mt-1 text-sm text-gray-300">{!rank ? "Nox rassemble ce que vous avez déjà appris ensemble." : rank.nextRankLabel ? `Pour devenir ${rank.nextRankLabel}, continuons à transformer tes premiers apprentissages en réflexes.` : "Nous avons atteint le dernier rang narratif, mais chaque partie peut encore nous apprendre quelque chose."}</p></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800" aria-label={`Progression vers le prochain rang : ${rank?.progressPercent ?? 0} %`}><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300 transition-[width] motion-reduce:transition-none" style={{ width: `${rank?.progressPercent ?? 0}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-950/45 px-3 py-1.5 font-bold text-emerald-300">{mastered} concept{mastered > 1 ? "s" : ""} maîtrisé{mastered > 1 ? "s" : ""}</span><span className="rounded-full bg-amber-950/45 px-3 py-1.5 font-bold text-amber-300">{improving} faiblesse{improving > 1 ? "s" : ""} en amélioration</span><span className="rounded-full bg-indigo-950/55 px-3 py-1.5 font-bold text-indigo-300">{rank?.progressPercent ?? 0}% vers la suite</span></div>
      </section>

      <NoxNotebook memory={memory.memory} loading={memory.loading} onReset={memory.reset} progression={rank} showProgressionSummary={false} />

      <section className="rounded-2xl border border-emerald-900/60 bg-emerald-950/15 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">S’entraîner librement</p><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black text-white">Explorer les exercices</h2><p className="mt-1 text-sm text-gray-400">Tactiques, finales et parties célèbres, avec Nox à tes côtés.</p></div><button type="button" onClick={onOpenExercises} className="min-h-11 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white hover:bg-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Choisir un exercice</button></div>
      </section>

      <details className="group rounded-2xl border border-gray-800 bg-gray-900/60"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">Activité</p><h2 className="mt-1 font-black text-white">Série et statistiques</h2></div><span aria-hidden="true" className="text-gray-400 transition group-open:rotate-180">⌄</span></summary><div className="space-y-4 border-t border-gray-800 p-4"><ActivityStreak currentUser={currentUser} /><PlayerStatistics currentUser={currentUser} variant="analysis" /></div></details>
    </div>
  );
}
