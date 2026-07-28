export type MoveClassification =
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type ReviewTheme =
  | "tactic"
  | "material"
  | "king-safety"
  | "development"
  | "initiative"
  | "endgame"
  | "calculation"
  | "other";

export type CriticalPosition = {
  id: string;
  ply: number;
  moveNumber: number;
  sideToMove: "white" | "black";
  fen: string;

  playedMoveUci: string;
  playedMoveSan?: string;

  bestMoveUci: string;
  bestMoveSan?: string;
  principalVariationUci?: string[];
  principalVariationSan?: string[];

  evaluationBeforeCp?: number;
  evaluationAfterCp?: number;
  evaluationLossCp: number;

  classification: MoveClassification;
  theme?: ReviewTheme;
  explanation?: string;
  hint?: string;
};

export type ReviewAttempt = {
  positionId: string;
  attemptedMoveUci: string;
  attemptedMoveSan?: string;
  isCorrect: boolean;
  evaluationDeltaCp?: number;
  createdAt: string;
};

export type PositionReviewResult = {
  positionId: string;
  solved: boolean;
  revealed: boolean;
  attempts: ReviewAttempt[];
  hintsUsed: number;
  completedAt?: string;
};

export type GuidedReviewSessionResult = {
  startedAt: string;
  completedAt: string;
  totalPositions: number;
  solvedWithoutReveal: number;
  revealedSolutions: number;
  totalAttempts: number;
  averageAttempts: number;
  results: PositionReviewResult[];
};
