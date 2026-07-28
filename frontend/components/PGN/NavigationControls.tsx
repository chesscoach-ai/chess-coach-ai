"use client";

type NavigationControlsProps = {
  currentMoveIndex: number;
  totalMoves: number;
  onStart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onEnd: () => void;
};

export default function NavigationControls({
  currentMoveIndex,
  totalMoves,
  onStart,
  onPrevious,
  onNext,
  onEnd,
}: NavigationControlsProps) {
  const isAtStart = currentMoveIndex === 0;
  const isAtEnd = currentMoveIndex === totalMoves;

  const buttonClassName =
    "rounded-lg bg-gray-800 px-4 py-2 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Navigation</h2>

          <p className="mt-1 text-sm text-gray-400">
            Position {currentMoveIndex} sur {totalMoves}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={isAtStart}
            className={buttonClassName}
            aria-label="Revenir au début"
            title="Début"
          >
            |&lt;
          </button>

          <button
            type="button"
            onClick={onPrevious}
            disabled={isAtStart}
            className={buttonClassName}
            aria-label="Afficher le coup précédent"
            title="Coup précédent"
          >
            &lt;
          </button>

          <button
            type="button"
            onClick={onNext}
            disabled={isAtEnd}
            className={buttonClassName}
            aria-label="Afficher le coup suivant"
            title="Coup suivant"
          >
            &gt;
          </button>

          <button
            type="button"
            onClick={onEnd}
            disabled={isAtEnd}
            className={buttonClassName}
            aria-label="Aller à la fin"
            title="Fin"
          >
            &gt;|
          </button>
        </div>
      </div>
    </section>
  );
}