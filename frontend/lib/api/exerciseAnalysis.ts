import {
  ApiService,
  type ExerciseAnalysisResponse,
  type ExerciseEngineMove,
} from "@/services/api/ApiService";

export type { ExerciseAnalysisResponse, ExerciseEngineMove };

type AnalyseExercisePositionOptions = {
  depth?: number;
  multipv?: number;
};

export async function analyseExercisePosition(
  fen: string,
  options: AnalyseExercisePositionOptions = {},
): Promise<ExerciseAnalysisResponse> {
  const {
    depth = 16,
    multipv = 3,
  } = options;

  return ApiService.analyseExercise(fen, { depth, multipv });
}
