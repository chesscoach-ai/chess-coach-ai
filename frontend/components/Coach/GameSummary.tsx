"use client";

import { useMemo, useState } from "react";

import type {
  MoveClassification,
  MoveReviewResponse,
} from "@/services/api/ApiService";
import CoachMentorMessage from "@/components/Coach/CoachMentorMessage";

type GameSummaryProps = {
  moveReviews: Record<
    number,
    MoveReviewResponse
  >;
  totalMoves: number;
  selectedMoveIndex?: number | null;
  onMoveSelect?: (moveIndex: number) => void;
};

type ClassificationCount = Record<
  MoveClassification,
  number
>;

type MoveSideFilter =
  | "all"
  | "white"
  | "black";

const SIDE_FILTERS: Array<{
  value: MoveSideFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "Tous",
  },
  {
    value: "white",
    label: "Blancs",
  },
  {
    value: "black",
    label: "Noirs",
  },
];

const CLASSIFICATIONS: Array<{
  classification: MoveClassification;
  label: string;
}> = [
  {
    classification: "excellent",
    label: "Excellents",
  },
  {
    classification: "good",
    label: "Bons",
  },
  {
    classification: "inaccuracy",
    label: "Imprécisions",
  },
  {
    classification: "mistake",
    label: "Erreurs",
  },
  {
    classification: "blunder",
    label: "Gaffes",
  },
];

export default function GameSummary({
  moveReviews,
  totalMoves,
  selectedMoveIndex = null,
  onMoveSelect,
}: GameSummaryProps) {
  const [sideFilter, setSideFilter] =
    useState<MoveSideFilter>("all");

  const allReviewEntries = useMemo(
    () =>
      Object.entries(moveReviews)
        .map(
          ([indexAsString, review]) => ({
            moveIndex: Number(
              indexAsString,
            ),
            review,
          }),
        )
        .filter(
          ({ moveIndex, review }) =>
            Number.isInteger(moveIndex) &&
            moveIndex >= 0 &&
            moveIndex < totalMoves &&
            isValidReview(review),
        )
        .sort(
          (first, second) =>
            first.moveIndex -
            second.moveIndex,
        ),
    [moveReviews, totalMoves],
  );

  const reviewEntries = useMemo(
    () =>
      allReviewEntries.filter(
        ({ moveIndex }) =>
          matchesSideFilter(
            moveIndex,
            sideFilter,
          ),
      ),
    [allReviewEntries, sideFilter],
  );

  const reviews = reviewEntries.map(
    ({ review }) => review,
  );

  const filteredTotalMoves =
    getFilteredMoveCount(
      totalMoves,
      sideFilter,
    );

  const analysedMoves = reviewEntries.length;
  const isAnalysisComplete =
    analysedMoves >= filteredTotalMoves &&
    filteredTotalMoves > 0;

  const analysisProgress =
    filteredTotalMoves > 0
      ? Math.min(
          100,
          Math.round(
            (analysedMoves /
              filteredTotalMoves) *
              100,
          ),
        )
      : 0;

  const classificationCounts =
    getClassificationCounts(reviews);

  const averageLoss =
    getAverageEvaluationLoss(reviews);

  const accuracy =
    getEstimatedAccuracy(reviews);

  const bestMoveRate =
    getBestMoveRate(reviews);

  const criticalMoveIndexes =
    getCriticalMoveIndexes(reviewEntries);

  const firstCriticalMoveIndex =
    criticalMoveIndexes[0] ?? null;

  const selectedCriticalPosition =
    selectedMoveIndex !== null
      ? criticalMoveIndexes.indexOf(
          selectedMoveIndex,
        )
      : -1;

  if (totalMoves <= 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Bilan du coach
          </p>

          <h2 className="mt-1 text-xl font-bold text-white">
            Performance de la partie
          </h2>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {analysedMoves > 0
              ? `${accuracy} %`
              : "—"}
          </p>

          <p className="text-xs text-gray-500">
            Précision estimée
            {!isAnalysisComplete &&
              analysedMoves > 0 &&
              " provisoire"}
          </p>
        </div>
      </div>

      <SideFilter
        value={sideFilter}
        onChange={setSideFilter}
      />

      {!isAnalysisComplete && (
        <AnalysisProgress
          analysedMoves={analysedMoves}
          totalMoves={filteredTotalMoves}
          progress={analysisProgress}
        />
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Perte moyenne"
          value={
            analysedMoves > 0
              ? formatPawnLoss(averageLoss)
              : "—"
          }
        />

        <SummaryStat
          label="Meilleurs coups"
          value={
            analysedMoves > 0
              ? `${bestMoveRate} %`
              : "—"
          }
        />

        <SummaryStat
          label="Coups analysés"
          value={`${analysedMoves}/${filteredTotalMoves}`}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {CLASSIFICATIONS.map(
          ({ classification, label }) => (
            <ClassificationStat
              key={classification}
              classification={classification}
              label={label}
              count={
                classificationCounts[
                  classification
                ]
              }
            />
          ),
        )}
      </div>

      {analysedMoves > 0 ? (
        <CoachSummary
          counts={classificationCounts}
          averageLoss={averageLoss}
          accuracy={accuracy}
          analysedMoves={analysedMoves}
          totalMoves={filteredTotalMoves}
        />
      ) : (
        <EmptySummary />
      )}

      {firstCriticalMoveIndex !== null &&
        onMoveSelect && (
          <CriticalMoveNavigation
            criticalMoveIndexes={
              criticalMoveIndexes
            }
            selectedCriticalPosition={
              selectedCriticalPosition
            }
            onMoveSelect={onMoveSelect}
          />
        )}
    </section>
  );
}

function CriticalMoveNavigation({
  criticalMoveIndexes,
  selectedCriticalPosition,
  onMoveSelect,
}: {
  criticalMoveIndexes: number[];
  selectedCriticalPosition: number;
  onMoveSelect: (moveIndex: number) => void;
}) {
  const hasSelectedCriticalMove =
    selectedCriticalPosition >= 0;

  const previousPosition =
    hasSelectedCriticalMove
      ? Math.max(
          0,
          selectedCriticalPosition - 1,
        )
      : 0;

  const nextPosition =
    hasSelectedCriticalMove
      ? Math.min(
          criticalMoveIndexes.length - 1,
          selectedCriticalPosition + 1,
        )
      : 0;

  return (
    <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-100">
            Coups à revoir
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {criticalMoveIndexes.length}{" "}
            {criticalMoveIndexes.length === 1
              ? "coup important détecté"
              : "coups importants détectés"}
          </p>
        </div>

        {hasSelectedCriticalMove && (
          <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs font-medium text-gray-300">
            {selectedCriticalPosition + 1}/
            {criticalMoveIndexes.length}
          </span>
        )}
      </div>

      {!hasSelectedCriticalMove ? (
        <button
          type="button"
          onClick={() => {
            onMoveSelect(
              criticalMoveIndexes[0],
            );
          }}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          Voir la première erreur importante
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={
              selectedCriticalPosition <= 0
            }
            onClick={() => {
              onMoveSelect(
                criticalMoveIndexes[
                  previousPosition
                ],
              );
            }}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Erreur précédente
          </button>

          <button
            type="button"
            disabled={
              selectedCriticalPosition >=
              criticalMoveIndexes.length - 1
            }
            onClick={() => {
              onMoveSelect(
                criticalMoveIndexes[
                  nextPosition
                ],
              );
            }}
            className="rounded-lg border border-blue-800 bg-blue-950/30 px-3 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Erreur suivante
          </button>
        </div>
      )}
    </div>
  );
}

function SideFilter({
  value,
  onChange,
}: {
  value: MoveSideFilter;
  onChange: (
    value: MoveSideFilter,
  ) => void;
}) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Joueur analysé
      </p>

      <div className="grid grid-cols-3 gap-2 rounded-xl border border-gray-800 bg-gray-950/40 p-1.5">
        {SIDE_FILTERS.map((filter) => {
          const isActive =
            filter.value === value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                onChange(filter.value);
              }}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-gray-800 text-white shadow-sm"
                  : "text-gray-400 hover:bg-gray-900 hover:text-gray-200",
              ].join(" ")}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AnalysisProgress({
  analysedMoves,
  totalMoves,
  progress,
}: {
  analysedMoves: number;
  totalMoves: number;
  progress: number;
}) {
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-gray-500">
          Progression de l’analyse
        </span>

        <span className="font-medium text-gray-300">
          {analysedMoves} sur {totalMoves}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-gray-100">
        {value}
      </p>
    </div>
  );
}

function ClassificationStat({
  classification,
  label,
  count,
}: {
  classification: MoveClassification;
  label: string;
  count: number;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-3",
        getClassificationCardClassName(
          classification,
        ),
      ].join(" ")}
    >
      <p className="text-2xl font-bold">
        {count}
      </p>

      <p className="mt-1 text-xs font-medium">
        {label}
      </p>
    </div>
  );
}

function CoachSummary({
  counts,
  averageLoss,
  accuracy,
  analysedMoves,
  totalMoves,
}: {
  counts: ClassificationCount;
  averageLoss: number;
  accuracy: number;
  analysedMoves: number;
  totalMoves: number;
}) {
  const message = buildCoachSummary(
    counts,
    averageLoss,
    accuracy,
  );

  return (
    <div className="mt-5">
      <CoachMentorMessage
        compact
        title={
          analysedMoves >= totalMoves
            ? "Voilà ce que je retiens de ta partie."
            : "Je commence à voir une tendance."
        }
      >
        {message}
      </CoachMentorMessage>
    </div>
  );
}

function EmptySummary() {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-gray-700 bg-gray-950/30 p-4">
      <p className="text-sm leading-6 text-gray-400">
        Lance l’analyse de la partie pour
        obtenir les statistiques et les
        conseils du coach.
      </p>
    </div>
  );
}

function isValidReview(
  review: MoveReviewResponse,
): boolean {
  return (
    review !== null &&
    typeof review === "object" &&
    typeof review.classification ===
      "string" &&
    typeof review.evaluation_loss ===
      "number"
  );
}

function matchesSideFilter(
  moveIndex: number,
  sideFilter: MoveSideFilter,
): boolean {
  if (sideFilter === "all") {
    return true;
  }

  const isWhiteMove =
    moveIndex % 2 === 0;

  return sideFilter === "white"
    ? isWhiteMove
    : !isWhiteMove;
}

function getFilteredMoveCount(
  totalMoves: number,
  sideFilter: MoveSideFilter,
): number {
  if (sideFilter === "all") {
    return totalMoves;
  }

  if (sideFilter === "white") {
    return Math.ceil(totalMoves / 2);
  }

  return Math.floor(totalMoves / 2);
}

function getClassificationCounts(
  reviews: MoveReviewResponse[],
): ClassificationCount {
  const counts: ClassificationCount = {
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  reviews.forEach((review) => {
    if (
      Object.prototype.hasOwnProperty.call(
        counts,
        review.classification,
      )
    ) {
      counts[review.classification] += 1;
    }
  });

  return counts;
}

function getAverageEvaluationLoss(
  reviews: MoveReviewResponse[],
): number {
  if (reviews.length === 0) {
    return 0;
  }

  const totalLoss = reviews.reduce(
    (sum, review) =>
      sum +
      normalizeEvaluationLoss(
        review.evaluation_loss,
      ),
    0,
  );

  return totalLoss / reviews.length;
}

function getBestMoveRate(
  reviews: MoveReviewResponse[],
): number {
  if (reviews.length === 0) {
    return 0;
  }

  const bestMoves = reviews.filter(
    (review) => review.is_best_move,
  ).length;

  return Math.round(
    (bestMoves / reviews.length) * 100,
  );
}

function getEstimatedAccuracy(
  reviews: MoveReviewResponse[],
): number {
  if (reviews.length === 0) {
    return 0;
  }

  const totalAccuracy = reviews.reduce(
    (sum, review) => {
      const loss =
        normalizeEvaluationLoss(
          review.evaluation_loss,
        );

      return (
        sum +
        100 * Math.exp(-0.45 * loss)
      );
    },
    0,
  );

  return clamp(
    Math.round(
      totalAccuracy / reviews.length,
    ),
    0,
    100,
  );
}

function getCriticalMoveIndexes(
  entries: Array<{
    moveIndex: number;
    review: MoveReviewResponse;
  }>,
): number[] {
  const criticalClassifications =
    new Set<MoveClassification>([
      "blunder",
      "mistake",
      "inaccuracy",
    ]);

  return entries
    .filter(({ review }) =>
      criticalClassifications.has(
        review.classification,
      ),
    )
    .map(({ moveIndex }) => moveIndex)
    .sort(
      (firstIndex, secondIndex) =>
        firstIndex - secondIndex,
    );
}

function buildCoachSummary(
  counts: ClassificationCount,
  averageLoss: number,
  accuracy: number,
): string {
  if (counts.blunder > 0) {
    return counts.blunder === 1
      ? "La partie contient une gaffe qui a fortement influencé l’évaluation. Vérifie systématiquement les menaces adverses et les pièces non protégées avant de jouer."
      : `La partie contient ${counts.blunder} gaffes qui ont fortement influencé l’évaluation. Vérifie systématiquement les menaces adverses et les pièces non protégées avant de jouer.`;
  }

  if (counts.mistake > 0) {
    return counts.mistake === 1
      ? "La partie est globalement correcte, mais une erreur a coûté une partie de l’avantage. Compare au moins deux coups candidats avant chaque décision importante."
      : `La partie est globalement correcte, mais ${counts.mistake} erreurs ont coûté une partie de l’avantage. Compare au moins deux coups candidats avant chaque décision importante.`;
  }

  if (
    counts.inaccuracy > 0 ||
    averageLoss > 0.25
  ) {
    return "La position est restée jouable, mais plusieurs choix pouvaient être plus précis. Recherche les coups actifs, les menaces immédiates et les améliorations de pièces.";
  }

  if (accuracy >= 90) {
    return "Très bonne partie : tes décisions sont cohérentes et ton plan résiste très bien à l’analyse du Coach IA.";
  }

  return "La partie est solide dans l’ensemble. Étudie les variantes proposées pour comprendre pourquoi certains coups étaient légèrement meilleurs.";
}

function normalizeEvaluationLoss(
  value: number,
): number {
  return Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function formatPawnLoss(
  value: number,
): string {
  const safeValue =
    normalizeEvaluationLoss(value);

  return `${safeValue
    .toFixed(2)
    .replace(".", ",")} ${
    Math.abs(safeValue - 1) < 0.005
      ? "pion"
      : "pions"
  }`;
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

function getClassificationCardClassName(
  classification: MoveClassification,
): string {
  switch (classification) {
    case "excellent":
      return "border-emerald-900 bg-emerald-950/30 text-emerald-300";
    case "good":
      return "border-green-900 bg-green-950/30 text-green-300";
    case "inaccuracy":
      return "border-yellow-900 bg-yellow-950/30 text-yellow-300";
    case "mistake":
      return "border-orange-900 bg-orange-950/30 text-orange-300";
    case "blunder":
      return "border-red-900 bg-red-950/30 text-red-300";
  }
}
