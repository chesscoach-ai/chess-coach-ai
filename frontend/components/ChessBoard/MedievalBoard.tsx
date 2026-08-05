"use client";

import type { CSSProperties } from "react";

import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";
import {
  readExperiencePreferences,
  saveExperiencePreferences,
} from "@/lib/preferences/experience";

export type BoardVisualMode =
  | "classic"
  | "medieval";

export type ChessPieceRole =
  | "pawn"
  | "knight"
  | "bishop"
  | "rook"
  | "queen"
  | "king";

const PIECE_GLYPHS: Record<
  string,
  string
> = {
  wP: "♙",
  wN: "♘",
  wB: "♗",
  wR: "♖",
  wQ: "♕",
  wK: "♔",
  bP: "♟",
  bN: "♞",
  bB: "♝",
  bR: "♜",
  bQ: "♛",
  bK: "♚",
};

const PIECE_NAMES: Record<
  string,
  string
> = {
  P: "pion",
  N: "cavalier",
  B: "fou",
  R: "tour",
  Q: "dame",
  K: "roi",
};

export const MEDIEVAL_PIECES =
  Object.fromEntries(
    Object.entries(PIECE_GLYPHS).map(
      ([piece, glyph]) => [
        piece,
        ({
          svgStyle,
        }: {
          svgStyle?: CSSProperties;
        } = {}) => (
          <span
            className={`medieval-piece medieval-piece--${piece[0] === "w" ? "ivory" : "obsidian"}`}
            style={svgStyle}
            role="img"
            aria-label={`${PIECE_NAMES[piece[1]]} ${piece[0] === "w" ? "blanc" : "noir"}`}
          >
            <span
              aria-hidden="true"
              className="medieval-piece__crest"
            >
              CC
            </span>
            <span
              aria-hidden="true"
              className="medieval-piece__glyph"
            >
              {glyph}
            </span>
          </span>
        ),
      ],
    ),
  );

export function useBoardVisualMode(): {
  mode: BoardVisualMode;
  toggle: () => void;
} {
  const preferences =
    useExperiencePreferences();

  return {
    mode: preferences.boardVisualMode,
    toggle: () => {
      const current =
        readExperiencePreferences();
      saveExperiencePreferences({
        ...current,
        boardVisualMode:
          current.boardVisualMode ===
          "medieval"
            ? "classic"
            : "medieval",
      });
    },
  };
}

export function BoardModeToggle({
  mode,
  onToggle,
}: {
  mode: BoardVisualMode;
  onToggle: () => void;
}) {
  const isMedieval =
    mode === "medieval";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isMedieval}
      title={
        isMedieval
          ? "Revenir à l’échiquier classique"
          : "Entrer dans l’arène médiévale"
      }
      className="board-mode-toggle"
    >
      <span aria-hidden="true">
        {isMedieval ? "♜" : "♞"}
      </span>
      <span>
        {isMedieval
          ? "2D classique"
          : "3D médiéval"}
      </span>
    </button>
  );
}

export function getChessPieceRole(
  pieceType: string | undefined,
): ChessPieceRole {
  switch (
    pieceType?.slice(-1).toLowerCase()
  ) {
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
    default:
      return "pawn";
  }
}
