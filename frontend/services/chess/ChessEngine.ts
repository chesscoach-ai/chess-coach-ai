import { Chess, Move, Square } from "chess.js";

export class ChessEngine {
  private game: Chess;

  constructor() {
    this.game = new Chess();
  }

  reset(): void {
    this.game.reset();
  }

  loadPGN(pgn: string): boolean {
    try {
      this.game.loadPgn(pgn);
      return true;
    } catch {
      return false;
    }
  }

  loadFEN(fen: string): boolean {
    try {
      this.game.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  move(from: Square, to: Square): Move | null {
    try {
      return (
        this.game.move({
          from,
          to,
          promotion: "q",
        }) ?? null
      );
    } catch {
      return null;
    }
  }

  undo(): Move | null {
    return this.game.undo();
  }

  getFEN(): string {
    return this.game.fen();
  }

  getPGN(): string {
    return this.game.pgn();
  }

  getHistory(): string[] {
    return this.game.history();
  }

  getVerboseHistory(): Move[] {
    return this.game.history({ verbose: true });
  }

  getTurn(): "w" | "b" {
    return this.game.turn();
  }

  isGameOver(): boolean {
    return this.game.isGameOver();
  }

  inCheck(): boolean {
    return this.game.inCheck();
  }
}