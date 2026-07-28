"use client";

import type { PGNExample } from "@/data/pgn/examples";
import type { PGNDailyTrainingPlan } from "@/lib/pgnDailyTrainingPlan";
import { getPGNExampleMetrics } from "@/lib/pgnExampleMetrics";

type PGNDailyTrainingPlanProps = {
  plan: PGNDailyTrainingPlan;
  onOpenExercise: (
    example: PGNExample,
  ) => void;
};

export default function PGNDailyTrainingPlan({
  plan,
  onOpenExercise,
}: PGNDailyTrainingPlanProps) {
  const completionRate =
    plan.items.length === 0
      ? 0
      : Math.round(
          (plan.completedItems /
            plan.items.length) *
            100,
        );

  return (
    <section className="rounded-2xl border border-indigo-900/60 bg-indigo-950/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
            Programme du jour
          </p>

          <h3 className="mt-1 text-xl font-bold text-white">
            Séance personnalisée
          </h3>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Une sélection équilibrée selon
            les exercices déjà commencés,
            les catégories les moins
            travaillées et la durée
            estimée.
          </p>
        </div>

        <div className="rounded-xl border border-indigo-900/60 bg-gray-950/55 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Durée totale
          </p>
          <p className="mt-1 text-lg font-bold text-indigo-200">
            {plan.estimatedMinutes} min
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{
            width: `${completionRate}%`,
          }}
        />
      </div>

      <p className="mt-2 text-right text-xs text-gray-500">
        {plan.completedItems}/
        {plan.items.length} exercice
        {plan.items.length > 1
          ? "s"
          : ""}{" "}
        terminé
        {plan.completedItems > 1
          ? "s"
          : ""}
      </p>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {plan.items.map(
          ({ example, reason, priority },
          index) => {
            const metrics =
              getPGNExampleMetrics(
                example,
              );

            return (
              <article
                key={example.id}
                className="flex flex-col rounded-2xl border border-gray-800 bg-gray-950/65 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-900/70 bg-indigo-950/35 text-sm font-bold text-indigo-200">
                    {index + 1}
                  </span>

                  <PriorityBadge
                    priority={priority}
                  />
                </div>

                <h4 className="mt-4 font-bold text-white">
                  {example.title}
                </h4>

                <p className="mt-1 text-xs text-gray-500">
                  {metrics.estimatedMinutes} min
                  {" · "}
                  {formatCategory(
                    example.category,
                  )}
                  {" · "}
                  {example.difficulty}
                </p>

                <p className="mt-3 flex-1 text-sm leading-6 text-gray-400">
                  {reason}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onOpenExercise(
                      example,
                    );
                  }}
                  className="mt-4 rounded-xl border border-indigo-800 bg-indigo-950/30 px-4 py-2.5 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-950/55"
                >
                  Voir l’exercice
                </button>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: "high" | "medium" | "low";
}) {
  const label =
    priority === "high"
      ? "Prioritaire"
      : priority === "medium"
        ? "Recommandé"
        : "Complément";

  return (
    <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-gray-400">
      {label}
    </span>
  );
}

function formatCategory(
  category: PGNExample["category"],
): string {
  if (category === "opening") {
    return "Ouverture";
  }

  if (category === "middlegame") {
    return "Milieu";
  }

  return "Finale";
}