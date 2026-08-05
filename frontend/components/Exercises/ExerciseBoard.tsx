"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";

import MoveEffects, {
  useMoveAnimation,
} from "@/components/ChessBoard/MoveEffects";
import type {
  ExerciseColor,
  ExerciseMove,
  ExerciseMoveResult,
} from "@/types/exercise";

type ExerciseBoardProps = {
  startFen: string;
  playerColor: ExerciseColor;
  disabled?: boolean;
  hintMove?: ExerciseMove | null;
  onMovePlayed: (move: ExerciseMove) => ExerciseMoveResult;
};

function createGameFromFen(fen: string): Chess {
  try {
    return new Chess(fen);
  } catch {
    return new Chess();
  }
}

function getChessColor(playerColor: ExerciseColor): "w" | "b" {
  return playerColor === "white" ? "w" : "b";
}

export default function ExerciseBoard({
  startFen,
  playerColor,
  disabled = false,
  hintMove = null,
  onMovePlayed,
}: ExerciseBoardProps) {
  const [game, setGame] = useState<Chess>(() =>
    createGameFromFen(startFen),
  );
  const [selectedSquare, setSelectedSquare] =
    useState<string | null>(null);
  const [lastMove, setLastMove] =
    useState<ExerciseMove | null>(null);
  const [incorrectMove, setIncorrectMove] =
    useState<ExerciseMove | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const replyTimer = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const { moveEffect, animateMove } = useMoveAnimation();

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setGame(createGameFromFen(startFen));
      setSelectedSquare(null);
      setLastMove(null);
      setIncorrectMove(null);
      setIsReplying(false);
    }, 0);

    return () => {
      window.clearTimeout(resetId);
      if (replyTimer.current !== null) {
        window.clearTimeout(replyTimer.current);
      }
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
    };
  }, [startFen]);

  const playerChessColor = useMemo(
    () => getChessColor(playerColor),
    [playerColor],
  );
  const playerCanMove =
    !disabled &&
    !isReplying &&
    game.turn() === playerChessColor;

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !playerCanMove) {
      return new Set<string>();
    }
    return new Set(
      game
        .moves({
          square: selectedSquare as Square,
          verbose: true,
        })
        .map((move) => move.to),
    );
  }, [game, playerCanMove, selectedSquare]);

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = {
        background: "rgba(16, 185, 129, 0.32)",
      };
      styles[lastMove.to] = {
        background: "rgba(16, 185, 129, 0.52)",
        boxShadow: "inset 0 0 0 3px rgba(52, 211, 153, 0.8)",
      };
    }

    if (incorrectMove) {
      styles[incorrectMove.from] = {
        background: "rgba(239, 68, 68, 0.3)",
      };
      styles[incorrectMove.to] = {
        background: "rgba(239, 68, 68, 0.5)",
        boxShadow: "inset 0 0 0 3px rgba(248, 113, 113, 0.8)",
      };
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        boxShadow: "inset 0 0 0 4px rgba(96, 165, 250, 0.95)",
      };
    }

    for (const square of legalTargets) {
      styles[square] = {
        ...styles[square],
        background:
          "radial-gradient(circle, rgba(59, 130, 246, 0.72) 0 17%, transparent 19%)",
      };
    }

    return styles;
  }, [incorrectMove, lastMove, legalTargets, selectedSquare]);

  function showIncorrectMove(move: ExerciseMove): void {
    setIncorrectMove(move);
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = window.setTimeout(() => {
      setIncorrectMove(null);
    }, 650);
  }

  function playOpponentMove(uci: string): void {
    setIsReplying(true);
    replyTimer.current = window.setTimeout(() => {
      setGame((current) => {
        const replyGame = new Chess(current.fen());
        try {
          const reply = replyGame.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4] ?? "q",
          });
          if (!reply) return current;

          const move: ExerciseMove = {
            from: reply.from,
            to: reply.to,
            promotion: reply.promotion,
          };
          setLastMove(move);
          animateMove(
            reply.from,
            reply.to,
            Boolean(reply.captured),
          );
          return replyGame;
        } catch {
          return current;
        }
      });
      setIsReplying(false);
    }, 320);
  }

  function attemptMove(
    sourceSquare: string,
    targetSquare: string,
  ): boolean {
    if (!playerCanMove) return false;

    const sourcePiece = game.get(sourceSquare as Square);
    if (!sourcePiece || sourcePiece.color !== playerChessColor) {
      return false;
    }

    const nextGame = new Chess(game.fen());
    try {
      const playedMove = nextGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
      if (!playedMove) return false;

      const move: ExerciseMove = {
        from: playedMove.from,
        to: playedMove.to,
        promotion: playedMove.promotion,
      };
      const result = onMovePlayed(move);
      setSelectedSquare(null);

      if (!result.correct) {
        showIncorrectMove(move);
        return false;
      }

      setIncorrectMove(null);
      setLastMove(move);
      setGame(nextGame);
      animateMove(
        playedMove.from,
        playedMove.to,
        Boolean(playedMove.captured),
      );

      if (result.opponentMove) {
        playOpponentMove(result.opponentMove);
      }

      return true;
    } catch {
      return false;
    }
  }

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    return targetSquare
      ? attemptMove(sourceSquare, targetSquare)
      : false;
  }

  function handleSquareClick(square: string): void {
    if (!playerCanMove) return;

    if (selectedSquare && attemptMove(selectedSquare, square)) {
      return;
    }

    const piece = game.get(square as Square);
    setSelectedSquare(
      piece?.color === playerChessColor
        ? square
        : null,
    );
  }

  return (
    <div className="chess-board-live relative mx-auto aspect-square w-full max-w-[720px] overflow-hidden rounded-2xl shadow-2xl">
      <Chessboard
        options={{
          position: game.fen(),
          boardOrientation: playerColor,
          allowDragging: playerCanMove,
          onPieceDrop: handlePieceDrop,
          onSquareClick: ({ square }) => handleSquareClick(square),
          squareStyles,
          animationDurationInMs: 180,
          arrows: hintMove
            ? [
                {
                  startSquare: hintMove.from,
                  endSquare: hintMove.to,
                  color: "rgba(245, 158, 11, 0.92)",
                },
              ]
            : [],
        }}
      />
      <MoveEffects move={moveEffect} orientation={playerColor} />
      {isReplying && (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-blue-300/30 bg-gray-950/85 px-3 py-1.5 text-xs font-bold text-blue-100 shadow-xl backdrop-blur">
          Réponse adverse…
        </div>
      )}
    </div>
  );
}
