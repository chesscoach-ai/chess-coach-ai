import type { NoxConceptId } from "@/lib/nox/memoryTypes";

export type NoxMissionDifficulty = "discovery" | "consolidation" | "mastery";
export type NoxMissionReason = "weakness_confirmed" | "improvement_consolidation" | "recent_failure" | "learning_in_progress" | "spaced_review" | "guided_discovery";
export type NoxMissionStatus = "offered" | "started" | "completed";

export type NoxMissionResult = { exerciseId: string; success: boolean; mistakes: number; hintsUsed: number; completedAt: string };

export type NoxMission = {
  id: string;
  schemaVersion: 1;
  conceptId: NoxConceptId;
  conceptLabel: string;
  title: string;
  reason: string;
  reasonCode: NoxMissionReason;
  confidence: "low" | "medium" | "high";
  difficulty: NoxMissionDifficulty;
  estimatedMinutes: number;
  exerciseIds: string[];
  quiz: { question: string; answers: string[]; correctAnswer: number; explanation: string } | null;
  status: NoxMissionStatus;
  currentStep: number;
  results: NoxMissionResult[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  nextEligibleAt: string;
  persistent: boolean;
  preview?: boolean;
};
