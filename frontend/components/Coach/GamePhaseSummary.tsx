"use client";

import { useMemo } from "react";

import type {
  MoveReviewResponse,
} from "@/services/api/ApiService";

type MoveDataLike = {
  fenBefore: string;
  fenAfter?: string;
};

type GamePhaseSummaryProps = {
  moveData: MoveDataLike[];
  moveReviews: Record<
    number,
    MoveReviewResponse
  >;
  selectedMoveIndex: number | null;
  onMoveSelect: (moveIndex: number) => void;
};

type GamePhase =
  | "opening"
  | "middlegame"
  | "endgame";

type PhaseResult = {
  phase: GamePhase;
  label: string;
  reviewedMoves: number;
  averageLoss: number;
  accuracy: number;
  criticalMoves: number[];
  bestMoveIndex: number | null;
  worstMoveIndex: number | null;
};

const PHASE_ORDER: GamePhase[] = [
  "opening",
  "middlegame",
  "endgame",
];

export default function GamePhaseSummary({
  moveData,
  moveReviews,
  selectedMoveIndex,
  onMoveSelect,
}: GamePhaseSummaryProps) {
  const phaseResults = useMemo(
    () =>
      calculatePhaseResults(
        moveData,
        moveReviews,
      ),
    [moveData, moveReviews],
  );

  if (moveData.length === 0) {
    return null;
  }

  const reviewedMoves =
    phaseResults.reduce(
      (total, phase) =>
        total + phase.reviewedMoves,
      0,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg">
      <div className="border-b border-gray-800 px-5 py-4">
        <p className="text-sm font-semibold text-white">
          Précision par phase de jeu
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-400">
          Compare ton niveau en ouverture,
          milieu de jeu et finale.
        </p>
      </div>

      <div className="p-5">
        {reviewedMoves === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-950/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-300">
              Aucune phase analysée
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Lance l’analyse complète pour
              obtenir les statistiques.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {phaseResults.map((result) => (
              <PhaseCard
                key={result.phase}
                result={result}
                selectedMoveIndex={
                  selectedMoveIndex
                }
                onMoveSelect={onMoveSelect}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PhaseCard({
  result,
  selectedMoveIndex,
  onMoveSelect,
}: {
  result: PhaseResult;
  selectedMoveIndex: number | null;
  onMoveSelect: (moveIndex: number) => void;
}) {
  const hasData =
    result.reviewedMoves > 0;

  const isSelectedWorstMove =
    selectedMoveIndex !== null &&
    selectedMoveIndex ===
      result.worstMoveIndex;

  return (
    <article className="rounded-xl border border-gray-800 bg-gray-950/45 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold text-white">
              {result.label}
            </p>

            <span
              className={[
                "rounded-full border px-2.5 py-1 text-xs font-bold",
                getAccuracyBadgeClass(
                  result.accuracy,
                  hasData,
                ),
              ].join(" ")}
            >
              {hasData
                ? `${Math.round(
                    result.accuracy,
                  )} %`
                : "Non analysée"}
            </span>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            {hasData
              ? `${result.reviewedMoves} coup${
                  result.reviewedMoves > 1
                    ? "s"
                    : ""
                } analysé${
                  result.reviewedMoves > 1
                    ? "s"
                    : ""
                }`
              : "Aucune donnée disponible"}
          </p>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-4 text-xs">
            <span className="text-gray-500">
              Précision
            </span>

            <span className="font-mono font-semibold text-gray-200">
              {hasData
                ? `${result.accuracy.toFixed(
                    1,
                  )} %`
                : "—"}
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{
                width: `${hasData
                  ? result.accuracy
                  : 0}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <p className="text-gray-400">
              Perte moyenne :{" "}
              <span className="font-mono font-semibold text-gray-100">
                {hasData
                  ? result.averageLoss.toFixed(
                      2,
                    )
                  : "—"}
              </span>
            </p>

            <p className="text-gray-400">
              Erreurs importantes :{" "}
              <span className="font-mono font-semibold text-gray-100">
                {hasData
                  ? result.criticalMoves.length
                  : "—"}
              </span>
            </p>
          </div>
        </div>

        <div className="lg:justify-self-end">
          {hasData &&
          result.worstMoveIndex !== null ? (
            <button
              type="button"
              onClick={() => {
                onMoveSelect(
                  result.worstMoveIndex!,
                );
              }}
              className={[
                "w-full whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-semibold transition lg:w-auto",
                isSelectedWorstMove
                  ? "border-yellow-600 bg-yellow-500/10 text-yellow-200"
                  : "border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800",
              ].join(" ")}
            >
              Voir le pire coup
            </button>
          ) : (
            <span className="text-sm text-gray-600">
              —
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function calculatePhaseResults(
  moveData: MoveDataLike[],
  moveReviews: Record<
    number,
    MoveReviewResponse
  >,
): PhaseResult[] {
  const grouped = new Map<
    GamePhase,
    Array<{
      moveIndex: number;
      review: MoveReviewResponse;
    }>
  >();

  for (const phase of PHASE_ORDER) {
    grouped.set(phase, []);
  }

  Object.entries(moveReviews).forEach(
    ([rawIndex, review]) => {
      const moveIndex = Number(rawIndex);
      const move = moveData[moveIndex];

      if (
        !Number.isInteger(moveIndex) ||
        !move
      ) {
        return;
      }

      const phase =
        detectGamePhase(move.fenBefore);

      grouped.get(phase)?.push({
        moveIndex,
        review,
      });
    },
  );

  return PHASE_ORDER.map((phase) => {
    const entries =
      grouped.get(phase) ?? [];

    if (entries.length === 0) {
      return {
        phase,
        label: getPhaseLabel(phase),
        reviewedMoves: 0,
        averageLoss: 0,
        accuracy: 0,
        criticalMoves: [],
        bestMoveIndex: null,
        worstMoveIndex: null,
      };
    }

    const normalizedEntries =
      entries.map((entry) => ({
        ...entry,
        loss: normalizeLoss(
          entry.review.evaluation_loss,
        ),
      }));

    const totalLoss =
      normalizedEntries.reduce(
        (total, entry) =>
          total + entry.loss,
        0,
      );

    const averageLoss =
      totalLoss /
      normalizedEntries.length;

    const accuracy =
      calculateAccuracy(averageLoss);

    const criticalMoves =
      normalizedEntries
        .filter(
          ({ review, loss }) =>
            isCriticalReview(
              review,
              loss,
            ),
        )
        .map(({ moveIndex }) => moveIndex);

    const sortedByLoss = [
      ...normalizedEntries,
    ].sort(
      (first, second) =>
        first.loss - second.loss,
    );

    return {
      phase,
      label: getPhaseLabel(phase),
      reviewedMoves:
        normalizedEntries.length,
      averageLoss,
      accuracy,
      criticalMoves,
      bestMoveIndex:
        sortedByLoss[0]?.moveIndex ??
        null,
      worstMoveIndex:
        sortedByLoss[
          sortedByLoss.length - 1
        ]?.moveIndex ?? null,
    };
  });
}

function detectGamePhase(
  fen: string,
): GamePhase {
  const boardPart =
    fen.split(" ")[0] ?? "";

  let queens = 0;
  let rooks = 0;
  let bishops = 0;
  let knights = 0;
  let nonPawnMaterial = 0;

  for (const symbol of boardPart) {
    const piece =
      symbol.toLowerCase();

    if (piece === "q") {
      queens += 1;
      nonPawnMaterial += 9;
    } else if (piece === "r") {
      rooks += 1;
      nonPawnMaterial += 5;
    } else if (piece === "b") {
      bishops += 1;
      nonPawnMaterial += 3;
    } else if (piece === "n") {
      knights += 1;
      nonPawnMaterial += 3;
    }
  }

  const minorPieces =
    bishops + knights;

  /*
   * Heuristique volontairement simple :
   * - ouverture : beaucoup de matériel lourd
   *   et plusieurs pièces mineures ;
   * - finale : dames absentes ou matériel
   *   non-pion fortement réduit ;
   * - sinon : milieu de jeu.
   */
  if (
    queens >= 2 &&
    rooks >= 4 &&
    minorPieces >= 6
  ) {
    return "opening";
  }

  if (
    queens === 0 &&
    nonPawnMaterial <= 20
  ) {
    return "endgame";
  }

  if (nonPawnMaterial <= 14) {
    return "endgame";
  }

  return "middlegame";
}

function calculateAccuracy(
  averageLoss: number,
): number {
  /*
   * Conversion pédagogique et stable :
   * 0.00 de perte -> 100 %
   * 0.50 -> environ 82 %
   * 1.00 -> environ 67 %
   * 2.00 -> environ 45 %
   */
  const accuracy =
    100 * Math.exp(-averageLoss / 2.5);

  return clamp(accuracy, 0, 100);
}

function normalizeLoss(
  loss: number,
): number {
  if (!Number.isFinite(loss)) {
    return 0;
  }

  return Math.max(0, loss);
}

function isCriticalReview(
  review: MoveReviewResponse,
  loss: number,
): boolean {
  return (
    loss >= 1 ||
    review.classification ===
      "mistake" ||
    review.classification ===
      "blunder"
  );
}

function getPhaseLabel(
  phase: GamePhase,
): string {
  switch (phase) {
    case "opening":
      return "Ouverture";
    case "middlegame":
      return "Milieu de jeu";
    case "endgame":
      return "Finale";
  }
}

function getAccuracyBadgeClass(
  accuracy: number,
  hasData: boolean,
): string {
  if (!hasData) {
    return "border-gray-700 bg-gray-800 text-gray-400";
  }

  if (accuracy >= 90) {
    return "border-emerald-800 bg-emerald-950/40 text-emerald-300";
  }

  if (accuracy >= 75) {
    return "border-blue-800 bg-blue-950/40 text-blue-300";
  }

  if (accuracy >= 55) {
    return "border-yellow-800 bg-yellow-950/40 text-yellow-300";
  }

  return "border-red-800 bg-red-950/40 text-red-300";
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}
