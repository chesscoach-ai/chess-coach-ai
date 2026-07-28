"use client";

import {
  useMemo,
  useState,
} from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

import MoveEffects, {
  useMoveAnimation,
} from "@/components/ChessBoard/MoveEffects";
import type {
  CriticalPosition,
  PositionReviewResult,
  ReviewAttempt,
} from "@/types/guidedReview";

type GuidedReviewSessionProps = {
  positions: CriticalPosition[];
  initialIndex?: number;
  onExit: () => void;
  onComplete: (
    results: PositionReviewResult[],
  ) => void;
};

export default function GuidedReviewSession({
  positions,
  initialIndex = 0,
  onExit,
  onComplete,
}: GuidedReviewSessionProps) {
  const [index, setIndex] =
    useState(initialIndex);
  const [results, setResults] =
    useState<
      Record<
        string,
        PositionReviewResult
      >
    >({});
  const [feedback, setFeedback] =
    useState<
      | "correct"
      | "incorrect"
      | "revealed"
      | null
    >(null);
  const [showHint, setShowHint] =
    useState(false);
  const [positionFen, setPositionFen] =
    useState(
      positions[initialIndex]?.fen ??
        "start",
    );
  const {
    moveEffect,
    animateMove,
  } = useMoveAnimation();

  const current = positions[index];
  const currentResult =
    current
      ? results[current.id]
      : undefined;

  const progress =
    positions.length === 0
      ? 0
      : Math.round(
          ((index + 1) /
            positions.length) *
            100,
        );

  const orientation =
    current?.sideToMove === "black"
      ? "black"
      : "white";

  const attemptedMoves =
    currentResult?.attempts.length ?? 0;

  const isLocked =
    feedback === "correct" ||
    feedback === "revealed";

  const principalVariation =
    useMemo(
      () =>
        current
          ? current.principalVariationSan ??
            current.principalVariationUci ??
            []
          : [],
      [current],
    );

  if (!current) {
    return null;
  }

  function submitMove({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (isLocked || !targetSquare) {
      return false;
    }

    const chess = new Chess(
      current.fen,
    );

    let move;

    try {
      move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
    } catch {
      return false;
    }

    if (!move) {
      return false;
    }

    animateMove(
      move.from,
      move.to,
      Boolean(move.captured),
    );

    const attemptedMoveUci =
      `${move.from}${move.to}${move.promotion ?? ""}`;

    const isCorrect =
      normalizeUci(attemptedMoveUci) ===
      normalizeUci(
        current.bestMoveUci,
      );

    const attempt: ReviewAttempt = {
      positionId: current.id,
      attemptedMoveUci,
      attemptedMoveSan: move.san,
      isCorrect,
      createdAt:
        new Date().toISOString(),
    };

    setResults((previous) => {
      const existing =
        previous[current.id] ?? {
          positionId: current.id,
          solved: false,
          revealed: false,
          attempts: [],
          hintsUsed: 0,
        };

      return {
        ...previous,
        [current.id]: {
          ...existing,
          solved:
            existing.solved ||
            isCorrect,
          completedAt: isCorrect
            ? new Date().toISOString()
            : existing.completedAt,
          attempts: [
            ...existing.attempts,
            attempt,
          ],
        },
      };
    });

    if (isCorrect) {
      setPositionFen(chess.fen());
      setFeedback("correct");
    } else {
      setFeedback("incorrect");
      window.setTimeout(() => {
        setPositionFen(current.fen);
      }, 350);
    }

    return true;
  }

  function revealSolution(): void {
    const chess = new Chess(
      current.fen,
    );
    const best = parseUci(
      current.bestMoveUci,
    );

    try {
      chess.move({
        from: best.from,
        to: best.to,
        promotion:
          best.promotion || "q",
      });
      setPositionFen(chess.fen());
    } catch {
      setPositionFen(current.fen);
    }

    setResults((previous) => {
      const existing =
        previous[current.id] ?? {
          positionId: current.id,
          solved: false,
          revealed: false,
          attempts: [],
          hintsUsed: 0,
        };

      return {
        ...previous,
        [current.id]: {
          ...existing,
          revealed: true,
          completedAt:
            new Date().toISOString(),
        },
      };
    });

    setFeedback("revealed");
  }

  function useHint(): void {
    setShowHint(true);

    setResults((previous) => {
      const existing =
        previous[current.id] ?? {
          positionId: current.id,
          solved: false,
          revealed: false,
          attempts: [],
          hintsUsed: 0,
        };

      return {
        ...previous,
        [current.id]: {
          ...existing,
          hintsUsed:
            existing.hintsUsed + 1,
        },
      };
    });
  }

  function goNext(): void {
    if (
      index ===
      positions.length - 1
    ) {
      const completedResults =
        positions.map(
          (position) =>
            results[position.id] ?? {
              positionId:
                position.id,
              solved: false,
              revealed: false,
              attempts: [],
              hintsUsed: 0,
            },
        );

      onComplete(completedResults);
      return;
    }

    const nextIndex = index + 1;
    setIndex(nextIndex);
    setPositionFen(
      positions[nextIndex].fen,
    );
    setFeedback(null);
    setShowHint(false);
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Position {index + 1}/
              {positions.length}
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">
              Trouve le meilleur coup
            </h2>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800"
          >
            Quitter
          </button>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(320px,640px)_minmax(300px,1fr)]">
        <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-3">
          <div className="chess-board-live overflow-hidden rounded-xl">
            <Chessboard
              options={{
                position: positionFen,
                boardOrientation: orientation,
                onPieceDrop: submitMove,
                allowDragging: !isLocked,
                animationDurationInMs: 260,
              }}
            />
            <MoveEffects
              move={moveEffect}
              orientation={orientation}
            />
          </div>
        </div>

        <aside className="flex flex-col rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>
              Coup {current.moveNumber}
              {current.sideToMove ===
              "black"
                ? "…"
                : "."}
            </span>
            <span>•</span>
            <span>
              {orientation === "white"
                ? "Les Blancs"
                : "Les Noirs"}{" "}
              jouent
            </span>
            <span>•</span>
            <span>
              {attemptedMoves} tentative
              {attemptedMoves > 1
                ? "s"
                : ""}
            </span>
          </div>

          <h3 className="mt-4 text-lg font-bold text-white">
            Que jouerais-tu ici ?
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Joue directement ton coup sur
            l’échiquier. La solution reste
            masquée jusqu’à ta réponse.
          </p>

          {showHint && (
            <div className="mt-5 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-300">
                Indice
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-100/80">
                {current.hint ??
                  buildFallbackHint(
                    current.bestMoveUci,
                  )}
              </p>
            </div>
          )}

          {feedback ===
            "incorrect" && (
            <FeedbackBox
              title="Ce n’est pas le meilleur coup"
              text="La position est réinitialisée. Cherche une option plus forte ou demande un indice."
              tone="negative"
            />
          )}

          {feedback === "correct" && (
            <FeedbackBox
              title="Bien joué"
              text={`Le meilleur coup était bien ${
                current.bestMoveSan ??
                current.bestMoveUci
              }.`}
              tone="positive"
            />
          )}

          {feedback ===
            "revealed" && (
            <FeedbackBox
              title="Solution affichée"
              text={`Le meilleur coup était ${
                current.bestMoveSan ??
                current.bestMoveUci
              }.`}
              tone="neutral"
            />
          )}

          {isLocked && (
            <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Explication
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                {current.explanation ??
                  "Ce coup améliore immédiatement la position et évite la perte d’évaluation provoquée par le coup joué dans la partie."}
              </p>

              {principalVariation.length >
                0 && (
                <>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-500">
                    Variante modèle
                  </p>
                  <p className="mt-2 font-mono text-sm leading-6 text-blue-200">
                    {principalVariation
                      .slice(0, 8)
                      .join(" ")}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            {!showHint && !isLocked && (
              <button
                type="button"
                onClick={useHint}
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-800"
              >
                Obtenir un indice
              </button>
            )}

            {!isLocked && (
              <button
                type="button"
                onClick={
                  revealSolution
                }
                className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-800"
              >
                Voir la solution
              </button>
            )}

            {isLocked && (
              <button
                type="button"
                onClick={goNext}
                className="ml-auto rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                {index ===
                positions.length - 1
                  ? "Voir mon bilan"
                  : "Position suivante"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function FeedbackBox({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone:
    | "positive"
    | "negative"
    | "neutral";
}) {
  const classes =
    tone === "positive"
      ? "border-emerald-900/60 bg-emerald-950/25 text-emerald-200"
      : tone === "negative"
        ? "border-red-900/60 bg-red-950/25 text-red-200"
        : "border-blue-900/60 bg-blue-950/25 text-blue-200";

  return (
    <div
      className={`mt-5 rounded-xl border p-4 ${classes}`}
    >
      <p className="font-bold">
        {title}
      </p>
      <p className="mt-1 text-sm leading-6 opacity-80">
        {text}
      </p>
    </div>
  );
}

function normalizeUci(
  move: string,
): string {
  return move.trim().toLowerCase();
}

function parseUci(move: string): {
  from: string;
  to: string;
  promotion?: string;
} {
  const normalized =
    normalizeUci(move);

  return {
    from: normalized.slice(0, 2),
    to: normalized.slice(2, 4),
    promotion:
      normalized.length > 4
        ? normalized.slice(4, 5)
        : undefined,
  };
}

function buildFallbackHint(
  bestMoveUci: string,
): string {
  const { from, to } =
    parseUci(bestMoveUci);

  return `Observe la pièce placée en ${from} et cherche ce qu’elle peut accomplir vers ${to}.`;
}
