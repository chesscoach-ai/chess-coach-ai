import {
  recordAnalysisFinished,
  recordAnalysisStarted,
} from "./analysisDiagnostics";

const SECURE_ANALYSIS_BASE_URL = "/api/analysis-engine";
const DEFAULT_TIMEOUT_MS = 65_000;
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

export type AnalysisRequestState =
  import("./analysisDiagnostics").AnalysisRequestState;

export type AnalysisRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  onStateChange?: (state: AnalysisRequestState) => void;
};

export type AnalysisErrorKind =
  | "invalid_position"
  | "saturated"
  | "timeout"
  | "unauthorized"
  | "unavailable"
  | "network"
  | "cancelled"
  | "unknown";

export class AnalysisApiError extends Error {
  constructor(
    message: string,
    public readonly kind: AnalysisErrorKind,
    public readonly status: number | null,
    public readonly technicalDetail: string | null = null,
  ) {
    super(message);
    this.name = "AnalysisApiError";
  }
}

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

export type AiMoveResponse = {
  move: {
    from: string;
    to: string;
    san: string;
    promotion: string | null;
  };
  opponent: string;
  estimatedElo: number;
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
  message?: string;
};

function friendlyHttpError(
  status: number,
  technicalDetail: string | null,
): AnalysisApiError {
  if (status === 400 || status === 422) {
    return new AnalysisApiError(
      "La position ne peut pas être analysée.",
      "invalid_position",
      status,
      technicalDetail,
    );
  }
  if (status === 503 || status === 429) {
    return new AnalysisApiError(
      "L’analyse est très sollicitée. Réessaie dans quelques secondes.",
      "saturated",
      status,
      technicalDetail,
    );
  }
  if (status === 504) {
    return new AnalysisApiError(
      "Cette position demande plus de temps que prévu.",
      "timeout",
      status,
      technicalDetail,
    );
  }
  if (status === 401 || status === 403) {
    return new AnalysisApiError(
      "Connecte-toi pour utiliser cette fonction du coach.",
      "unauthorized",
      status,
      technicalDetail,
    );
  }
  return new AnalysisApiError(
    "Knightly n’arrive pas à joindre le service d’analyse pour le moment. Tu peux continuer à jouer et réessayer ensuite.",
    "unavailable",
    status,
    technicalDetail,
  );
}

export class ApiService {
  private static async parseError(
    response: Response,
  ): Promise<AnalysisApiError> {
    let detail: string | null = null;

    try {
      const errorBody =
        (await response.json()) as ApiErrorResponse;

      detail = errorBody.detail ?? errorBody.message ?? null;
    } catch {
      // La réponse d’erreur ne contient pas forcément de JSON.
    }

    return friendlyHttpError(response.status, detail);
  }

  private static async request<T>(
    endpoint: string,
    init: RequestInit,
    options: AnalysisRequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = globalThis.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    const startedAt = recordAnalysisStarted(endpoint);
    options.onStateChange?.("calculating");

    try {
      const response = await fetch(endpoint, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw await ApiService.parseError(response);
      const payload = (await response.json()) as T;
      recordAnalysisFinished({
        endpoint,
        state: "ready",
        startedAt,
        httpStatus: response.status,
      });
      options.onStateChange?.("ready");
      return payload;
    } catch (error) {
      if (controller.signal.aborted) {
        const cancelled = !timedOut;
        const normalized = new AnalysisApiError(
          timedOut
            ? "Cette position demande plus de temps que prévu."
            : "Analyse annulée.",
          timedOut ? "timeout" : "cancelled",
          timedOut ? 504 : null,
        );
        recordAnalysisFinished({
          endpoint,
          state: timedOut ? "unavailable" : "idle",
          startedAt,
          httpStatus: normalized.status,
          cancelled,
          error: timedOut,
        });
        options.onStateChange?.(timedOut ? "unavailable" : "idle");
        throw normalized;
      }
      const normalized =
        error instanceof AnalysisApiError
          ? error
          : new AnalysisApiError(
              "Le moteur d’analyse ne répond pas. Vérifie ta connexion puis réessaie.",
              "network",
              null,
              error instanceof Error ? error.message : null,
            );
      recordAnalysisFinished({
        endpoint,
        state:
          normalized.kind === "unavailable" ||
          normalized.kind === "saturated" ||
          normalized.kind === "timeout" ||
          normalized.kind === "network"
            ? "unavailable"
            : "error",
        startedAt,
        httpStatus: normalized.status,
        error: true,
      });
      options.onStateChange?.(
        normalized.kind === "unavailable" ||
          normalized.kind === "saturated" ||
          normalized.kind === "timeout" ||
          normalized.kind === "network"
          ? "unavailable"
          : "error",
      );
      throw normalized;
    } finally {
      globalThis.clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
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
    options: AnalysisRequestOptions = {},
  ): Promise<PositionAnalysisResponse> {
    return ApiService.request<PositionAnalysisResponse>(
      `${SECURE_ANALYSIS_BASE_URL}/analysis`,
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        body: JSON.stringify({
          fen: payload.fen,
          depth: payload.depth ?? 15,
          multipv: payload.multipv ?? 3,
        }),
      },
      options,
    );
  }

  static async reviewMove(
    payload: MoveReviewRequest,
    options: AnalysisRequestOptions = {},
  ): Promise<MoveReviewResponse> {
    return ApiService.request<MoveReviewResponse>(
      `${SECURE_ANALYSIS_BASE_URL}/move-review`,
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        body: JSON.stringify({
          fen_before: payload.fen_before,
          played_move: payload.played_move,
          depth: payload.depth ?? 15,
        }),
      },
      options,
    );
  }


  static async explainWithCoach(
    payload: CoachExplainRequest,
    options: AnalysisRequestOptions = {},
  ): Promise<CoachExplainResponse> {
    return ApiService.request<CoachExplainResponse>(
      `${SECURE_ANALYSIS_BASE_URL}/coach/explain`,
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        body: JSON.stringify({
          fen: payload.fen,
          best_move: payload.best_move,
          question: payload.question,
          level: payload.level ?? "beginner",
          played_move: payload.played_move ?? null,
        }),
      },
      options,
    );
  }

  static analyseExercise(
    fen: string,
    options: AnalysisRequestOptions & { depth?: number; multipv?: number } = {},
  ): Promise<ExerciseAnalysisResponse> {
    return ApiService.request<ExerciseAnalysisResponse>(
      "/api/exercise-engine",
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        body: JSON.stringify({
          fen,
          depth: options.depth ?? 16,
          multipv: options.multipv ?? 3,
        }),
      },
      options,
    );
  }

  static requestAiMove(
    payload: { fen: string; levelId: string; personaId: string },
    options: AnalysisRequestOptions = {},
  ): Promise<AiMoveResponse> {
    return ApiService.request<AiMoveResponse>(
      "/api/ai-move",
      {
        method: "POST",
        headers: getAnalysisHeaders(),
        body: JSON.stringify(payload),
      },
      options,
    );
  }
}
