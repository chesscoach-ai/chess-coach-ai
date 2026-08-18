export const NOX_CONCEPT_IDS = [
  "development",
  "king_safety",
  "hanging_pieces",
  "forks",
  "calculation",
  "material",
  "positioning",
  "endgame",
] as const;

export type NoxConceptId = (typeof NOX_CONCEPT_IDS)[number];

export type LearningEventType =
  | "move_review"
  | "exercise_attempt"
  | "exercise_success"
  | "exercise_failure"
  | "mission_completed"
  | "game_completed"
  | "concept_detected";

export type LearningOutcome = "success" | "failure" | "neutral";
export type ConceptMasteryStatus =
  | "observing"
  | "learning"
  | "weakness"
  | "improving"
  | "mastered";

export type LearningEvent = {
  id: string;
  type: LearningEventType;
  conceptId: NoxConceptId;
  outcome: LearningOutcome;
  occurredAt: string;
  sourceId: string;
};

export type ConceptMastery = {
  conceptId: NoxConceptId;
  score: number;
  observations: number;
  successes: number;
  failures: number;
  lastObservedAt: string;
  trend: "stable" | "up" | "down";
  status: ConceptMasteryStatus;
  weaknessObserved: boolean;
};

export type NoxGoal = {
  conceptId: NoxConceptId;
  label: string;
  createdAt: string;
};

export type NoxMilestone = {
  id: string;
  kind: "first_mastery" | "important_improvement";
  conceptId: NoxConceptId;
  label: string;
  occurredAt: string;
};

export type NoxMemoryProfile = {
  schemaVersion: 1;
  estimatedLevel: "beginner" | "intermediate" | "advanced";
  levelConfidence: number;
  mastery: Partial<Record<NoxConceptId, ConceptMastery>>;
  goals: NoxGoal[];
  milestones: NoxMilestone[];
  updatedAt: string;
};

export type NoxMemorySummary = {
  strengths: NoxConceptId[];
  weaknesses: NoxConceptId[];
  learning: NoxConceptId[];
  improving: NoxConceptId[];
  goal: NoxConceptId | null;
};

export type NoxMemoryEnvelope = {
  profile: NoxMemoryProfile;
  summary: NoxMemorySummary;
  persistent: boolean;
};

