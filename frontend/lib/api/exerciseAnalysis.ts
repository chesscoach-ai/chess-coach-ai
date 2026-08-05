export type ExerciseEngineMove = {
  uci: string;
  san: string;
  evaluation: number | null;
  mate_in: number | null;
  principal_variation: string[];
  principal_variation_uci: string[];
};

export type ExerciseAnalysisResponse = {
  fen: string;
  best_move: string;
  best_move_san: string;
  moves: ExerciseEngineMove[];
};

type AnalyseExercisePositionOptions = {
  depth?: number;
  multipv?: number;
};

function extractErrorMessage(
  payload: unknown,
): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "detail" in payload &&
    typeof payload.detail === "string"
  ) {
    return payload.detail;
  }

  return null;
}

export async function analyseExercisePosition(
  fen: string,
  options: AnalyseExercisePositionOptions = {},
): Promise<ExerciseAnalysisResponse> {
  const {
    depth = 16,
    multipv = 3,
  } = options;

  const response = await fetch(
    "/api/exercise-engine",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fen,
        depth,
        multipv,
      }),
    },
  );

  if (!response.ok) {
    let errorMessage =
      "L’analyse Stockfish a échoué.";

    try {
      const payload: unknown =
        await response.json();

      errorMessage =
        extractErrorMessage(payload) ??
        errorMessage;
    } catch {
      // La réponse du backend ne contient pas de JSON exploitable.
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<ExerciseAnalysisResponse>;
}
