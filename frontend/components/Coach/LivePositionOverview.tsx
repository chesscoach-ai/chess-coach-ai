"use client";

import type {
  MoveReviewResponse,
  PositionAnalysisResponse,
} from "@/services/api/ApiService";
import {
  explainPlayedMove,
} from "@/lib/chess/pedagogy";
import type { AiPersonaId } from "@/lib/ai/opponents";
import NoxShell from "@/components/Nox/NoxShell";
import NoxNotebook from "@/components/Nox/NoxNotebook";
import type { LearningProfile } from "@/lib/learning/types";
import type { NoxMemoryEnvelope } from "@/lib/nox/memoryTypes";
import type { NoxProgressionSnapshot } from "@/lib/nox/progressionTypes";

type Props = {
  review: MoveReviewResponse | null;
  isReviewLoading: boolean;
  positionKey: string;
  positionAnalysis?: PositionAnalysisResponse | null;
  onShowMove?: (move: string) => void;
  onHighlightSquares?: (squares: string[]) => void;
  onClearVisual?: () => void;
  coachPersonaId?: AiPersonaId;
  learningProfile?: LearningProfile | null;
  noxMemory?: NoxMemoryEnvelope | null;
  noxMemoryLoading?: boolean;
  noxProgression?: NoxProgressionSnapshot | null;
  onResetNoxMemory?: () => Promise<boolean>;
  livePrecision?: {
    accuracy: number | null;
    reviewedMoveCount: number;
    impact: number | null;
    impactKey: string;
  };
};

export default function LivePositionOverview({
  review,
  isReviewLoading,
  positionKey,
  positionAnalysis = null,
  onShowMove,
  onHighlightSquares,
  onClearVisual,
  coachPersonaId = "balanced",
  learningProfile = null,
  noxMemory = null,
  noxMemoryLoading = false,
  noxProgression = null,
  onResetNoxMemory = async () => false,
  livePrecision,
}: Props) {
  return (
    <section className="space-y-4">
      <LastMoveSummary
        review={review}
        isLoading={isReviewLoading}
        positionKey={positionKey}
        positionAnalysis={positionAnalysis}
        onShowMove={onShowMove}
        onHighlightSquares={onHighlightSquares}
        onClearVisual={onClearVisual}
        coachPersonaId={coachPersonaId}
        learningProfile={learningProfile}
        noxMemory={noxMemory}
        noxProgression={noxProgression}
      />

      <NoxNotebook
        memory={noxMemory}
        loading={noxMemoryLoading}
        onReset={onResetNoxMemory}
        progression={noxProgression}
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

    </section>
  );
}

function LastMoveSummary({
  review,
  isLoading,
  positionKey,
  positionAnalysis,
  onShowMove,
  onHighlightSquares,
  onClearVisual,
  coachPersonaId,
  learningProfile,
  noxMemory,
  noxProgression,
}: {
  review: MoveReviewResponse | null;
  isLoading: boolean;
  positionKey: string;
  positionAnalysis: PositionAnalysisResponse | null;
  onShowMove?: (move: string) => void;
  onHighlightSquares?: (squares: string[]) => void;
  onClearVisual?: () => void;
  coachPersonaId: AiPersonaId;
  learningProfile: LearningProfile | null;
  noxMemory: NoxMemoryEnvelope | null;
  noxProgression: NoxProgressionSnapshot | null;
}) {
  const primaryMessage = review
    ? explainPlayedMove(review, coachPersonaId, learningProfile)
    : positionAnalysis?.best_move_details.beginner_description ?? null;
  return (
    <NoxShell
      context={{
        contextKey: `${positionKey}:${review?.played_move ?? "position"}`,
        mode: "analysis",
        isThinking: isLoading,
        review,
        analysis: positionAnalysis,
        primaryMessage,
        memory: noxMemory?.summary ?? null,
        progression: noxProgression,
      }}
      onShowMove={onShowMove}
      onHighlightSquares={onHighlightSquares}
      onClearVisual={onClearVisual}
    />
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

