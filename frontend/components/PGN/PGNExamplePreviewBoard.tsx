"use client";

import { useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

import type { PGNExample } from "@/data/pgn/examples";

type PGNExamplePreviewBoardProps = {
  example: PGNExample;
};

export default function PGNExamplePreviewBoard({
  example,
}: PGNExamplePreviewBoardProps) {
  const preview = useMemo(
    () => buildPreview(example),
    [example],
  );

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-950 shadow-inner">
      <Chessboard
        options={{
          position: preview.fen,
          boardOrientation:
            preview.orientation,
          allowDragging: false,
          showNotation: false,
          animationDurationInMs: 0,
          darkSquareStyle: {
            backgroundColor: "#4b5563",
          },
          lightSquareStyle: {
            backgroundColor: "#d1d5db",
          },
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8">
        <p className="truncate text-xs font-semibold text-white">
          Position d’entraînement
        </p>

        <p className="mt-0.5 text-[11px] text-gray-300">
          {preview.moveCount > 0
            ? `${preview.moveCount} demi-coup${
                preview.moveCount > 1
                  ? "s"
                  : ""
              }`
            : "Position initiale"}
        </p>
      </div>
    </div>
  );
}

function buildPreview(
  example: PGNExample,
): {
  fen: string;
  moveCount: number;
  orientation: "white" | "black";
} {
  const game = new Chess();

  try {
    game.loadPgn(example.pgn);

    return {
      fen: game.fen(),
      moveCount: game.history().length,
      orientation:
        game.turn() === "w"
          ? "white"
          : "black",
    };
  } catch {
    return {
      fen: new Chess().fen(),
      moveCount: 0,
      orientation: "white",
    };
  }
}