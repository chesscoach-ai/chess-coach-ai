export type ExerciseColor = "white" | "black";

export type ExerciseStatus =
  | "idle"
  | "correct"
  | "incorrect"
  | "completed";

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
  coachNote?: string;
  champion?: string;
  decisionNumber?: number;
  decisionCount?: number;

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
