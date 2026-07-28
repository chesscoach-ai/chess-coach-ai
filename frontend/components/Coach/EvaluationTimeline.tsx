"use client";

import { useMemo } from "react";

import type {
  MoveReviewResponse,
} from "@/services/api/ApiService";

type EvaluationTimelineProps = {
  moveReviews: Record<
    number,
    MoveReviewResponse
  >;
  totalMoves: number;
  selectedMoveIndex: number | null;
  onMoveSelect: (moveIndex: number) => void;
};

type TimelinePoint = {
  moveIndex: number;
  evaluation: number;
  x: number;
  y: number;
};

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 240;
const PADDING_X = 24;
const PADDING_Y = 22;
const MAX_DISPLAY_EVALUATION = 6;

export default function EvaluationTimeline({
  moveReviews,
  totalMoves,
  selectedMoveIndex,
  onMoveSelect,
}: EvaluationTimelineProps) {
  const points = useMemo(
    () =>
      buildTimelinePoints(
        moveReviews,
        totalMoves,
      ),
    [moveReviews, totalMoves],
  );

  const linePath = useMemo(
    () => buildLinePath(points),
    [points],
  );

  const areaPath = useMemo(
    () => buildAreaPath(points),
    [points],
  );

  const selectedPoint =
    selectedMoveIndex === null
      ? null
      : points.find(
          (point) =>
            point.moveIndex ===
            selectedMoveIndex,
        ) ?? null;

  if (totalMoves <= 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg">
      <div className="border-b border-gray-800 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">
              Courbe d’évaluation
            </p>

            <p className="mt-1 text-xs leading-5 text-gray-400">
              Clique sur un point pour afficher
              la position correspondante.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-[11px] text-gray-400">
            <LegendDot
              className="bg-gray-100"
              label="Blancs"
            />
            <LegendDot
              className="bg-gray-950 ring-1 ring-gray-600"
              label="Noirs"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        {points.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-950/40 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-300">
              Aucune évaluation disponible
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Lance l’analyse complète pour
              construire la courbe.
            </p>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
              <svg
                viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                className="block h-auto w-full"
                role="img"
                aria-label="Évolution de l’évaluation au cours de la partie"
              >
                <defs>
                  <linearGradient
                    id="evaluation-area"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="rgba(255,255,255,0.25)"
                    />
                    <stop
                      offset="100%"
                      stopColor="rgba(255,255,255,0.02)"
                    />
                  </linearGradient>
                </defs>

                <rect
                  x="0"
                  y="0"
                  width={VIEWBOX_WIDTH}
                  height={VIEWBOX_HEIGHT / 2}
                  fill="rgba(255,255,255,0.04)"
                />

                <rect
                  x="0"
                  y={VIEWBOX_HEIGHT / 2}
                  width={VIEWBOX_WIDTH}
                  height={VIEWBOX_HEIGHT / 2}
                  fill="rgba(0,0,0,0.18)"
                />

                {[-3, 0, 3].map(
                  (evaluation) => {
                    const y =
                      evaluationToY(
                        evaluation,
                      );

                    return (
                      <g key={evaluation}>
                        <line
                          x1={PADDING_X}
                          y1={y}
                          x2={
                            VIEWBOX_WIDTH -
                            PADDING_X
                          }
                          y2={y}
                          stroke={
                            evaluation === 0
                              ? "rgba(148,163,184,0.55)"
                              : "rgba(75,85,99,0.45)"
                          }
                          strokeWidth={
                            evaluation === 0
                              ? 1.5
                              : 1
                          }
                          strokeDasharray={
                            evaluation === 0
                              ? undefined
                              : "5 6"
                          }
                        />

                        <text
                          x={6}
                          y={y + 4}
                          fill="rgba(156,163,175,0.8)"
                          fontSize="11"
                        >
                          {evaluation > 0
                            ? `+${evaluation}`
                            : evaluation}
                        </text>
                      </g>
                    );
                  },
                )}

                {areaPath && (
                  <path
                    d={areaPath}
                    fill="url(#evaluation-area)"
                  />
                )}

                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="rgba(96,165,250,0.95)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {points.map((point) => {
                  const isSelected =
                    point.moveIndex ===
                    selectedMoveIndex;

                  return (
                    <button
                      key={point.moveIndex}
                      type="button"
                      onClick={() => {
                        onMoveSelect(
                          point.moveIndex,
                        );
                      }}
                      aria-label={`Afficher le coup ${
                        point.moveIndex + 1
                      }, évaluation ${formatEvaluation(
                        point.evaluation,
                      )}`}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isSelected ? 7 : 4}
                        fill={
                          isSelected
                            ? "rgb(250,204,21)"
                            : point.evaluation >= 0
                              ? "rgb(243,244,246)"
                              : "rgb(17,24,39)"
                        }
                        stroke={
                          isSelected
                            ? "rgb(253,224,71)"
                            : "rgb(96,165,250)"
                        }
                        strokeWidth={
                          isSelected ? 3 : 2
                        }
                        className="cursor-pointer transition-all"
                      />
                    </button>
                  );
                })}

                {selectedPoint && (
                  <line
                    x1={selectedPoint.x}
                    y1={PADDING_Y}
                    x2={selectedPoint.x}
                    y2={
                      VIEWBOX_HEIGHT -
                      PADDING_Y
                    }
                    stroke="rgba(250,204,21,0.5)"
                    strokeWidth="1.5"
                    strokeDasharray="4 5"
                    pointerEvents="none"
                  />
                )}
              </svg>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-xs">
              <span className="text-gray-500">
                {points.length} coup
                {points.length > 1 ? "s" : ""}{" "}
                analysé
                {points.length > 1 ? "s" : ""}
              </span>

              {selectedPoint && (
                <span className="rounded-lg border border-yellow-800/70 bg-yellow-950/30 px-3 py-1.5 font-mono font-semibold text-yellow-200">
                  Coup{" "}
                  {selectedPoint.moveIndex + 1} ·{" "}
                  {formatEvaluation(
                    selectedPoint.evaluation,
                  )}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function LegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={`h-2.5 w-2.5 rounded-full ${className}`}
      />
      {label}
    </span>
  );
}

function buildTimelinePoints(
  moveReviews: Record<
    number,
    MoveReviewResponse
  >,
  totalMoves: number,
): TimelinePoint[] {
  if (totalMoves <= 0) {
    return [];
  }

  return Object.entries(moveReviews)
    .map(([index, review]) => {
      const moveIndex = Number(index);

      if (
        !Number.isInteger(moveIndex) ||
        moveIndex < 0 ||
        moveIndex >= totalMoves
      ) {
        return null;
      }

      const evaluation =
        normalizeEvaluation(review);

      const x =
        totalMoves <= 1
          ? VIEWBOX_WIDTH / 2
          : PADDING_X +
            (moveIndex /
              (totalMoves - 1)) *
              (VIEWBOX_WIDTH -
                PADDING_X * 2);

      return {
        moveIndex,
        evaluation,
        x,
        y: evaluationToY(evaluation),
      };
    })
    .filter(
      (
        point,
      ): point is TimelinePoint =>
        point !== null,
    )
    .sort(
      (first, second) =>
        first.moveIndex - second.moveIndex,
    );
}

function normalizeEvaluation(
  review: MoveReviewResponse,
): number {
  if (
    review.evaluation_after_type ===
    "mate"
  ) {
    if (review.evaluation_after > 0) {
      return MAX_DISPLAY_EVALUATION;
    }

    if (review.evaluation_after < 0) {
      return -MAX_DISPLAY_EVALUATION;
    }

    return 0;
  }

  return clamp(
    review.evaluation_after,
    -MAX_DISPLAY_EVALUATION,
    MAX_DISPLAY_EVALUATION,
  );
}

function evaluationToY(
  evaluation: number,
): number {
  const usableHeight =
    VIEWBOX_HEIGHT - PADDING_Y * 2;

  const normalized =
    (MAX_DISPLAY_EVALUATION -
      clamp(
        evaluation,
        -MAX_DISPLAY_EVALUATION,
        MAX_DISPLAY_EVALUATION,
      )) /
    (MAX_DISPLAY_EVALUATION * 2);

  return (
    PADDING_Y + normalized * usableHeight
  );
}

function buildLinePath(
  points: TimelinePoint[],
): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map(
      (point, index) =>
        `${
          index === 0 ? "M" : "L"
        } ${point.x.toFixed(
          2,
        )} ${point.y.toFixed(2)}`,
    )
    .join(" ");
}

function buildAreaPath(
  points: TimelinePoint[],
): string {
  if (points.length < 2) {
    return "";
  }

  const baseline =
    evaluationToY(0);
  const first = points[0];
  const last =
    points[points.length - 1];

  return [
    `M ${first.x.toFixed(
      2,
    )} ${baseline.toFixed(2)}`,
    ...points.map(
      (point) =>
        `L ${point.x.toFixed(
          2,
        )} ${point.y.toFixed(2)}`,
    ),
    `L ${last.x.toFixed(
      2,
    )} ${baseline.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function formatEvaluation(
  evaluation: number,
): string {
  const normalized =
    Math.abs(evaluation) < 0.005
      ? 0
      : evaluation;

  return `${
    normalized > 0 ? "+" : ""
  }${normalized.toFixed(1)}`;
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
