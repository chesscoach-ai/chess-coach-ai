"use client";

import type {
  MoveReviewResponse,
} from "@/services/api/ApiService";
import {
  explainPlayedMove,
} from "@/lib/chess/pedagogy";
import type { AiPersonaId } from "@/lib/ai/opponents";
import { getAiPersona } from "@/lib/ai/opponents";
import CoachMentorMessage from "@/components/Coach/CoachMentorMessage";

type Props = {
  review: MoveReviewResponse | null;
  isReviewLoading: boolean;
  coachPersonaId?: AiPersonaId;
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
  coachPersonaId = "balanced",
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
  const persona =
    getAiPersona(coachPersonaId);
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            Conversation avec ton mentor
          </p>

          <h3 className="mt-1 text-base font-bold text-white">
            Ce que ton dernier coup raconte
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
            Ton coach vérifie les conséquences…
          </p>
        </div>
      )}

      {!isLoading && review && (
        <div className="mt-4">
          <CoachMentorMessage
            compact
            name={persona.name}
            title={
              review.is_best_move
                ? "Exactement ce qu’il fallait."
                : `Je classe ce coup : ${review.classification_label.toLocaleLowerCase("fr")}.`
            }
          >
            {explainPlayedMove(
              review,
              coachPersonaId,
            )}
          </CoachMentorMessage>
        </div>
      )}

      {!isLoading && !review && (
        <p className="mt-4 text-sm leading-6 text-gray-500">
          Joue un coup ou sélectionne un coup analysé : ton mentor
          viendra te dire ce qu’il faut retenir.
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


