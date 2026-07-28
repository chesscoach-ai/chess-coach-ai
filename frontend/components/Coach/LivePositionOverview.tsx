"use client";

import type {
  MoveAnalysis,
  MoveReviewResponse,
  PositionAnalysisResponse,
} from "@/services/api/ApiService";
import {
  explainPlayedMove,
  formatEngineEvaluation,
} from "@/lib/chess/pedagogy";
import type { AiPersonaId } from "@/lib/ai/opponents";

type Props = {
  review: MoveReviewResponse | null;
  positionAnalysis:
    | PositionAnalysisResponse
    | null;
  isReviewLoading: boolean;
  isPositionLoading?: boolean;
  selectedMove?: string | null;
  coachPersonaId?: AiPersonaId;
  onMoveSelect?: (move: MoveAnalysis) => void;
  livePrecision?: {
    accuracy: number | null;
    reviewedMoveCount: number;
    impact: number | null;
    impactKey: string;
  };
};

export default function LivePositionOverview({
  review,
  positionAnalysis,
  isReviewLoading,
  isPositionLoading = false,
  selectedMove = null,
  coachPersonaId = "balanced",
  onMoveSelect,
  livePrecision,
}: Props) {
  return (
    <section className="space-y-4">
      <LastMoveSummary
        review={review}
        isLoading={isReviewLoading}
        coachPersonaId={coachPersonaId}
      />

      <LivePrecisionCard
        accuracy={
          livePrecision?.accuracy ??
          null
        }
        reviewedMoveCount={
          livePrecision?.reviewedMoveCount ??
          0
        }
        impact={
          livePrecision?.impact ?? null
        }
        impactKey={
          livePrecision?.impactKey ??
          "empty"
        }
      />

      <TopMovesQuickView
        analysis={positionAnalysis}
        isLoading={isPositionLoading}
        selectedMove={selectedMove}
        onMoveSelect={onMoveSelect}
      />
    </section>
  );
}

function LastMoveSummary({
  review,
  isLoading,
  coachPersonaId,
}: {
  review: MoveReviewResponse | null;
  isLoading: boolean;
  coachPersonaId: AiPersonaId;
}) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Dernier coup joué
          </p>

          <h3 className="mt-1 text-base font-bold text-white">
            Impact immédiat
          </h3>
        </div>

        {review && (
          <StatusBadge
            label={review.classification_label}
            classification={
              review.classification
            }
          />
        )}
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-900/60 bg-blue-950/20 p-4">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-900 border-t-blue-300" />
          <p className="text-sm text-blue-200">
            Stockfish évalue le dernier coup…
          </p>
        </div>
      )}

      {!isLoading && review && (
        <div className="mt-4">
          <div className="rounded-xl border border-blue-900/50 bg-blue-950/15 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              Le coach te parle
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-200">
              {explainPlayedMove(review, coachPersonaId)}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !review && (
        <p className="mt-4 text-sm leading-6 text-gray-500">
          Joue un coup ou sélectionne un coup
          analysé pour afficher son résumé.
        </p>
      )}
    </section>
  );
}

function LivePrecisionCard({
  accuracy,
  reviewedMoveCount,
  impact,
  impactKey,
}: {
  accuracy: number | null;
  reviewedMoveCount: number;
  impact: number | null;
  impactKey: string;
}) {
  const positive =
    impact !== null && impact > 0;
  const negative =
    impact !== null && impact < 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Précision en direct
          </p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-3xl font-black text-white">
              {accuracy !== null
                ? `${accuracy}%`
                : "—"}
            </p>
            <p className="pb-1 text-xs text-gray-500">
              {reviewedMoveCount} coup
              {reviewedMoveCount > 1
                ? "s"
                : ""}{" "}
              analysé
              {reviewedMoveCount > 1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

        <div
          key={impactKey}
          className={[
            "flex min-w-20 flex-col items-center rounded-xl border px-3 py-2",
            positive
              ? "border-emerald-800 bg-emerald-950/35 text-emerald-300"
              : negative
                ? "border-red-800 bg-red-950/35 text-red-300"
                : "border-gray-800 bg-gray-950/50 text-gray-500",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className={[
              "text-xl font-black",
              positive || negative
                ? "animate-bounce"
                : "",
            ].join(" ")}
          >
            {positive
              ? "↑"
              : negative
                ? "↓"
                : "•"}
          </span>
          <span className="text-xs font-black">
            {impact !== null
              ? `${impact > 0 ? "+" : ""}${impact}`
              : "En attente"}
          </span>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400 transition-[width] duration-700 ease-out"
          style={{
            width: `${accuracy ?? 0}%`,
          }}
        />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-gray-500">
        L’impact indique si le dernier coup renforce ou réduit la qualité de la partie.
      </p>
    </section>
  );
}

function TopMovesQuickView({
  analysis,
  isLoading,
  selectedMove,
  onMoveSelect,
}: {
  analysis:
    | PositionAnalysisResponse
    | null;
  isLoading: boolean;
  selectedMove: string | null;
  onMoveSelect?: (move: MoveAnalysis) => void;
}) {
  const topMoves =
    analysis?.top_moves?.slice(0, 3) ?? [];

  return (
    <details
      className="group rounded-2xl border border-gray-800 bg-gray-900 shadow-lg"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Stockfish en direct
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-sm"
          >
            💡
          </span>
          <h3 className="text-base font-bold text-white">
            3 meilleurs coups à jouer
          </h3>
        </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-700 text-sm font-black text-blue-300 transition group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="border-t border-gray-800 px-4 pb-4">
        <p className="mt-3 text-xs leading-5 text-gray-400">
          Clique sur un coup pour afficher sa flèche sans le jouer.
        </p>

      {isLoading && topMoves.length === 0 && (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((rank) => (
            <div
              key={rank}
              className="h-28 animate-pulse rounded-xl border border-gray-800 bg-gray-950/60"
            />
          ))}
        </div>
      )}

      {topMoves.length > 0 && (
        <div className="mt-4 space-y-2">
          {topMoves.map((move) => (
            <TopMoveSquare
              key={`${move.rank}-${move.move}`}
              move={move}
              selected={selectedMove === move.move}
              onSelect={onMoveSelect}
            />
          ))}
        </div>
      )}

      {!isLoading &&
        topMoves.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            Aucune suggestion disponible pour
            cette position.
          </p>
        )}
      </div>
    </details>
  );
}

function TopMoveSquare({
  move,
  selected,
  onSelect,
}: {
  move: MoveAnalysis;
  selected: boolean;
  onSelect?: (move: MoveAnalysis) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect?.(move)}
      className={[
        "w-full min-w-0 rounded-xl border p-3 text-left transition",
        selected
          ? "border-blue-500 bg-blue-950/35 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "border-gray-800 bg-gray-950/70 hover:border-blue-800 hover:bg-blue-950/15",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-xs font-bold text-gray-300">
          {move.rank}
        </span>
        <p className="text-lg font-bold text-white">
          {move.move_san}
        </p>
        <p className="ml-auto text-xs font-semibold text-blue-300">
        {formatEngineEvaluation(move)}
        </p>
      </div>

      <p className="mt-2 text-xs font-semibold leading-5 text-gray-200">
        {move.beginner_label}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-gray-400">
        {move.beginner_description}
      </p>
      <p className="mt-2 text-[11px] font-semibold text-blue-300">
        {selected
          ? "Flèche affichée sur l’échiquier · cliquer pour masquer"
          : "Afficher ce coup sur l’échiquier"}
      </p>
    </button>
  );
}

function StatusBadge({
  label,
  classification,
}: {
  label: string;
  classification: string;
}) {
  const classes =
    classification === "best" ||
    classification === "excellent"
      ? "border-emerald-800 bg-emerald-950/35 text-emerald-300"
      : classification === "good"
        ? "border-blue-800 bg-blue-950/35 text-blue-300"
        : classification === "inaccuracy"
          ? "border-amber-800 bg-amber-950/35 text-amber-300"
          : classification === "mistake"
            ? "border-orange-800 bg-orange-950/35 text-orange-300"
            : "border-red-800 bg-red-950/35 text-red-300";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-bold ${classes}`}
    >
      {label}
    </span>
  );
}


