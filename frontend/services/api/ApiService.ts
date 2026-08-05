const SECURE_ANALYSIS_BASE_URL = "/api/analysis-engine";
let activeGameReviewId: string | null =
  null;

export function setActiveGameReviewId(
  gameId: string | null,
): void {
  activeGameReviewId = gameId;
}

function getAnalysisHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(activeGameReviewId
      ? {
          "X-Game-Review-Id":
            activeGameReviewId,
        }
      : {}),
  };
}

export type ApiHealthResponse = {
  status: string;
};

export type EvaluationType = "centipawn" | "mate";
export type ChessColor = "white" | "black";

export type PositionAnalysisRequest = {
  fen: string;
  depth?: number;
  multipv?: number;
};

export type MoveAnalysis = {
  rank: number;

  move: string;
  move_san: string;

  from_square: string;
  to_square: string;

  moved_piece: string;
  moved_piece_color: ChessColor;
  captured_piece: string | null;

  is_capture: boolean;
  gives_check: boolean;
  gives_checkmate: boolean;
  is_castling: boolean;
  is_promotion: boolean;
  promotion_piece: string | null;

  beginner_label: string;
  beginner_description: string;

  evaluation: number;
  evaluation_type: EvaluationType;
  evaluation_gap: number | null;

  depth: number;

  principal_variation: string[];
  principal_variation_uci: string[];

  strategic_ideas: string[];
  explanation: string;
};

export type PositionAnalysisResponse = {
  best_move: string;
  best_move_san: string;
  best_move_details: MoveAnalysis;

  principal_variation: string[];
  principal_variation_uci: string[];

  evaluation: number;
  evaluation_type: EvaluationType;
  depth: number;

  top_moves: MoveAnalysis[];
};

export type MoveClassification =
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type MoveReviewRequest = {
  fen_before: string;
  played_move: string;
  depth?: number;
};

export type MoveReviewResponse = {
  played_move: string;
  played_move_san: string;
  played_move_piece: string;

  best_move: string;
  best_move_san: string;
  best_move_piece: string;

  is_best_move: boolean;

  evaluation_before: number;
  evaluation_before_type: EvaluationType;

  evaluation_after: number;
  evaluation_after_type: EvaluationType;

  evaluation_loss: number;

  classification: MoveClassification;
  classification_label: string;

  explanation: string;

  best_variation: string[];
  best_variation_uci: string[];

  played_move_gives_check: boolean;
  played_move_is_capture: boolean;
  played_move_is_castling: boolean;
  played_move_is_promotion: boolean;
};



export type CoachLevel =
  | "beginner"
  | "intermediate"
  | "advanced";

export type CoachArrowKind =
  | "move"
  | "control"
  | "attack"
  | "defense";

export type CoachArrow = {
  from_square: string;
  to_square: string;
  kind: CoachArrowKind;
};

export type CoachExplainRequest = {
  fen: string;
  best_move: MoveAnalysis;
  question: string;
  level?: CoachLevel;
  played_move?: string | null;
};

export type CoachExplainResponse = {
  title: string;
  answer: string;
  highlights: string[];
  arrows: CoachArrow[];
  variation: string[];
  suggested_questions: string[];
  source: "rules";
};

type ApiErrorResponse = {
  detail?: string;
};

export class ApiService {
  private static async parseError(
    response: Response,
  ): Promise<Error> {
    let message = `Erreur HTTP ${response.status}`;

    try {
      const errorBody =
        (await response.json()) as ApiErrorResponse;

      if (errorBody.detail) {
        message = errorBody.detail;
      }
    } catch {
      // La réponse d’erreur ne contient pas forcément de JSON.
    }

    return new Error(message);
  }

  static async getHealth(): Promise<ApiHealthResponse> {
    const response = await fetch(
      `/api/engine-health?t=${Date.now()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw await ApiService.parseError(response);
    }

    return (
      await response.json()
    ) as ApiHealthResponse;
  }

  static async analysePosition(
    payload: PositionAnalysisRequest,
  ): Promise<PositionAnalysisResponse> {
    const response = await fetch(
      `${SECURE_ANALYSIS_BASE_URL}/analysis`,
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          fen: payload.fen,
          depth: payload.depth ?? 15,
          multipv: payload.multipv ?? 3,
        }),
      },
    );

    if (!response.ok) {
      throw await ApiService.parseError(response);
    }

    return (
      await response.json()
    ) as PositionAnalysisResponse;
  }

  static async reviewMove(
    payload: MoveReviewRequest,
  ): Promise<MoveReviewResponse> {
    const response = await fetch(
      `${SECURE_ANALYSIS_BASE_URL}/move-review`,
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          fen_before: payload.fen_before,
          played_move: payload.played_move,
          depth: payload.depth ?? 15,
        }),
      },
    );

    if (!response.ok) {
      throw await ApiService.parseError(response);
    }

    return (
      await response.json()
    ) as MoveReviewResponse;
  }


  static async explainWithCoach(
    payload: CoachExplainRequest,
  ): Promise<CoachExplainResponse> {
    const response = await fetch(
      `${SECURE_ANALYSIS_BASE_URL}/coach/explain`,
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          fen: payload.fen,
          best_move: payload.best_move,
          question: payload.question,
          level: payload.level ?? "beginner",
          played_move: payload.played_move ?? null,
        }),
      },
    );

    if (!response.ok) {
      throw await ApiService.parseError(response);
    }

    return (
      await response.json()
    ) as CoachExplainResponse;
  }
}
