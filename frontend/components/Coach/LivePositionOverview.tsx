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
import type { NoxMission } from "@/lib/nox/missionTypes";

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
  noxMission?: NoxMission | null;
  onResetNoxMemory?: () => Promise<boolean>;
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
  noxMission = null,
  onResetNoxMemory = async () => false,
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
        noxMission={noxMission}
      />

      <NoxNotebook
        memory={noxMemory}
        loading={noxMemoryLoading}
        onReset={onResetNoxMemory}
        progression={noxProgression}
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
  noxMission,
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
  noxMission: NoxMission | null;
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
        mission: noxMission,
      }}
      onShowMove={onShowMove}
      onHighlightSquares={onHighlightSquares}
      onClearVisual={onClearVisual}
    />
  );
}

export function LivePrecisionCard({
  accuracy,
  reviewedMoveCount,
  opponentAccuracy,
  opponentReviewedMoveCount,
  impact,
  impactKey,
}: {
  accuracy: number | null;
  reviewedMoveCount: number;
  opponentAccuracy: number | null;
  opponentReviewedMoveCount: number;
  impact: number | null;
  impactKey: string;
}) {
  const positive =
    impact !== null && impact > 0;
  const negative =
    impact !== null && impact < 0;

  return (
    <section aria-label="Précision comparée" className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900 px-3 py-2.5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Ta précision
          </p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-black text-white">
              {accuracy !== null
                ? `${accuracy}%`
                : "—"}
            </p>
            <p className="text-[10px] text-gray-500">
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

          <div className="border-l border-gray-800 pl-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
              Adversaire
            </p>
            <p className="text-sm font-black text-gray-300">
              {opponentAccuracy !== null ? `${opponentAccuracy}%` : "—"}
              <span className="ml-1 text-[10px] font-normal text-gray-600">
                ({opponentReviewedMoveCount})
              </span>
            </p>
          </div>
        </div>

        <div
          key={impactKey}
          className={[
            "flex min-w-16 items-center justify-center gap-1 rounded-lg border px-2 py-1.5",
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
              "text-sm font-black",
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

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-400 transition-[width] duration-700 ease-out"
          style={{
            width: `${accuracy ?? 0}%`,
          }}
        />
      </div>
      <p className="mt-1 text-[10px] leading-4 text-gray-500">
        Calculée uniquement sur tes coups. Le score adverse sert de comparaison.
      </p>
    </section>
  );
}

