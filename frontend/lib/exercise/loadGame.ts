import { Chess } from "chess.js";

export function loadGame(pgn: string): Chess {
  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    throw new Error("Impossible de charger le PGN.");
  }

  return chess;
}
