import type { MoveClassification } from "@/services/api/ApiService";

export type LearningTheme =
  | "opening"
  | "tactics"
  | "material"
  | "calculation"
  | "positional"
  | "endgame";

export type LearningMoveSample = {
  moveIndex: number;
  classification: MoveClassification;
  evaluationLoss: number;
  isCapture: boolean;
  bestVariation: string[];
};

export type LearningSessionInput = {
  moves: string[];
  reviews: LearningMoveSample[];
};

export type ThemeAggregate = {
  occurrences: number;
  severeErrors: number;
  totalLoss: number;
};

export type StoredLearningProfile = {
  userId: string;
  sessionsCount: number;
  analyzedMoves: number;
  totalEvaluationLoss: number;
  classifications: Record<MoveClassification, number>;
  themes: Record<LearningTheme, ThemeAggregate>;
  fingerprints: string[];
  updatedAt: string;
};

export type LearningRecommendation = {
  theme: LearningTheme;
  title: string;
  explanation: string;
  action: string;
};

export type LearningProfile = {
  playerName: string;
  rating: number;
  levelLabel: string;
  sessionsCount: number;
  analyzedMoves: number;
  message: string;
  primaryWeakness: LearningTheme | null;
  primaryWeaknessLabel: string | null;
  strength: string | null;
  recommendations: LearningRecommendation[];
  averageEvaluationLoss: number;
  classifications: Record<MoveClassification, number>;
  themeOccurrences: Record<LearningTheme, number>;
  updatedAt: string | null;
};
