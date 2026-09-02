import type { NoxConceptId } from "@/lib/nox/memoryTypes";
import type { NoxMissionReason } from "@/lib/nox/missionTypes";

export type NoxDailySessionStatus = "offered" | "started" | "completed";
export type NoxDailySessionType = "discovery" | "weakness" | "recent_failure" | "spaced_review" | "consolidation";

export type NoxDailySession = {
  schemaVersion: 1;
  sessionId: string;
  dateKey: string;
  timeZone: string;
  type: NoxDailySessionType;
  conceptId: NoxConceptId;
  conceptLabel: string;
  title: string;
  reason: string;
  reasonCode: NoxMissionReason;
  estimatedMinutes: number;
  stepsCount: number;
  currentStep: number;
  status: NoxDailySessionStatus;
  exerciseIds: string[];
  completedExerciseIds: string[];
  successfulExercises: number;
  sourceMissionId: string;
  persistent: boolean;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  preview?: boolean;
};

export type StoredNoxDailySession = Pick<
  NoxDailySession,
  "schemaVersion" | "sessionId" | "dateKey" | "timeZone" | "status" | "completedExerciseIds" | "successfulExercises" | "startedAt" | "completedAt" | "updatedAt"
> & { completionEventSent: boolean };
