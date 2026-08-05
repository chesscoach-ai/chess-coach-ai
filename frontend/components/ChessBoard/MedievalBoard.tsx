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

const PIECE_ROLES: Record<
  string,
  ChessPieceRole
> = {
  P: "pawn",
  N: "knight",
  B: "bishop",
  R: "rook",
  Q: "queen",
  K: "king",
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
            className={`medieval-piece medieval-piece--${piece[0] === "w" ? "ivory" : "obsidian"} medieval-piece--${PIECE_ROLES[piece[1]]}`}
            style={svgStyle}
            role="img"
            aria-label={`${PIECE_NAMES[piece[1]]} ${piece[0] === "w" ? "blanc" : "noir"}`}
          >
            <span
              aria-hidden="true"
              className="medieval-piece__base"
            />
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

export function getBoardPalette(
  mode: BoardVisualMode,
): {
  dark: CSSProperties;
  light: CSSProperties;
} {
  if (mode === "classic") {
    return {
      dark: {
        backgroundColor: "#4b5563",
      },
      light: {
        backgroundColor: "#d1d5db",
      },
    };
  }

  return {
    dark: {
      backgroundColor: "#4a311f",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,255,255,0.06), transparent 34%, rgba(17,10,5,0.22)), repeating-linear-gradient(8deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 9px)",
    },
    light: {
      backgroundColor: "#c8aa72",
      backgroundImage:
        "linear-gradient(145deg, rgba(255,249,224,0.22), transparent 36%, rgba(82,52,24,0.14)), repeating-linear-gradient(-7deg, rgba(76,47,21,0.025) 0 2px, transparent 2px 10px)",
    },
  };
}

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
