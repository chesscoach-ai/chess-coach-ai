export type DiagnosticSeverity =
  | "info"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type DiagnosticTheme =
  | "tactic"
  | "material"
  | "king-safety"
  | "development"
  | "piece-activity"
  | "pawn-structure"
  | "initiative"
  | "calculation"
  | "endgame"
  | "opening"
  | "other";

export type DiagnosticSignal = {
  key: string;
  value:
    | string
    | number
    | boolean
    | null;
  confidence?: number;
};

export type PedagogicalDiagnostic = {
  id: string;
  ply: number;
  moveNumber: number;
  side: "white" | "black";

  playedMoveUci: string;
  playedMoveSan?: string;
  bestMoveUci: string;
  bestMoveSan?: string;

  severity: DiagnosticSeverity;
  primaryTheme: DiagnosticTheme;
  secondaryThemes: DiagnosticTheme[];

  evaluationBeforeCp?: number;
  evaluationAfterCp?: number;
  evaluationLossCp: number;

  title: string;
  summary: string;
  whyItMatters: string;
  coachingAdvice: string;
  hint: string;

  principalVariationSan?: string[];
  principalVariationUci?: string[];

  signals: DiagnosticSignal[];
  confidence: number;
};
