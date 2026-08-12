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
};

export interface NoxProvider {
  getReply(
    context: NoxContext,
    action?: NoxQuickAction | null,
  ): NoxReply;
}
