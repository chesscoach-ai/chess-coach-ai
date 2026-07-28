"use client";

import { useState } from "react";
import type { Square } from "chess.js";
import { ChessEngine } from "@/services/chess/ChessEngine";

export type ChessMoveData = {
  san: string;
  from: Square;
  to: Square;

  /**
   * Position avant le coup.
   */
  fenBefore: string;

  /**
   * Position après le coup.
   */
  fenAfter: string;

  /**
   * Coup au format UCI.
   * Ex: e2e4, e7e8q...
   */
  uci: string;
};

export function useChessGame() {
  const [engine] = useState(
    () => new ChessEngine(),
  );

  const initialFen = engine.getFEN();

  const [fen, setFen] = useState(initialFen);

  const [moveData, setMoveData] =
    useState<ChessMoveData[]>([]);

  const [timeline, setTimeline] =
    useState<string[]>([initialFen]);

  const [currentMoveIndex, setCurrentMoveIndex] =
    useState(0);

  const moves = moveData.map(
    (move) => move.san,
  );

  const history = moves.slice(
    0,
    currentMoveIndex,
  );

  const currentMove =
    currentMoveIndex > 0
      ? moveData[currentMoveIndex - 1] ??
        null
      : null;

  function move(
    from: Square,
    to: Square,
  ): boolean {
    const result = engine.move(from, to);

    if (!result) {
      return false;
    }

    /*
     * Si un coup est joué depuis une position
     * précédente, on supprime toute la suite.
     */
    const updatedMoveData =
      moveData.slice(
        0,
        currentMoveIndex,
      );

    const updatedTimeline =
      timeline.slice(
        0,
        currentMoveIndex + 1,
      );

    const fenBefore =
      updatedTimeline[
        updatedTimeline.length - 1
      ];

    const fenAfter = engine.getFEN();

    updatedMoveData.push({
      san: result.san,
      from: result.from,
      to: result.to,
      fenBefore,
      fenAfter,
      uci: `${result.from}${result.to}${
        result.promotion ?? ""
      }`,
    });

    updatedTimeline.push(fenAfter);

    setMoveData(updatedMoveData);
    setTimeline(updatedTimeline);
    setCurrentMoveIndex(
      updatedMoveData.length,
    );
    setFen(fenAfter);

    return true;
  }

  function goToMove(
    index: number,
  ): void {
    const safeIndex = Math.max(
      0,
      Math.min(index, moveData.length),
    );

    const targetFen =
      timeline[safeIndex];

    if (!targetFen) {
      return;
    }

    const loaded =
      engine.loadFEN(targetFen);

    if (!loaded) {
      return;
    }

    setCurrentMoveIndex(safeIndex);
    setFen(targetFen);
  }

  function previousMove(): void {
    goToMove(currentMoveIndex - 1);
  }

  function nextMove(): void {
    goToMove(currentMoveIndex + 1);
  }

  function goToStart(): void {
    goToMove(0);
  }

  function goToEnd(): void {
    goToMove(moveData.length);
  }

  function undo(): void {
    if (currentMoveIndex === 0) {
      return;
    }

    const previousIndex =
      currentMoveIndex - 1;

    const updatedMoveData =
      moveData.slice(
        0,
        previousIndex,
      );

    const updatedTimeline =
      timeline.slice(
        0,
        previousIndex + 1,
      );

    const targetFen =
      updatedTimeline[previousIndex];

    if (!targetFen) {
      return;
    }

    const loaded =
      engine.loadFEN(targetFen);

    if (!loaded) {
      return;
    }

    setMoveData(updatedMoveData);
    setTimeline(updatedTimeline);
    setCurrentMoveIndex(
      previousIndex,
    );
    setFen(targetFen);
  }

  function reset(): void {
    engine.reset();

    const resetFen =
      engine.getFEN();

    setFen(resetFen);
    setMoveData([]);
    setTimeline([resetFen]);
    setCurrentMoveIndex(0);
  }

  function loadPGN(
    pgn: string,
  ): boolean {
    const loaded =
      engine.loadPGN(pgn);

    if (!loaded) {
      return false;
    }

    const importedHistory =
      engine.getVerboseHistory();

    const importedMoveData: ChessMoveData[] =
      importedHistory.map(
        (move, index) => ({
          san: move.san,
          from: move.from,
          to: move.to,

          fenBefore:
            index === 0
              ? initialFen
              : importedHistory[
                  index - 1
                ].after,

          fenAfter: move.after,

          uci: `${move.from}${move.to}${
            move.promotion ?? ""
          }`,
        }),
      );

    const importedTimeline = [
      initialFen,
      ...importedHistory.map(
        (move) => move.after,
      ),
    ];

    setMoveData(importedMoveData);
    setTimeline(importedTimeline);
    setCurrentMoveIndex(
      importedMoveData.length,
    );
    setFen(engine.getFEN());

    return true;
  }

  return {
    fen,
    history,
    moves,

    /**
     * Historique complet enrichi.
     */
    moveData,

    currentMove,
    currentMoveIndex,

    move,
    undo,
    reset,
    loadPGN,

    goToMove,
    previousMove,
    nextMove,
    goToStart,
    goToEnd,
  };
}

export type ChessGameController =
  ReturnType<
    typeof useChessGame
  >;
