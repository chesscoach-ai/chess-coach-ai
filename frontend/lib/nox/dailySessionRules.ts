import type { NoxDailySession, NoxDailySessionType, StoredNoxDailySession } from "@/lib/nox/dailySessionTypes";
import type { NoxMission, NoxMissionReason } from "@/lib/nox/missionTypes";

const REASON_TO_TYPE: Record<NoxMissionReason, NoxDailySessionType> = {
  weakness_confirmed: "weakness",
  recent_failure: "recent_failure",
  spaced_review: "spaced_review",
  improvement_consolidation: "consolidation",
  learning_in_progress: "consolidation",
  guided_discovery: "discovery",
};

export function getLocalSessionDateKey(date = new Date(), timeZone = resolvedTimeZone()): string {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function resolvedTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"; }
  catch { return "Europe/Paris"; }
}

export function buildNoxDailySession(input: {
  mission: NoxMission;
  stored?: StoredNoxDailySession | null;
  now?: Date;
  timeZone?: string;
}): NoxDailySession {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? resolvedTimeZone();
  const dateKey = getLocalSessionDateKey(now, timeZone);
  const mission = input.mission;
  const sessionId = `daily:${dateKey}:${mission.id}`;
  const canResume = input.stored?.sessionId === sessionId;
  const serverCompletedIds = mission.results.map((result) => result.exerciseId);
  const completedExerciseIds = unique([
    ...serverCompletedIds,
    ...(canResume ? input.stored!.completedExerciseIds : []),
  ]).filter((id) => mission.exerciseIds.includes(id));
  const completed = mission.status === "completed" || completedExerciseIds.length >= mission.exerciseIds.length;
  const started = mission.status === "started" || Boolean(completedExerciseIds.length) || (canResume && input.stored!.status === "started");
  const estimatedMinutes = Math.min(7, Math.max(3, mission.exerciseIds.length + (mission.quiz ? 1 : 0) + 1));

  return {
    schemaVersion: 1,
    sessionId,
    dateKey,
    timeZone,
    type: REASON_TO_TYPE[mission.reasonCode],
    conceptId: mission.conceptId,
    conceptLabel: mission.conceptLabel,
    title: completed ? "Session terminée" : mission.persistent ? "Ta session du jour" : "Session découverte",
    reason: mission.persistent
      ? mission.reason
      : "Nox apprend encore à te connaître. Commençons par quelques positions : elles l’aideront à comprendre ce que vous pourrez travailler ensemble.",
    reasonCode: mission.reasonCode,
    estimatedMinutes,
    stepsCount: mission.exerciseIds.length + 2,
    currentStep: completed ? mission.exerciseIds.length + 2 : started ? completedExerciseIds.length + 1 : 0,
    status: completed ? "completed" : started ? "started" : "offered",
    exerciseIds: mission.exerciseIds,
    completedExerciseIds,
    successfulExercises: Math.max(mission.results.filter((result) => result.success).length, canResume ? input.stored!.successfulExercises : 0),
    sourceMissionId: mission.id,
    persistent: mission.persistent,
    startedAt: mission.startedAt ?? (canResume ? input.stored!.startedAt : null),
    completedAt: mission.completedAt ?? (completed && canResume ? input.stored!.completedAt : null),
    updatedAt: now.toISOString(),
    preview: mission.preview,
  };
}

export function explainDailySessionChoice(session: NoxDailySession): string {
  if (!session.persistent || session.type === "discovery") return "Cette découverte n’est pas encore personnalisée : elle aide Nox à commencer à comprendre ton jeu.";
  if (session.type === "weakness") return "Je te propose cette session parce que cette difficulté est revenue dans plusieurs positions.";
  if (session.type === "recent_failure") return "Je te propose cette session parce qu’une position récente mérite un second regard.";
  if (session.type === "spaced_review") return "Tu avais commencé à maîtriser cette notion. Une courte révision devrait aider à la consolider.";
  return "Cette notion progresse déjà. Quelques positions vont aider à transformer ce progrès en réflexe.";
}

function unique(values: string[]): string[] { return [...new Set(values)]; }
