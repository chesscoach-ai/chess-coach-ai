"use client";

import type { PGNExample } from "@/data/pgn/examples";
import type { SkillPath } from "@/lib/learning/skillPath";
import type { PGNDailyTrainingPlan } from "@/lib/pgnDailyTrainingPlan";

export default function LearningSkillPath({
  path,
  dailyPlan,
  examples,
  streak,
  isLoading,
  onStart,
}: {
  path: SkillPath;
  dailyPlan: PGNDailyTrainingPlan;
  examples: PGNExample[];
  streak: number;
  isLoading: boolean;
  onStart: (example: PGNExample) => void;
}) {
  const byId = new Map(examples.map((example) => [example.id, example]));
  const recommended = path.recommendedExerciseId
    ? byId.get(path.recommendedExerciseId)
    : null;
  const review = dailyPlan.items.find((item) => item.kind === "review");

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-blue-950/25 shadow-xl">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-300">
            Ton parcours adaptatif
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            Prochaine étape : {recommended?.title ?? "Parcours maîtrisé"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {recommended
              ? `${path.recommendationLabel}. Une position courte, un réflexe utile, zéro cours magistral qui endort même les cavaliers.`
              : "Toutes les positions sont maîtrisées. Le coach recommande désormais de rejouer une leçon difficile."}
          </p>
          {recommended && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onStart(recommended)}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {isLoading ? "Préparation…" : "Continuer mon parcours"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <PathMetric label="Maîtrise" value={`${path.progressPercent}%`} />
          <PathMetric label="Positions" value={`${path.mastered}/${path.total}`} />
          <PathMetric label="Série" value={`🔥 ${streak} j`} />
        </div>
      </div>

      {review && (
        <div className="flex flex-col gap-3 border-t border-violet-900/50 bg-violet-950/20 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-lg"
            aria-hidden="true"
          >
            🧠
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">
              Révision express · {dailyPlan.dueItems} réflexe
              {dailyPlan.dueItems > 1 ? "s" : ""} à rafraîchir
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {review.example.title} — {review.reason}
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onStart(review.example)}
            className="min-h-10 shrink-0 rounded-xl border border-violet-700 bg-violet-950/40 px-4 py-2 text-xs font-black text-violet-200 transition hover:bg-violet-900/50 disabled:opacity-60"
          >
            Réviser maintenant
          </button>
        </div>
      )}

      <details className="group border-t border-slate-800/80">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.13em] text-blue-300">
              Carte des compétences
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              Toutes les zones restent accessibles : le coach conseille, il ne
              confisque pas l’échiquier.
            </p>
          </div>
          <span className="shrink-0 text-blue-300 transition group-open:rotate-180">
            ⌄
          </span>
        </summary>

        <div className="grid gap-2 border-t border-slate-800/70 bg-slate-950/30 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {path.chapters.map((chapter, index) => {
            const next = chapter.nextExerciseId
              ? byId.get(chapter.nextExerciseId)
              : null;
            const percent =
              chapter.total === 0
                ? 0
                : Math.round((chapter.completed / chapter.total) * 100);
            return (
              <button
                key={chapter.id}
                type="button"
                disabled={!next || isLoading}
                onClick={() => next && onStart(next)}
                className={[
                  "relative rounded-xl border p-3 text-left transition disabled:cursor-default",
                  chapter.status === "active"
                    ? "border-emerald-500 bg-emerald-950/30"
                    : chapter.status === "mastered"
                      ? "border-blue-800/70 bg-blue-950/20"
                      : "border-slate-800 bg-slate-900/70 hover:border-slate-600",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl" aria-hidden="true">
                    {chapter.icon}
                  </span>
                  <span className="text-[10px] font-black text-slate-500">
                    {index + 1}
                  </span>
                </div>
                <p className="mt-2 text-xs font-black text-white">
                  {chapter.title}
                </p>
                <p className="mt-1 min-h-8 text-[10px] leading-4 text-slate-500">
                  {chapter.description}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={[
                      "h-full rounded-full",
                      chapter.status === "mastered"
                        ? "bg-blue-400"
                        : "bg-emerald-400",
                    ].join(" ")}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[10px] font-bold text-slate-500">
                  {chapter.status === "mastered"
                    ? "Maîtrisé ✓"
                    : `${chapter.completed}/${chapter.total} positions`}
                </p>
              </button>
            );
          })}
        </div>
      </details>
    </section>
  );
}

function PathMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-3 text-center">
      <p className="text-base font-black text-white sm:text-lg">{value}</p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}
