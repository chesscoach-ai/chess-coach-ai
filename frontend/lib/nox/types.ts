import type {
  MoveClassification,
  PositionAnalysisResponse,
  MoveReviewResponse,
} from "@/services/api/ApiService";

export type NoxState =
  | "idle"
  | "thinking"
  | "tip"
  | "success"
  | "warning";

export type NoxQuickAction =
  | "why"
  | "plan"
  | "missed"
  | "show";

export type NoxMode = "analysis" | "exercise";

export type NoxContext = {
  contextKey: string;
  mode: NoxMode;
  isThinking?: boolean;
  review?: MoveReviewResponse | null;
  analysis?: PositionAnalysisResponse | null;
  exerciseStatus?: "idle" | "incorrect" | "correct" | "completed";
  primaryMessage?: string | null;
  exerciseHint?: string | null;
};

export type NoxReply = {
  state: NoxState;
  title: string;
  message: string;
  classification?: MoveClassification | null;
  classificationLabel?: string | null;
  suggestedMove?: string | null;
  lesson?: string | null;
  conceptLabel?: string | null;
  followUp?: string | null;
};

export interface NoxProvider {
  getReply(
    context: NoxContext,
    action?: NoxQuickAction | null,
  ): NoxReply;
}

export type NoxPlayerLevel = "beginner" | "intermediate" | "advanced";

export type ServerNoxMove = {
  uci: string;
  san: string;
  piece: string;
  piece_color: "white" | "black";
  from_square: string;
  to_square: string;
};

export type ServerNoxContext = {
  schema_version: "1.0";
  language: "fr";
  player_level: NoxPlayerLevel;
  interaction: {
    depth: "reaction" | "explanation" | "conversation";
    question: "reaction" | NoxQuickAction;
  };
  position: { side_to_move: "white" | "black" };
  played_move: ServerNoxMove | null;
  classification: {
    code: MoveClassification;
    evaluation_loss: number;
  } | null;
  best_move: ServerNoxMove | null;
  evaluation: {
    before: number | null;
    after: number | null;
    type: "centipawn" | "mate";
  } | null;
  facts: {
    capture: boolean;
    check: boolean;
    checkmate: boolean;
    castle: boolean;
    promotion: boolean;
  };
  heuristics: Array<{
    id: string;
    source: "deterministic_rules";
  }>;
};

export type ServerNoxResponse = {
  schema_version: "1.0";
  state: NoxState;
  title: string;
  message: string;
  lesson: string | null;
  concept: { id: string; label: string } | null;
  follow_up: string | null;
  referenced_move_uci: string | null;
  visual: {
    arrows: Array<{
      from_square: string;
      to_square: string;
      kind: "move" | "control" | "attack" | "defense";
    }>;
    highlights: string[];
  };
};

export type NoxIntelligenceResult = {
  response: ServerNoxResponse;
  source: "deterministic" | "openai" | "cache";
  policy:
    | "deterministic_only"
    | "ai_preferred"
    | "ai_required_if_available";
  fallback_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
};
