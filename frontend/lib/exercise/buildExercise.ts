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

  // Le dernier coup du PGN est la décision pédagogique préparée par
  // l'auteur de l'exercice. Les variantes Stockfish, elles, peuvent
  // proposer une séquence plus longue.
  const startFen = solution.before;
  const solutionMove = moveToUci(solution);
  const solutionLine = [
    {
      uci: solutionMove,
      san: solution.san,
    },
  ];

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

    solutionSan: solution.san,

    solutionLine,

    currentPly: 0,

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
