"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

import MoveEffects, {
  useMoveAnimation,
} from "@/components/ChessBoard/MoveEffects";
import type {
  ExerciseColor,
  ExerciseMove,
} from "@/types/exercise";

type ExerciseBoardProps = {
  startFen: string;
  playerColor: ExerciseColor;
  disabled?: boolean;
  hintMove?: ExerciseMove | null;

  /**
   * Doit retourner true lorsque le coup est correct.
   * Un coup incorrect est immédiatement annulé.
   */
  onMovePlayed: (move: ExerciseMove) => boolean;
};

function createGameFromFen(fen: string): Chess {
  try {
    return new Chess(fen);
  } catch {
    return new Chess();
  }
}

function getChessColor(
  playerColor: ExerciseColor,
): "w" | "b" {
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
  const {
    moveEffect,
    animateMove,
  } = useMoveAnimation();

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setGame(createGameFromFen(startFen));
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [startFen]);

  const playerChessColor = useMemo(
    () => getChessColor(playerColor),
    [playerColor],
  );

  const playerCanMove =
    !disabled && game.turn() === playerChessColor;

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean {
    if (!playerCanMove || !targetSquare) {
      return false;
    }

    const sourcePiece = game.get(
      sourceSquare as Parameters<Chess["get"]>[0],
    );

    /*
     * Empêche le joueur de déplacer une pièce adverse,
     * même si react-chessboard la considère comme draggable.
     */
    if (
      !sourcePiece ||
      sourcePiece.color !== playerChessColor
    ) {
      return false;
    }

    const nextGame = new Chess(game.fen());

    try {
      const playedMove = nextGame.move({
        from: sourceSquare,
        to: targetSquare,

        /*
         * Pour le moment, une promotion est effectuée
         * automatiquement en dame. Une interface de choix
         * pourra être ajoutée pour gérer les sous-promotions.
         */
        promotion: "q",
      });

      if (!playedMove) {
        return false;
      }

      const move: ExerciseMove = {
        from: playedMove.from,
        to: playedMove.to,
        promotion: playedMove.promotion,
      };

      const isCorrect = onMovePlayed(move);

      /*
       * Un mauvais coup n'est pas conservé sur
       * l'échiquier afin que le joueur puisse
       * immédiatement essayer une autre réponse.
       */
      if (!isCorrect) {
        return false;
      }

      setGame(nextGame);
      animateMove(
        playedMove.from,
        playedMove.to,
        Boolean(playedMove.captured),
      );

      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="chess-board-live mx-auto aspect-square w-full max-w-[720px] overflow-hidden rounded-2xl shadow-2xl">
      <Chessboard
        options={{
          position: game.fen(),
          boardOrientation: playerColor,
          allowDragging: playerCanMove,
          onPieceDrop: handlePieceDrop,
          animationDurationInMs: 260,
          arrows: hintMove
            ? [
                {
                  startSquare:
                    hintMove.from,
                  endSquare: hintMove.to,
                  color:
                    "rgba(245, 158, 11, 0.92)",
                },
              ]
            : [],
        }}
      />
      <MoveEffects
        move={moveEffect}
        orientation={playerColor}
      />
    </div>
  );
}
