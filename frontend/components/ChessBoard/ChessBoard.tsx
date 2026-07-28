"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

import MoveEffects, {
  useMoveAnimation,
} from "@/components/ChessBoard/MoveEffects";
import type { ChessGameController } from "@/hooks/useChessGame";
import type { MoveClassification } from "@/services/api/ApiService";
export type SuggestedMove = {
  from: Square;
  to: Square;
};


export type PlayedMoveData = {
  fenBefore: string;
  fenAfter: string;
  playedMove: string;
  from: Square;
  to: Square;
};

export type ReviewBoardIndicators = {
  playedMove: string;
  classification: MoveClassification;
};

type ChessBoardProps = {
  game: ChessGameController;
  suggestedMove?: SuggestedMove | null;
  reviewIndicators?: ReviewBoardIndicators | null;
  onMovePlayed?: (moveData: PlayedMoveData) => void;
  mode?: "analysis" | "competitive";
  playerColor?: "white" | "black" | null;
  interactionDisabled?: boolean;
};

type BoardArrow = {
  startSquare: string;
  endSquare: string;
  color: string;
};

const CLASSIFICATION_COLORS: Record<
  MoveClassification,
  { solid: string; soft: string; ring: string }
> = {
  excellent: {
    solid: "rgba(16, 185, 129, 0.92)",
    soft: "rgba(16, 185, 129, 0.32)",
    ring: "rgba(5, 150, 105, 0.88)",
  },
  good: {
    solid: "rgba(59, 130, 246, 0.92)",
    soft: "rgba(59, 130, 246, 0.3)",
    ring: "rgba(37, 99, 235, 0.85)",
  },
  inaccuracy: {
    solid: "rgba(234, 179, 8, 0.92)",
    soft: "rgba(234, 179, 8, 0.3)",
    ring: "rgba(202, 138, 4, 0.88)",
  },
  mistake: {
    solid: "rgba(249, 115, 22, 0.92)",
    soft: "rgba(249, 115, 22, 0.3)",
    ring: "rgba(234, 88, 12, 0.88)",
  },
  blunder: {
    solid: "rgba(239, 68, 68, 0.92)",
    soft: "rgba(239, 68, 68, 0.32)",
    ring: "rgba(220, 38, 38, 0.88)",
  },
};

export default function ChessBoard({
  game,
  suggestedMove = null,
  reviewIndicators = null,
  onMovePlayed,
  mode = "analysis",
  playerColor = null,
  interactionDisabled = false,
}: ChessBoardProps) {
  const [errorMessage, setErrorMessage] =
    useState("");
  const [
    showAnalysisIndicators,
    setShowAnalysisIndicators,
  ] = useState(true);
  const {
    moveEffect,
    animateMove,
  } = useMoveAnimation();
  const lastAnimatedPosition =
    useRef(
      game.currentMove?.fenAfter ?? null,
    );

  useEffect(() => {
    const currentMove =
      game.currentMove;

    if (
      !currentMove ||
      currentMove.fenAfter ===
        lastAnimatedPosition.current
    ) {
      return;
    }

    let isCapture = false;

    try {
      isCapture = Boolean(
        new Chess(
          currentMove.fenBefore,
        ).move({
          from: currentMove.from,
          to: currentMove.to,
          promotion:
            currentMove.uci.slice(4) ||
            "q",
        })?.captured,
      );
    } catch {
      // L’animation reste décorative : le coup est déjà validé.
    }

    lastAnimatedPosition.current =
      currentMove.fenAfter;
    animateMove(
      currentMove.from,
      currentMove.to,
      isCapture,
    );
  }, [
    animateMove,
    game.currentMove,
  ]);

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!targetSquare) {
      return false;
    }
    const turn = game.fen.split(" ")[1] === "b" ? "black" : "white";
    if (
      interactionDisabled ||
      (playerColor !== null && turn !== playerColor)
    ) {
      return false;
    }

    const from = sourceSquare as Square;
    const to = targetSquare as Square;
    const fenBefore = game.fen;

    const moveWasPlayed = game.move(from, to);

    if (!moveWasPlayed) {
      setErrorMessage(
        "Ce déplacement n’est pas autorisé.",
      );

      return false;
    }

    setErrorMessage("");

    onMovePlayed?.({
      fenBefore,
      fenAfter: game.fen,
      playedMove: `${from}${to}`,
      from,
      to,
    });

    return true;
  }

  function resetGame(): void {
    game.reset();
    setErrorMessage("");
  }

  function undoLastMove(): void {
    game.undo();
    setErrorMessage("");
  }

  const lastMove =
    game.currentMove?.san ??
    (game.history.length > 0
      ? game.history[
          game.history.length - 1
        ]
      : "Aucun coup joué");

  const parsedReviewIndicators =
    useMemo(() => {
      if (
        !showAnalysisIndicators ||
        !reviewIndicators
      ) {
        return null;
      }

      const played =
        parseUciMove(
          reviewIndicators.playedMove,
        );
      if (!played) {
        return null;
      }

      return {
        played,
        classification:
          reviewIndicators.classification,
      };
    }, [
      reviewIndicators,
      showAnalysisIndicators,
    ]);

  const arrows = useMemo<BoardArrow[]>(
    () => {
      const nextArrows: BoardArrow[] = [];

      if (parsedReviewIndicators?.played) {
        nextArrows.push({
          startSquare:
            parsedReviewIndicators.played.from,
          endSquare:
            parsedReviewIndicators.played.to,
          color:
            CLASSIFICATION_COLORS[
              parsedReviewIndicators.classification
            ].solid,
        });
      }

      if (
        suggestedMove &&
        (suggestedMove.from !==
          parsedReviewIndicators?.played?.from ||
          suggestedMove.to !==
            parsedReviewIndicators?.played?.to)
      ) {
        nextArrows.push({
          startSquare: suggestedMove.from,
          endSquare: suggestedMove.to,
          color: "rgba(59, 130, 246, 0.9)",
        });
      }

      return nextArrows;
    },
    [
      parsedReviewIndicators,
      suggestedMove,
    ],
  );

  const lastMoveSquareStyle: CSSProperties = {
    background:
      "radial-gradient(circle, rgba(250, 204, 21, 0.75) 30%, rgba(250, 204, 21, 0.35) 70%)",
  };

  const suggestedMoveSquareStyle: CSSProperties = {
    background:
      "radial-gradient(circle, rgba(59, 130, 246, 0.78) 25%, rgba(59, 130, 246, 0.3) 70%)",
    boxShadow:
      "inset 0 0 0 4px rgba(37, 99, 235, 0.8)",
  };

  const squareStyles: Record<
    string,
    CSSProperties
  > = {};

  if (game.currentMove) {
    squareStyles[game.currentMove.from] =
      lastMoveSquareStyle;
    squareStyles[game.currentMove.to] =
      lastMoveSquareStyle;
  }

  if (parsedReviewIndicators?.played) {
    const { from, to } =
      parsedReviewIndicators.played;
    const colors =
      CLASSIFICATION_COLORS[
        parsedReviewIndicators.classification
      ];
    const playedMoveSquareStyle: CSSProperties = {
      background: `radial-gradient(circle, ${colors.solid} 25%, ${colors.soft} 70%)`,
      boxShadow: `inset 0 0 0 4px ${colors.ring}`,
    };

    squareStyles[from] =
      playedMoveSquareStyle;
    squareStyles[to] =
      playedMoveSquareStyle;
  }

  if (suggestedMove) {
    squareStyles[suggestedMove.from] =
      suggestedMoveSquareStyle;
    squareStyles[suggestedMove.to] =
      suggestedMoveSquareStyle;
  }

  const chessboardOptions = {
    position: game.fen,
    onPieceDrop: handlePieceDrop,
    boardOrientation: playerColor ?? ("white" as const),
    allowDragging:
      !interactionDisabled &&
      (playerColor === null ||
        (game.fen.split(" ")[1] === "b" ? "black" : "white") ===
          playerColor),
    animationDurationInMs: 260,
    showNotation: true,
    squareStyles,
    arrows,
    allowDrawingArrows: mode === "analysis",
    darkSquareStyle: {
      backgroundColor: "#4b5563",
    },
    lightSquareStyle: {
      backgroundColor: "#d1d5db",
    },
  };

  const hasReviewIndicators =
    Boolean(
      parsedReviewIndicators?.played ||
        suggestedMove,
    );

  return (
    <section className="w-full max-w-xl">
      <div className="chess-board-live overflow-hidden rounded-2xl shadow-2xl">
        <Chessboard
          options={chessboardOptions}
        />
        <MoveEffects
          move={moveEffect}
          orientation={
            playerColor ?? "white"
          }
        />
      </div>

      <div className="mt-5 rounded-xl bg-gray-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">
              Dernier coup affiché
            </p>

            <p className="text-lg font-semibold text-white">
              {lastMove}
            </p>

            {hasReviewIndicators && (
              <div className="mt-2 space-y-1 text-sm">
                {parsedReviewIndicators?.played && (
                  <p
                    className="font-medium"
                    style={{
                      color:
                        CLASSIFICATION_COLORS[
                          parsedReviewIndicators.classification
                        ].solid,
                    }}
                  >
                    Coup joué :{" "}
                    {
                      parsedReviewIndicators
                        .played.from
                    }
                    {" → "}
                    {
                      parsedReviewIndicators
                        .played.to
                    }
                  </p>
                )}

              </div>
            )}

            {suggestedMove && (
                <p className="mt-1 text-sm font-medium text-blue-400">
                  Suggestion Stockfish :{" "}
                  {suggestedMove.from}
                  {" → "}
                  {suggestedMove.to}
                </p>
              )}
          </div>

          <div className="flex flex-wrap gap-2">
            {reviewIndicators && (
              <button
                type="button"
                onClick={() => {
                  setShowAnalysisIndicators(
                    (current) => !current,
                  );
                }}
                className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700"
              >
                {showAnalysisIndicators
                  ? "Masquer les indications"
                  : "Afficher les indications"}
              </button>
            )}

            {mode === "analysis" && (
              <button
                type="button"
                onClick={undoLastMove}
                disabled={
                  game.currentMoveIndex === 0
                }
                className="rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Annuler
              </button>
            )}

            <button
              type="button"
              onClick={resetGame}
              className="rounded-lg bg-gray-700 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
            >
              {mode === "analysis"
                ? "Réinitialiser"
                : "Nouvelle partie"}
            </button>
          </div>
        </div>

        {errorMessage && (
          <p className="mt-3 text-sm font-medium text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}

function parseUciMove(
  move: string,
): {
  from: Square;
  to: Square;
} | null {
  const normalizedMove =
    move.trim().toLowerCase();

  const match = normalizedMove.match(
    /^([a-h][1-8])([a-h][1-8])[qrbn]?$/,
  );

  if (!match) {
    return null;
  }

  return {
    from: match[1] as Square,
    to: match[2] as Square,
  };
}
