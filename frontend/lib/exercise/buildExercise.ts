import { Chess, type Move } from "chess.js";

import type { ExerciseSession } from "@/types/exercise";

type BuildExerciseOptions = {
  id?: string;
  title?: string;
  description?: string;
  hints?: string[];
};

function createExerciseId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function moveToUci(move: Move): string {
  return `${move.from}${move.to}${
    move.promotion ?? ""
  }`.toLowerCase();
}

export function buildExercise(
  pgn: string,
  options: BuildExerciseOptions = {},
): ExerciseSession {
  const normalizedPgn = pgn.trim();

  if (!normalizedPgn) {
    throw new Error(
      "Le PGN de l’exercice est vide.",
    );
  }

  const game = new Chess();

  try {
    game.loadPgn(normalizedPgn);
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Format PGN invalide.";

    throw new Error(
      `Impossible de charger le PGN : ${reason}`,
    );
  }

  const moves = game.history({
    verbose: true,
  });

  if (moves.length === 0) {
    throw new Error(
      "Le PGN ne contient aucun coup exploitable.",
    );
  }

  const solution = moves.at(-1);

  if (!solution) {
    throw new Error(
      "Impossible d’identifier le coup solution.",
    );
  }

  /*
   * chess.js 1.4.0 fournit directement :
   *
   * solution.before = FEN avant le coup
   * solution.after  = FEN après le coup
   * solution.from   = case de départ
   * solution.to     = case d’arrivée
   * solution.lan    = notation longue
   *
   * Nous n’avons donc aucun coup à rejouer.
   */
  const startFen = solution.before;
  const solutionMove = moveToUci(solution);

  if (!startFen) {
    throw new Error(
      "Impossible de récupérer la position avant le coup solution.",
    );
  }

  const position = new Chess(startFen);

  const headers = game.getHeaders();

  return {
    id: options.id ?? createExerciseId(),

    title:
      options.title ??
      headers.Event ??
      "Exercice d’échecs",

    description:
      options.description ??
      "Trouve le meilleur coup dans cette position.",

    startFen,

    solutionMove,

    playerColor:
      position.turn() === "w"
        ? "white"
        : "black",

    hints:
      options.hints ??
      [
        "Commence par identifier les menaces immédiates.",
        "Cherche les échecs, les prises et les menaces.",
        `Observe particulièrement la pièce située en ${solution.from}.`,
      ],

    status: "idle",
    mistakes: 0,
    hintsUsed: 0,
    elapsedTime: 0,
  };
}