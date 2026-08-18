"use client";

import { Chess } from "chess.js";

type Color = "white" | "black";
type PieceType = "q" | "r" | "b" | "n" | "p";

const INITIAL_COUNTS: Record<PieceType, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const VALUES: Record<PieceType, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const SYMBOLS: Record<Color, Record<PieceType, string>> = {
  white: { q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  black: { q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};
const NAMES: Record<PieceType, string> = {
  q: "dame",
  r: "tour",
  b: "fou",
  n: "cavalier",
  p: "pion",
};

export function CapturedRow({
  capturer,
  pieces,
  align,
}: {
  capturer: Color;
  pieces: PieceType[];
  align: "start" | "end";
}) {
  const capturedColor: Color = capturer === "white" ? "black" : "white";
  const label = pieces.length
    ? `${capturer === "white" ? "Les Blancs" : "Les Noirs"} ont pris ${pieces.map((piece) => NAMES[piece]).join(", ")}`
    : `${capturer === "white" ? "Les Blancs" : "Les Noirs"} n’ont encore pris aucune pièce`;
  return (
    <div
      aria-label={label}
      className={`flex min-h-7 items-center gap-1 rounded-lg border border-gray-800/80 bg-gray-950/55 px-2 py-1 ${align === "end" ? "justify-end" : "justify-start"}`}
    >
      <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.1em] text-gray-600">
        Prises
      </span>
      {pieces.length ? (
        pieces.map((piece, index) => (
          <span
            key={`${piece}-${index}`}
            aria-hidden="true"
            className={`text-lg leading-none ${capturedColor === "white" ? "text-slate-100" : "text-slate-500"}`}
          >
            {SYMBOLS[capturedColor][piece]}
          </span>
        ))
      ) : (
        <span className="text-[10px] text-gray-700">—</span>
      )}
      {materialScore(pieces) > 0 && (
        <span className="ml-1 text-[10px] font-black text-gray-500">{materialScore(pieces)} pts</span>
      )}
    </div>
  );
}

export function getCapturedPieces(fen: string): Record<Color, PieceType[]> {
  const remaining: Record<Color, Record<PieceType, number>> = {
    white: { q: 0, r: 0, b: 0, n: 0, p: 0 },
    black: { q: 0, r: 0, b: 0, n: 0, p: 0 },
  };
  try {
    const game = new Chess(fen);
    for (const row of game.board()) {
      for (const piece of row) {
        if (piece && piece.type !== "k") remaining[piece.color === "w" ? "white" : "black"][piece.type as PieceType] += 1;
      }
    }
  } catch {
    return { white: [], black: [] };
  }
  const order: PieceType[] = ["q", "r", "b", "n", "p"];
  const missing = (color: Color) =>
    order.flatMap((piece) =>
      Array.from({ length: Math.max(0, INITIAL_COUNTS[piece] - remaining[color][piece]) }, () => piece),
    );
  return {
    white: missing("black"),
    black: missing("white"),
  };
}

function materialScore(pieces: PieceType[]): number {
  return pieces.reduce((sum, piece) => sum + VALUES[piece], 0);
}
