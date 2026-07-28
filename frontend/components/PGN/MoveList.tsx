"use client";

import type {
  MoveClassification,
  MoveReviewResponse,
} from "@/services/api/ApiService";

type MoveListProps = {
  moves: string[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;

  moveReviews?: Record<number, MoveReviewResponse>;
  reviewingMoveIndex?: number | null;
};

type MoveItem = {
  san: string;
  index: number;
};

type MovePair = {
  moveNumber: number;
  white?: MoveItem;
  black?: MoveItem;
};

export default function MoveList({
  moves,
  currentMoveIndex,
  onMoveClick,
  moveReviews = {},
  reviewingMoveIndex = null,
}: MoveListProps) {
  if (moves.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-xl font-bold text-white">
          Coups joués
        </h2>

        <p className="mt-3 text-sm text-gray-400">
          Aucun coup n’a encore été joué.
        </p>
      </section>
    );
  }

  const movePairs: MovePair[] = [];

  for (
    let index = 0;
    index < moves.length;
    index += 2
  ) {
    movePairs.push({
      moveNumber: index / 2 + 1,

      white: {
        san: moves[index],
        index,
      },

      black: moves[index + 1]
        ? {
            san: moves[index + 1],
            index: index + 1,
          }
        : undefined,
    });
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">
          Coups joués
        </h2>

        <span className="text-sm text-gray-500">
          {moves.length} demi-coups
        </span>
      </div>

      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-2">
        {movePairs.map(
          ({
            moveNumber,
            white,
            black,
          }) => (
            <div
              key={moveNumber}
              className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2"
            >
              <span className="pt-3 text-sm font-semibold text-gray-500">
                {moveNumber}.
              </span>

              {white && (
                <MoveButton
                  move={white}
                  currentMoveIndex={
                    currentMoveIndex
                  }
                  review={
                    moveReviews[white.index]
                  }
                  isReviewing={
                    reviewingMoveIndex ===
                    white.index
                  }
                  onMoveClick={onMoveClick}
                />
              )}

              {black ? (
                <MoveButton
                  move={black}
                  currentMoveIndex={
                    currentMoveIndex
                  }
                  review={
                    moveReviews[black.index]
                  }
                  isReviewing={
                    reviewingMoveIndex ===
                    black.index
                  }
                  onMoveClick={onMoveClick}
                />
              ) : (
                <span />
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

type MoveButtonProps = {
  move: MoveItem;
  currentMoveIndex: number;
  review?: MoveReviewResponse;
  isReviewing: boolean;
  onMoveClick: (index: number) => void;
};

function MoveButton({
  move,
  currentMoveIndex,
  review,
  isReviewing,
  onMoveClick,
}: MoveButtonProps) {
  const positionIndex = move.index + 1;
  const isCurrent =
    currentMoveIndex === positionIndex;

  return (
    <button
      type="button"
      onClick={() =>
        onMoveClick(positionIndex)
      }
      className={getMoveClassName(
        isCurrent,
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate font-semibold">
          {move.san}
        </span>

        {isReviewing && (
          <span
            aria-label="Analyse en cours"
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gray-600 border-t-blue-300"
          />
        )}
      </span>

      {review && (
        <ClassificationLabel
          classification={
            review.classification
          }
          label={
            review.classification_label
          }
        />
      )}

      {!review && !isReviewing && (
        <span className="mt-1 block text-[11px] font-normal text-gray-500">
          Non analysé
        </span>
      )}
    </button>
  );
}

function ClassificationLabel({
  classification,
  label,
}: {
  classification: MoveClassification;
  label: string;
}) {
  return (
    <span
      className={[
        "mt-1 block truncate text-[11px] font-semibold",
        getClassificationTextClassName(
          classification,
        ),
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function getMoveClassName(
  isCurrent: boolean,
): string {
  return [
    "min-w-0 rounded-lg border px-3 py-2 text-left text-sm transition",
    isCurrent
      ? "border-blue-500 bg-blue-600 text-white"
      : "border-transparent bg-gray-800 text-gray-200 hover:border-gray-700 hover:bg-gray-700",
  ].join(" ");
}

function getClassificationTextClassName(
  classification: MoveClassification,
): string {
  switch (classification) {
    case "excellent":
      return "text-emerald-400";

    case "good":
      return "text-green-400";

    case "inaccuracy":
      return "text-yellow-400";

    case "mistake":
      return "text-orange-400";

    case "blunder":
      return "text-red-400";
  }
}