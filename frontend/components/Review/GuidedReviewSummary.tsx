"use client";

import type {
  CriticalPosition,
  GuidedReviewSessionResult,
} from "@/types/guidedReview";

type GuidedReviewSummaryProps = {
  positions: CriticalPosition[];
  result: GuidedReviewSessionResult;
  onRestartMistakes: (
    positions: CriticalPosition[],
  ) => void;
  onClose: () => void;
};

export default function GuidedReviewSummary({
  positions,
  result,
  onRestartMistakes,
  onClose,
}: GuidedReviewSummaryProps) {
  const failedIds = new Set(
    result.results
      .filter(
        (item) =>
          !item.solved ||
          item.revealed,
      )
      .map(
        (item) => item.positionId,
      ),
  );

  const positionsToRetry =
    positions.filter((position) =>
      failedIds.has(position.id),
    );

  const successRate =
    result.totalPositions === 0
      ? 0
      : Math.round(
          (result.solvedWithoutReveal /
            result.totalPositions) *
            100,
        );

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 text-center">
        <p className="text-4xl">
          {successRate >= 80
            ? "🏆"
            : successRate >= 50
              ? "♟"
              : "🎯"}
        </p>

        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
          Session terminée
        </p>

        <h2 className="mt-1 text-3xl font-bold text-white">
          {successRate}% de réussite
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
          Les positions révélées restent à
          retravailler pour valider leur
          maîtrise.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Positions"
          value={result.totalPositions}
        />
        <Metric
          label="Réussies"
          value={
            result.solvedWithoutReveal
          }
        />
        <Metric
          label="Solutions vues"
          value={
            result.revealedSolutions
          }
        />
        <Metric
          label="Tentatives moy."
          value={result.averageAttempts}
        />
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-950/65 p-5">
        <h3 className="font-bold text-white">
          Détail de la session
        </h3>

        <div className="mt-4 divide-y divide-gray-800">
          {positions.map(
            (position, index) => {
              const item =
                result.results.find(
                  (entry) =>
                    entry.positionId ===
                    position.id,
                );

              const mastered =
                item?.solved &&
                !item.revealed;

              return (
                <div
                  key={position.id}
                  className="flex items-center gap-4 py-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-sm font-bold text-gray-400">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-200">
                      Coup{" "}
                      {position.moveNumber}
                      {position.sideToMove ===
                      "black"
                        ? "…"
                        : "."}{" "}
                      —{" "}
                      {position.playedMoveSan ??
                        position.playedMoveUci}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item?.attempts.length ??
                        0}{" "}
                      tentative
                      {(item?.attempts
                        .length ?? 0) > 1
                        ? "s"
                        : ""}
                      {" · "}
                      {item?.hintsUsed ?? 0}{" "}
                      indice
                      {(item?.hintsUsed ??
                        0) > 1
                        ? "s"
                        : ""}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-bold",
                      mastered
                        ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                        : "border-amber-900 bg-amber-950/30 text-amber-300",
                    ].join(" ")}
                  >
                    {mastered
                      ? "Maîtrisée"
                      : "À revoir"}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800"
        >
          Retour au rapport
        </button>

        {positionsToRetry.length >
          0 && (
          <button
            type="button"
            onClick={() =>
              onRestartMistakes(
                positionsToRetry,
              )
            }
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500"
          >
            Recommencer les erreurs
          </button>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/65 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}
