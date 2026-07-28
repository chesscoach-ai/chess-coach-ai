import { Chess } from "chess.js";

import type {
  PGNExample,
  PGNExampleDifficulty,
} from "@/data/pgn/examples";

export type PGNExampleMetrics = {
  halfMoveCount: number;
  fullMoveCount: number;
  estimatedMinutes: number;
  sideToMove: "Blancs" | "Noirs";
  estimatedElo: string;
};

const ELO_BY_DIFFICULTY: Record<
  PGNExampleDifficulty,
  string
> = {
  débutant: "800–1200",
  intermédiaire: "1200–1700",
  avancé: "1700+",
};

export function getPGNExampleMetrics(
  example: PGNExample,
): PGNExampleMetrics {
  const game = new Chess();

  try {
    game.loadPgn(example.pgn);

    const halfMoveCount =
      game.history().length;
    const fullMoveCount = Math.ceil(
      halfMoveCount / 2,
    );

    return {
      halfMoveCount,
      fullMoveCount,
      estimatedMinutes:
        estimateDuration(
          halfMoveCount,
          example.difficulty,
        ),
      sideToMove:
        game.turn() === "w"
          ? "Blancs"
          : "Noirs",
      estimatedElo:
        ELO_BY_DIFFICULTY[
          example.difficulty
        ],
    };
  } catch {
    return {
      halfMoveCount: 0,
      fullMoveCount: 0,
      estimatedMinutes: 3,
      sideToMove: "Blancs",
      estimatedElo:
        ELO_BY_DIFFICULTY[
          example.difficulty
        ],
    };
  }
}

function estimateDuration(
  halfMoveCount: number,
  difficulty: PGNExampleDifficulty,
): number {
  const baseMinutes =
    difficulty === "débutant"
      ? 3
      : difficulty ===
          "intermédiaire"
        ? 5
        : 7;

  const moveAdjustment = Math.min(
    4,
    Math.floor(halfMoveCount / 10),
  );

  return baseMinutes + moveAdjustment;
}