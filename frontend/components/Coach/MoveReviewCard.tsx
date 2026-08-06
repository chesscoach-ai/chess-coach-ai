"use client";

import type { PlayedMoveData } from "@/components/ChessBoard";
import type {
  MoveClassification,
  MoveReviewResponse,
} from "@/services/api/ApiService";
import {
  type AiPersonaId,
} from "@/lib/ai/opponents";
import { explainPlayedMove } from "@/lib/chess/pedagogy";
import CoachMentorMessage from "@/components/Coach/CoachMentorMessage";
import { getAiPersona } from "@/lib/ai/opponents";
import type { LearningProfile } from "@/lib/learning/types";

type MoveReviewCardProps = {
  moveData: PlayedMoveData;
  review: MoveReviewResponse | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  coachPersonaId?: AiPersonaId;
  learningProfile?: LearningProfile | null;
};

function MoveReviewCard({
  moveData,
  review,
  isLoading,
  error,
  onRetry,
  coachPersonaId = "balanced",
  learningProfile = null,
}: MoveReviewCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg">
      <div className="border-b border-gray-800 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Analyse du coup sélectionné
            </p>

            <p className="mt-1 text-2xl font-bold text-white">
              {review?.played_move_san ??
                formatUciMove(
                  moveData.playedMove,
                )}
            </p>
          </div>

          {review && (
            <ClassificationBadge
              classification={
                review.classification
              }
              label={
                review.classification_label
              }
            />
          )}

          {isLoading && (
            <span className="rounded-full border border-blue-800 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-300">
              Analyse…
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {isLoading && (
          <LoadingReview
            move={moveData.playedMove}
          />
        )}

        {!isLoading && error && (
          <ReviewError
            message={error}
            onRetry={onRetry}
          />
        )}

        {!isLoading && review && (
          <ReviewContent
            review={review}
            coachPersonaId={coachPersonaId}
            learningProfile={learningProfile}
          />
        )}

        {!isLoading &&
          !error &&
          !review && (
            <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4">
              <p className="text-sm text-gray-400">
                Ce coup n’a pas encore été
                analysé.
              </p>

              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                Analyser ce coup
              </button>
            </div>
          )}
      </div>
    </section>
  );
}

function LoadingReview({
  move,
}: {
  move: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-blue-400" />

      <span>
        Ton coach relit le coup{" "}
        <strong className="text-gray-200">
          {formatUciMove(move)}
        </strong>
        .
      </span>
    </div>
  );
}

function ReviewError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-900/70 bg-red-950/30 p-4">
      <p className="font-semibold text-red-300">
        L’analyse du coup a échoué
      </p>

      <p className="mt-1 text-sm text-red-200/80">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg border border-red-800 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-900/40"
      >
        Réessayer
      </button>
    </div>
  );
}

function ReviewContent({
  review,
  coachPersonaId,
  learningProfile,
}: {
  review: MoveReviewResponse;
  coachPersonaId: AiPersonaId;
  learningProfile: LearningProfile | null;
}) {
  const persona = getAiPersona(coachPersonaId);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <ReviewStat
          label="Coup joué"
          value={`${capitalize(review.played_move_piece)} · ${review.played_move_san}`}
        />

        <ReviewStat
          label="Meilleur coup"
          value={`${capitalize(review.best_move_piece)} · ${review.best_move_san}`}
          positive={review.is_best_move}
        />

      </div>

      <CoachMentorMessage
        compact
        name={persona.name}
        title={getCoachReactionTitle(review)}
      >
        <p>
          {explainPlayedMove(review, coachPersonaId, learningProfile)}
        </p>
      </CoachMentorMessage>

      <EvaluationComparison
        review={review}
      />

      <MoveCharacteristics
        review={review}
      />

      {review.best_variation.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Meilleure variante
          </p>

          <p className="mt-2 rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3 font-mono text-sm leading-6 text-gray-300">
            {review.best_variation.join(
              " ",
            )}
          </p>
        </div>
      )}
    </>
  );
}

function ReviewStat({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 font-semibold",
          positive
            ? "text-emerald-300"
            : "text-gray-100",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function EvaluationComparison({
  review,
}: {
  review: MoveReviewResponse;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Évolution de la position
      </p>

      <div className="mt-2 flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/50 px-4 py-3">
        <EvaluationValue
          label="Avant"
          value={formatEvaluation(
            review.evaluation_before,
            review.evaluation_before_type,
          )}
        />

        <span className="text-gray-600">
          →
        </span>

        <EvaluationValue
          label="Après"
          value={formatEvaluation(
            review.evaluation_after,
            review.evaluation_after_type,
          )}
        />
      </div>
    </div>
  );
}

function EvaluationValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-mono text-lg font-semibold text-gray-100">
        {value}
      </p>
    </div>
  );
}

function MoveCharacteristics({
  review,
}: {
  review: MoveReviewResponse;
}) {
  const characteristics: string[] = [];

  if (review.played_move_is_capture) {
    characteristics.push("Capture");
  }

  if (review.played_move_gives_check) {
    characteristics.push("Échec");
  }

  if (review.played_move_is_castling) {
    characteristics.push("Roque");
  }

  if (review.played_move_is_promotion) {
    characteristics.push("Promotion");
  }

  if (characteristics.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {characteristics.map(
        (characteristic) => (
          <span
            key={characteristic}
            className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300"
          >
            {characteristic}
          </span>
        ),
      )}
    </div>
  );
}

function ClassificationBadge({
  classification,
  label,
}: {
  classification: MoveClassification;
  label: string;
}) {
  return (
    <span
      className={[
        "rounded-full border px-3 py-1 text-xs font-semibold",
        getClassificationClassName(
          classification,
        ),
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function getClassificationClassName(
  classification: MoveClassification,
): string {
  switch (classification) {
    case "excellent":
      return [
        "border-emerald-700",
        "bg-emerald-950/50",
        "text-emerald-300",
      ].join(" ");

    case "good":
      return [
        "border-green-700",
        "bg-green-950/50",
        "text-green-300",
      ].join(" ");

    case "inaccuracy":
      return [
        "border-yellow-700",
        "bg-yellow-950/50",
        "text-yellow-300",
      ].join(" ");

    case "mistake":
      return [
        "border-orange-700",
        "bg-orange-950/50",
        "text-orange-300",
      ].join(" ");

    case "blunder":
      return [
        "border-red-700",
        "bg-red-950/50",
        "text-red-300",
      ].join(" ");
  }
}

function getCoachReactionTitle(
  review: MoveReviewResponse,
): string {
  switch (review.classification) {
    case "excellent":
      return "Très propre. Garde ce réflexe.";
    case "good":
      return "Bonne décision, avec une petite marge de progression.";
    case "inaccuracy":
      return "Pas dramatique : voici le détail qui t’a échappé.";
    case "mistake":
      return "On ralentit ici : ce moment mérite d’être rejoué.";
    case "blunder":
      return "Ouch… tu t’es fait mater sauvagement par la tactique.";
  }
}

function formatEvaluation(
  evaluation: number,
  evaluationType: "centipawn" | "mate",
): string {
  if (evaluationType === "mate") {
    if (evaluation > 0) {
      return `Mat en ${Math.abs(
        evaluation,
      )}`;
    }

    return `Mat subi en ${Math.abs(
      evaluation,
    )}`;
  }

  const prefix =
    evaluation > 0 ? "+" : "";

  return `${prefix}${evaluation
    .toFixed(2)
    .replace(".", ",")}`;
}

function formatUciMove(
  move: string,
): string {
  if (move.length < 4) {
    return move;
  }

  return `${move.slice(0, 2)} → ${move.slice(
    2,
    4,
  )}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("fr") + value.slice(1);
}

export default MoveReviewCard;
