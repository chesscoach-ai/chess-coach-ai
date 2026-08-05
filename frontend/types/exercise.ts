export type ExerciseColor = "white" | "black";

export type ExerciseStatus =
  | "idle"
  | "correct"
  | "incorrect"
  | "completed";

export type ExerciseLineMove = {
  uci: string;
  san: string;
};

export interface ExerciseSession {
  id: string;
  sourceExampleId?: string;
  title: string;
  description?: string;

  /**
   * Position affichée au début de l'exercice.
   */
  startFen: string;

  /**
   * Coup attendu au format UCI.
   * Exemples : e2e4, e7e8q.
   */
  solutionMove: string;
  solutionSan?: string;
  solutionLine?: ExerciseLineMove[];
  currentPly?: number;
  coachNote?: string;
  champion?: string;
  decisionNumber?: number;
  decisionCount?: number;
  returnHref?: string;
  returnLabel?: string;
  placementDifficulty?: "débutant" | "intermédiaire" | "avancé";

  playerColor: ExerciseColor;
  hints: string[];

  status: ExerciseStatus;
  mistakes: number;
  hintsUsed: number;
  elapsedTime: number;
}

export interface ExerciseMove {
  from: string;
  to: string;
  promotion?: string;
}

export type ExerciseMoveResult = {
  correct: boolean;
  opponentMove?: string;
};
