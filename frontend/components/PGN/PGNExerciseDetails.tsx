"use client";

import { useEffect } from "react";

import type { PGNExample } from "@/data/pgn/examples";
import { getPGNExampleMetrics } from "@/lib/pgnExampleMetrics";
import type { PGNExerciseProgress } from "@/lib/pgnExerciseProgress";
import PGNExamplePreviewBoard from "@/components/PGN/PGNExamplePreviewBoard";

type PGNExerciseDetailsProps = {
  example: PGNExample;
  isFavorite: boolean;
  onClose: () => void;
  progress: PGNExerciseProgress | null;
  onToggleFavorite: () => void;
  onStart: () => void;
  onMarkCompleted: () => void;
  onResetProgress: () => void;
};

export default function PGNExerciseDetails({
  example,
  isFavorite,
  onClose,
  progress,
  onToggleFavorite,
  onStart,
  onMarkCompleted,
  onResetProgress,
}: PGNExerciseDetailsProps) {
  const metrics =
    getPGNExampleMetrics(example);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-details-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-800 bg-gray-950/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Aperçu de l’exercice
            </p>

            <h2
              id="exercise-details-title"
              className="mt-1 text-xl font-bold text-white"
            >
              {example.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l’aperçu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 text-lg text-gray-300 transition hover:bg-gray-800"
          >
            ×
          </button>
        </header>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div>
            <PGNExamplePreviewBoard
              example={example}
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricCard
                label="Durée estimée"
                value={`${metrics.estimatedMinutes} min`}
              />
              <MetricCard
                label="Nombre de coups"
                value={`${metrics.fullMoveCount}`}
              />
              <MetricCard
                label="Niveau conseillé"
                value={metrics.estimatedElo}
              />
              <MetricCard
                label="Camp au trait"
                value={metrics.sideToMove}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-3xl font-bold tracking-tight text-white">
                  {example.title}
                </p>

                <p className="mt-2 text-base text-gray-400">
                  {example.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleFavorite}
                aria-pressed={isFavorite}
                className={[
                  "rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  isFavorite
                    ? "border-yellow-700 bg-yellow-950/45 text-yellow-300"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:text-yellow-300",
                ].join(" ")}
              >
                {isFavorite
                  ? "★ Dans les favoris"
                  : "☆ Ajouter aux favoris"}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <DifficultyBadge
                difficulty={
                  example.difficulty
                }
              />

              <CategoryBadge
                category={
                  example.category
                }
              />
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/65 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Objectif pédagogique
              </p>

              <p className="mt-3 text-sm leading-7 text-gray-300">
                {example.description}
              </p>
            </div>

            {example.historicalNote && (
              <div className="mt-6 rounded-2xl border border-violet-800/60 bg-violet-950/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-300">
                  Dans la peau de {example.champion}
                </p>
                <p className="mt-3 text-sm leading-7 text-violet-100/80">
                  {example.historicalNote}
                </p>
                {example.sourceUrl && (
                  <a
                    href={example.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-xs font-semibold text-violet-300 underline decoration-violet-500/50 underline-offset-4 hover:text-violet-200"
                  >
                    Voir la partie historique complète
                  </a>
                )}
              </div>
            )}

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Thèmes travaillés
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {example.themes.map(
                  (theme) => (
                    <span
                      key={theme}
                      className="rounded-full border border-blue-900/70 bg-blue-950/30 px-3 py-1.5 text-xs font-semibold text-blue-200"
                    >
                      {theme}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/45 p-5">
              <p className="font-semibold text-gray-200">
                Comment utiliser cet exercice ?
              </p>

              <ol className="mt-3 space-y-2 text-sm leading-6 text-gray-400">
                <li>
                  1. Observe la position avant de déplacer une pièce.
                </li>
                <li>
                  2. Identifie les menaces, les faiblesses et les coups candidats.
                </li>
                <li>
                  3. Joue ton choix puis compare-le à l’analyse du coach.
                </li>
              </ol>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                    Progression
                  </p>

                  <p className="mt-2 text-sm font-semibold text-gray-200">
                    {progress?.completedAt
                      ? "Exercice terminé"
                      : progress
                        ? "Exercice commencé"
                        : "Pas encore commencé"}
                  </p>

                  {progress && (
                    <p className="mt-1 text-xs text-gray-500">
                      {progress.attempts} tentative
                      {progress.attempts > 1
                        ? "s"
                        : ""}
                    </p>
                  )}
                </div>

                <ProgressBadge
                  progress={progress}
                />
              </div>

              {progress && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {!progress.completedAt && (
                    <button
                      type="button"
                      onClick={onMarkCompleted}
                      className="rounded-xl border border-emerald-800 bg-emerald-950/35 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-950/55"
                    >
                      Marquer comme terminé
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onResetProgress}
                    className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-400 transition hover:bg-gray-800 hover:text-gray-200"
                  >
                    Réinitialiser la progression
                  </button>
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col-reverse gap-3 pt-7 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-800"
              >
                Retour à la bibliothèque
              </button>

              <button
                type="button"
                onClick={onStart}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                Commencer l’exercice →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgressBadge({
  progress,
}: {
  progress: PGNExerciseProgress | null;
}) {
  if (progress?.completedAt) {
    return (
      <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300">
        ✓ Terminé
      </span>
    );
  }

  if (progress) {
    return (
      <span className="rounded-full border border-blue-800 bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-300">
        En cours
      </span>
    );
  }

  return (
    <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-400">
      À découvrir
    </span>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-gray-200">
        {value}
      </p>
    </div>
  );
}

function DifficultyBadge({
  difficulty,
}: {
  difficulty: PGNExample["difficulty"];
}) {
  const className =
    difficulty === "débutant"
      ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
      : difficulty ===
          "intermédiaire"
        ? "border-orange-800 bg-orange-950/40 text-orange-300"
        : "border-red-800 bg-red-950/40 text-red-300";

  return (
    <span
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {difficulty}
    </span>
  );
}

function CategoryBadge({
  category,
}: {
  category: PGNExample["category"];
}) {
  const label =
    category === "opening"
      ? "Ouverture"
      : category ===
          "middlegame"
        ? "Milieu de partie"
        : "Finale";

  return (
    <span className="rounded-full border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-300">
      {label}
    </span>
  );
}
