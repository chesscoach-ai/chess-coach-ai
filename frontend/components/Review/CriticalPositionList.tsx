"use client";

import type {
  CriticalPosition,
  MoveClassification,
} from "@/types/guidedReview";

type CriticalPositionListProps = {
  positions: CriticalPosition[];
  onStart: (
    startIndex?: number,
  ) => void;
};

export default function CriticalPositionList({
  positions,
  onStart,
}: CriticalPositionListProps) {
  if (positions.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-8 text-center">
        <p className="text-3xl">✓</p>
        <h2 className="mt-3 text-xl font-bold text-white">
          Aucune position critique
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          L’analyse n’a trouvé aucune
          erreur correspondant aux seuils
          sélectionnés.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
            Révision guidée
          </p>
          <h2 className="mt-1 text-2xl font-bold text-white">
            {positions.length} position
            {positions.length > 1
              ? "s"
              : ""}{" "}
            à retravailler
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Retrouve le meilleur coup avant
            d’afficher la solution expliquée.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onStart(0)}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
        >
          Commencer la session
        </button>
      </header>

      <div className="grid gap-3">
        {positions.map(
          (position, index) => (
            <article
              key={position.id}
              className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-950/60 p-5 md:flex-row md:items-center"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 font-bold text-gray-300">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ClassificationBadge
                    classification={
                      position.classification
                    }
                  />
                  <span className="text-xs font-semibold text-gray-500">
                    Coup {position.moveNumber}
                    {position.sideToMove ===
                    "black"
                      ? "…"
                      : "."}
                  </span>
                  <span className="text-xs text-gray-600">
                    Perte estimée :
                    {" "}
                    {formatPawnLoss(
                      position.evaluationLossCp,
                    )}
                  </span>
                </div>

                <h3 className="mt-2 font-bold text-white">
                  {position.playedMoveSan ??
                    position.playedMoveUci}
                </h3>

                <p className="mt-1 text-sm text-gray-400">
                  {position.explanation ??
                    "Trouve une meilleure continuation dans cette position."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  onStart(index)
                }
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:border-blue-700 hover:bg-blue-950/20"
              >
                Retravailler
              </button>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

function ClassificationBadge({
  classification,
}: {
  classification: MoveClassification;
}) {
  const label =
    classification === "blunder"
      ? "Gaffe"
      : classification === "mistake"
        ? "Erreur"
        : "Imprécision";

  return (
    <span className="rounded-full border border-red-900/70 bg-red-950/35 px-2.5 py-1 text-[11px] font-bold text-red-300">
      {label}
    </span>
  );
}

function formatPawnLoss(
  cp: number,
): string {
  return `${(cp / 100).toFixed(1)} pion${
    cp >= 200 ? "s" : ""
  }`;
}
