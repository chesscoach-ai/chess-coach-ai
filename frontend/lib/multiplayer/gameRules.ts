import { Chess, type Move } from "chess.js";

import type {
  GameResult,
  OnlineMoveInput,
  PlayerColor,
} from "@/lib/multiplayer/types";

export type AppliedOnlineMove = {
  fen: string;
  san: string;
  uci: string;
  nextTurn: PlayerColor;
  result: GameResult | null;
  termination: string | null;
};

export function applyOnlineMove(
  fen: string,
  input: OnlineMoveInput,
  history: OnlineMoveInput[] = [],
): AppliedOnlineMove {
  const game = history.length > 0 ? replayGame(history) : new Chess(fen);
  if (game.fen() !== fen) {
    throw new Error("GAME_STATE_INVALID");
  }
  let move: Move;

  try {
    move = game.move({
      from: input.from,
      to: input.to,
      promotion: input.promotion ?? "q",
    });
  } catch {
    throw new Error("ILLEGAL_MOVE");
  }

  if (!move) {
    throw new Error("ILLEGAL_MOVE");
  }

  const outcome = getChessOutcome(game);

  return {
    fen: game.fen(),
    san: move.san,
    uci: `${move.from}${move.to}${move.promotion ?? ""}`,
    nextTurn: game.turn() === "w" ? "white" : "black",
    ...outcome,
  };
}

function replayGame(history: OnlineMoveInput[]): Chess {
  const game = new Chess();
  try {
    for (const move of history) {
      game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      });
    }
  } catch {
    throw new Error("GAME_STATE_INVALID");
  }
  return game;
}

export function getChessOutcome(game: Chess): {
  result: GameResult | null;
  termination: string | null;
} {
  if (game.isCheckmate()) {
    return game.turn() === "w"
      ? {
          result: "0-1",
          termination: "Victoire des Noirs par échec et mat",
        }
      : {
          result: "1-0",
          termination: "Victoire des Blancs par échec et mat",
        };
  }

  if (game.isStalemate()) {
    return { result: "1/2-1/2", termination: "Partie nulle par pat" };
  }
  if (game.isThreefoldRepetition()) {
    return {
      result: "1/2-1/2",
      termination: "Partie nulle par répétition",
    };
  }
  if (game.isInsufficientMaterial()) {
    return {
      result: "1/2-1/2",
      termination: "Partie nulle : matériel insuffisant",
    };
  }
  if (game.isDraw()) {
    return { result: "1/2-1/2", termination: "Partie nulle" };
  }

  return { result: null, termination: null };
}

export function calculateEloRatings(
  whiteRating: number,
  blackRating: number,
  result: GameResult,
  kFactor = 32,
): { white: number; black: number } {
  const expectedWhite =
    1 / (1 + 10 ** ((blackRating - whiteRating) / 400));
  const expectedBlack = 1 - expectedWhite;
  const whiteScore = result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
  const blackScore = 1 - whiteScore;

  return {
    white: Math.round(
      whiteRating + kFactor * (whiteScore - expectedWhite),
    ),
    black: Math.round(
      blackRating + kFactor * (blackScore - expectedBlack),
    ),
  };
}

export function currentClockValues(input: {
  whiteMs: number;
  blackMs: number;
  turn: PlayerColor;
  turnStartedAt: string | null;
  now?: Date;
}): { whiteMs: number; blackMs: number } {
  if (!input.turnStartedAt) {
    return { whiteMs: input.whiteMs, blackMs: input.blackMs };
  }

  const now = input.now ?? new Date();
  const elapsed = Math.max(
    0,
    now.getTime() - new Date(input.turnStartedAt).getTime(),
  );

  return input.turn === "white"
    ? {
        whiteMs: Math.max(0, input.whiteMs - elapsed),
        blackMs: input.blackMs,
      }
    : {
        whiteMs: input.whiteMs,
        blackMs: Math.max(0, input.blackMs - elapsed),
      };
}
