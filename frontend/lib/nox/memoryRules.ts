import type {
  ConceptMastery,
  LearningEvent,
  NoxConceptId,
  NoxMemoryProfile,
  NoxMemorySummary,
} from "@/lib/nox/memoryTypes";

export const NOX_CONCEPT_LABELS: Record<NoxConceptId, string> = {
  development: "développer tes pièces",
  king_safety: "mettre ton roi en sécurité",
  hanging_pieces: "repérer les pièces non protégées",
  forks: "voir les fourchettes",
  calculation: "calculer la réponse adverse",
  material: "gérer les échanges de pièces",
  positioning: "améliorer le placement de tes pièces",
  endgame: "jouer les finales",
};

export const NOX_GOAL_LABELS: Record<NoxConceptId, string> = {
  development: "Développer toutes tes pièces avant de lancer l’attaque.",
  king_safety: "Roquer avant le 10e coup lorsque la position le permet.",
  hanging_pieces: "Vérifier les pièces non protégées avant chaque coup.",
  forks: "Chercher une fourchette parmi les échecs, prises et menaces.",
  calculation: "Imaginer la meilleure réponse adverse avant de jouer.",
  material: "Compter attaquants et défenseurs avant un échange.",
  positioning: "Améliorer ta pièce la moins active.",
  endgame: "Activer ton roi dès que la finale commence.",
};

const DAY_MS = 86_400_000;

export function createNoxMemoryProfile(now = new Date()): NoxMemoryProfile {
  return {
    schemaVersion: 1,
    estimatedLevel: "beginner",
    levelConfidence: 0,
    mastery: {},
    goals: [],
    milestones: [],
    updatedAt: now.toISOString(),
  };
}

export function applyLearningEvent(
  profile: NoxMemoryProfile,
  event: LearningEvent,
): NoxMemoryProfile {
  const current = profile.mastery[event.conceptId];
  const previousScore = current
    ? applyRecency(current.score, current.lastObservedAt, event.occurredAt)
    : 50;
  const delta = event.outcome === "success" ? 12 : event.outcome === "failure" ? -12 : 0;
  const score = clamp(Math.round(previousScore + delta), 0, 100);
  const observations = (current?.observations ?? 0) + 1;
  const successes = (current?.successes ?? 0) + (event.outcome === "success" ? 1 : 0);
  const failures = (current?.failures ?? 0) + (event.outcome === "failure" ? 1 : 0);
  const trend = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
  const weaknessObserved =
    current?.weaknessObserved === true || (observations >= 3 && score <= 32);
  const status = getStatus({
    score,
    observations,
    trend,
    weaknessObserved,
  });
  const mastery: ConceptMastery = {
    conceptId: event.conceptId,
    score,
    observations,
    successes,
    failures,
    lastObservedAt: event.occurredAt,
    trend,
    status,
    weaknessObserved,
  };
  const masteryMap = { ...profile.mastery, [event.conceptId]: mastery };
  const goals = updateGoals(profile.goals, mastery, event.occurredAt);
  const milestones = updateMilestones(profile, mastery, event.occurredAt);
  const totalObservations = Object.values(masteryMap).reduce(
    (sum, item) => sum + (item?.observations ?? 0),
    0,
  );
  return {
    ...profile,
    levelConfidence: Math.min(1, Number((totalObservations / 20).toFixed(2))),
    mastery: masteryMap,
    goals,
    milestones,
    updatedAt: event.occurredAt,
  };
}

export function summarizeNoxMemory(profile: NoxMemoryProfile): NoxMemorySummary {
  const concepts = Object.values(profile.mastery).filter(
    (item): item is ConceptMastery => Boolean(item),
  );
  return {
    strengths: concepts.filter((item) => item.status === "mastered").map((item) => item.conceptId),
    weaknesses: concepts.filter((item) => item.status === "weakness").map((item) => item.conceptId),
    learning: concepts
      .filter((item) => item.status === "learning" && item.observations >= 2)
      .map((item) => item.conceptId),
    improving: concepts.filter((item) => item.status === "improving").map((item) => item.conceptId),
    goal: profile.goals[0]?.conceptId ?? null,
  };
}

export function applyRecency(score: number, fromIso: string, toIso: string): number {
  const elapsedDays = Math.max(
    0,
    Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS),
  );
  const correction = Math.floor(elapsedDays / 14) * 3;
  if (score < 50) return Math.min(50, score + correction);
  if (score > 50) return Math.max(50, score - correction);
  return score;
}

function getStatus(input: {
  score: number;
  observations: number;
  trend: ConceptMastery["trend"];
  weaknessObserved: boolean;
}): ConceptMastery["status"] {
  if (input.observations < 2) return "observing";
  if (input.observations >= 3 && input.score <= 32) return "weakness";
  if (input.weaknessObserved && input.trend === "up" && input.score > 32) {
    return "improving";
  }
  if (input.observations >= 3 && input.score >= 70) return "mastered";
  return "learning";
}

function updateGoals(
  goals: NoxMemoryProfile["goals"],
  mastery: ConceptMastery,
  occurredAt: string,
): NoxMemoryProfile["goals"] {
  if (mastery.status !== "weakness") return goals;
  const goal = {
    conceptId: mastery.conceptId,
    label: NOX_GOAL_LABELS[mastery.conceptId],
    createdAt: occurredAt,
  };
  return [goal, ...goals.filter((item) => item.conceptId !== mastery.conceptId)].slice(0, 3);
}

function updateMilestones(
  profile: NoxMemoryProfile,
  mastery: ConceptMastery,
  occurredAt: string,
): NoxMemoryProfile["milestones"] {
  const milestones = [...profile.milestones];
  const masteredId = `mastered:${mastery.conceptId}`;
  if (mastery.status === "mastered" && !milestones.some((item) => item.id === masteredId)) {
    milestones.unshift({
      id: masteredId,
      kind: "first_mastery",
      conceptId: mastery.conceptId,
      label: `Première maîtrise confirmée : ${NOX_CONCEPT_LABELS[mastery.conceptId]}.`,
      occurredAt,
    });
  }
  const improvementId = `improving:${mastery.conceptId}`;
  if (mastery.status === "improving" && !milestones.some((item) => item.id === improvementId)) {
    milestones.unshift({
      id: improvementId,
      kind: "important_improvement",
      conceptId: mastery.conceptId,
      label: `Progrès important : ${NOX_CONCEPT_LABELS[mastery.conceptId]}.`,
      occurredAt,
    });
  }
  return milestones.slice(0, 8);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

