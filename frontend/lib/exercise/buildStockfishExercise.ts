import {
  analyseExercisePosition,
  type ExerciseAnalysisResponse,
} from "@/lib/api/exerciseAnalysis";
import { buildExercise } from "@/lib/exercise/buildExercise";
import type { ExerciseSession } from "@/types/exercise";

type BuildStockfishExerciseOptions = {
  id?: string;
  sourceExampleId?: string;
  title?: string;
  description?: string;
  coachNote?: string;
  champion?: string;
  decisionNumber?: number;
  decisionCount?: number;
  hints?: string[];
  depth?: number;
  multipv?: number;
};

export type BuiltStockfishExercise = {
  session: ExerciseSession;
  analysis: ExerciseAnalysisResponse;
};

export async function buildStockfishExercise(
  pgn: string,
  options: BuildStockfishExerciseOptions = {},
): Promise<BuiltStockfishExercise> {
  /*
   * Première étape :
   * construire la position à partir du PGN.
   */
  const baseSession = buildExercise(
    pgn,
    {
      id: options.id,
      title: options.title,
      description: options.description,
      hints: options.hints,
    },
  );

  /*
   * Deuxième étape :
   * demander à Stockfish le meilleur coup
   * dans la position de départ.
   */
  const analysis =
    await analyseExercisePosition(
      baseSession.startFen,
      {
        depth: options.depth ?? 16,
        multipv: options.multipv ?? 3,
      },
    );

  if (!analysis.best_move) {
    throw new Error(
      "Stockfish n’a retourné aucun meilleur coup.",
    );
  }

  /*
   * On remplace la solution issue du PGN
   * par la véritable solution Stockfish.
   */
  const session: ExerciseSession = {
    ...baseSession,
    sourceExampleId:
      options.sourceExampleId,
    solutionMove:
      analysis.best_move.toLowerCase(),
    solutionSan:
      analysis.best_move_san,
    coachNote: options.coachNote,
    champion: options.champion,
    decisionNumber:
      options.decisionNumber,
    decisionCount:
      options.decisionCount,
    hints: [
      analysis.best_move_san.includes("#")
        ? "Il existe un mat : commence par examiner tous les échecs."
        : analysis.best_move_san.includes("x")
          ? "Une prise tactique mérite ton attention. Vérifie ce qui se passe après l’échange."
          : "Cherche le coup qui améliore le plus l’activité de tes pièces.",
      `La pièce décisive part de la case ${analysis.best_move.slice(0, 2)}.`,
      `Dernier coup de pouce : visualise le trajet ${analysis.best_move.slice(0, 2)} → ${analysis.best_move.slice(2, 4)}. La flèche te le montre sans jouer le coup.`,
    ],
  };

  return {
    session,
    analysis,
  };
}
