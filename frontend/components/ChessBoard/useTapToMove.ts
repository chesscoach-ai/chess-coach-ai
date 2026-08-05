"use client";

import {
  useMemo,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { Chess, type Square } from "chess.js";

type DropHandler = (input: {
  sourceSquare: string;
  targetSquare: string | null;
}) => boolean;

export function useTapToMove({
  fen,
  enabled,
  onMove,
}: {
  fen: string;
  enabled: boolean;
  onMove: DropHandler;
}) {
  const [selection, setSelection] =
    useState<{
      fen: string;
      square: Square | null;
    }>({
      fen,
      square: null,
    });
  const selectedSquare =
    selection.fen === fen
      ? selection.square
      : null;

  function updateSelection(
    square: Square | null,
  ): void {
    setSelection({ fen, square });
  }

  const legalMoves = useMemo(() => {
    if (!selectedSquare) return [];

    try {
      return new Chess(fen).moves({
        square: selectedSquare,
        verbose: true,
      });
    } catch {
      return [];
    }
  }, [fen, selectedSquare]);

  const squareStyles =
    useMemo<Record<string, CSSProperties>>(
      () => {
        if (!selectedSquare) return {};

        const styles: Record<
          string,
          CSSProperties
        > = {
          [selectedSquare]: {
            boxShadow:
              "inset 0 0 0 4px rgba(96, 165, 250, 0.98)",
            background:
              "radial-gradient(circle, rgba(147, 197, 253, 0.5), rgba(37, 99, 235, 0.28))",
          },
        };

        legalMoves.forEach((move) => {
          styles[move.to] = move.captured
            ? {
                background:
                  "radial-gradient(circle, transparent 42%, rgba(248, 113, 113, 0.82) 44%, rgba(127, 29, 29, 0.52) 62%, transparent 64%)",
              }
            : {
                background:
                  "radial-gradient(circle, rgba(96, 165, 250, 0.88) 0 16%, rgba(30, 64, 175, 0.3) 18%, transparent 22%)",
              };
        });

        return styles;
      },
      [legalMoves, selectedSquare],
    );

  function onSquareClick({
    square,
  }: {
    square: string;
  }): void {
    if (!enabled) {
      updateSelection(null);
      return;
    }

    const target = square as Square;
    if (selectedSquare) {
      if (
        target !== selectedSquare &&
        onMove({
          sourceSquare: selectedSquare,
          targetSquare: target,
        })
      ) {
        updateSelection(null);
        return;
      }
    }

    try {
      const position = new Chess(fen);
      const piece = position.get(target);
      const isOwnTurn =
        piece?.color === position.turn();
      const hasLegalMove =
        isOwnTurn &&
        position.moves({
          square: target,
        }).length > 0;

      updateSelection(
        hasLegalMove ? target : null,
      );
    } catch {
      updateSelection(null);
    }
  }

  return {
    onSquareClick,
    squareStyles,
  };
}
