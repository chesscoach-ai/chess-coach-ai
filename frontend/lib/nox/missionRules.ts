import { PGN_EXAMPLES } from "@/data/pgn/examples";
import { NOX_CONCEPT_LABELS } from "@/lib/nox/memoryRules";
import type { LearningEvent, NoxConceptId, NoxMemoryProfile } from "@/lib/nox/memoryTypes";
import type { NoxMission, NoxMissionDifficulty, NoxMissionReason } from "@/lib/nox/missionTypes";

const CONCEPT_ORDER: NoxConceptId[] = ["development", "king_safety", "hanging_pieces", "forks", "calculation", "material", "positioning", "endgame"];
const CATEGORY: Record<NoxConceptId, "opening" | "middlegame" | "endgame"> = {
  development: "opening", king_safety: "opening", hanging_pieces: "middlegame", forks: "middlegame",
  calculation: "middlegame", material: "middlegame", positioning: "middlegame", endgame: "endgame",
};
const QUIZZES: Partial<Record<NoxConceptId, NoxMission["quiz"]>> = {
  king_safety: { question: "Pourquoi roquer est-il souvent utile ?", answers: ["Mettre le roi en sécurité", "Gagner une dame", "Promouvoir un pion"], correctAnswer: 0, explanation: "Le roque abrite le roi et active aussi une tour." },
  development: { question: "Quelle priorité aide le plus dans l’ouverture ?", answers: ["Sortir la dame", "Développer les pièces", "Pousser tous les pions"], correctAnswer: 1, explanation: "Des pièces développées contrôlent davantage de cases et préparent le roque." },
};

export function buildNoxMission(input: {
  profile: NoxMemoryProfile;
  events: LearningEvent[];
  date?: Date;
  recentConcepts?: NoxConceptId[];
  forcedConcept?: NoxConceptId;
  persistent?: boolean;
}): NoxMission {
  const now = input.date ?? new Date();
  const selection = chooseConcept(input.profile, input.events, input.recentConcepts ?? [], input.forcedConcept, now);
  const difficulty = difficultyFor(input.profile, selection.conceptId);
  const categoryCandidates = PGN_EXAMPLES.filter((item) => item.category === CATEGORY[selection.conceptId]);
  const conceptCandidates = selection.conceptId === "king_safety"
    ? categoryCandidates.filter((item) => /\bO-O(?:-O)?\s+\*\s*$/.test(item.pgn))
    : categoryCandidates;
  const candidates = conceptCandidates.length >= 3 ? conceptCandidates : categoryCandidates;
  const sorted = [...candidates].sort((a, b) => hash(`${dateKey(now)}:${selection.conceptId}:${a.id}`) - hash(`${dateKey(now)}:${selection.conceptId}:${b.id}`));
  const exerciseIds = sorted.slice(0, Math.min(4, Math.max(3, sorted.length))).map((item) => item.id);
  const conceptLabel = NOX_CONCEPT_LABELS[selection.conceptId];
  const createdAt = now.toISOString();
  const delayDays = difficulty === "discovery" ? 1 : difficulty === "consolidation" ? 3 : 10;
  return {
    id: `nox:${dateKey(now)}:${selection.conceptId}`,
    schemaVersion: 1,
    conceptId: selection.conceptId,
    conceptLabel,
    title: `Mission : ${capitalize(conceptLabel)}`,
    reason: reasonText(selection.reason, conceptLabel, Boolean(input.persistent)),
    reasonCode: selection.reason,
    confidence: selection.reason === "weakness_confirmed" ? "high" : selection.reason === "guided_discovery" ? "low" : "medium",
    difficulty,
    estimatedMinutes: Math.max(3, exerciseIds.length),
    exerciseIds,
    quiz: QUIZZES[selection.conceptId] ?? null,
    status: "offered",
    currentStep: 0,
    results: [],
    createdAt,
    startedAt: null,
    completedAt: null,
    nextEligibleAt: new Date(now.getTime() + delayDays * 86_400_000).toISOString(),
    persistent: Boolean(input.persistent),
  };
}

function chooseConcept(profile: NoxMemoryProfile, events: LearningEvent[], recent: NoxConceptId[], forced: NoxConceptId | undefined, now: Date): { conceptId: NoxConceptId; reason: NoxMissionReason } {
  if (forced) return { conceptId: forced, reason: "weakness_confirmed" };
  const all = Object.values(profile.mastery).filter(Boolean);
  const priorities: Array<[NoxMissionReason, (item: NonNullable<(typeof all)[number]>) => boolean]> = [
    ["weakness_confirmed", (item) => item.status === "weakness"],
    ["improvement_consolidation", (item) => item.status === "improving"],
  ];
  const candidates: Array<{ conceptId: NoxConceptId; reason: NoxMissionReason }> = [];
  for (const [reason, match] of priorities) {
    const matches = all.filter(match).sort((a, b) => a!.score - b!.score);
    candidates.push(...matches.map((item) => ({ conceptId: item!.conceptId, reason })));
  }
  const recentFailure = [...events].reverse().find((event) => event.outcome === "failure");
  if (recentFailure && !candidates.some((item) => item.conceptId === recentFailure.conceptId)) {
    candidates.push({ conceptId: recentFailure.conceptId, reason: "recent_failure" });
  }
  for (const [reason, status] of [["learning_in_progress", "learning"], ["spaced_review", "mastered"]] as const) {
    candidates.push(...all.filter((item) => item!.status === status && !candidates.some((candidate) => candidate.conceptId === item!.conceptId)).sort((a, b) => a!.score - b!.score).map((item) => ({ conceptId: item!.conceptId, reason })));
  }
  const rotated = candidates.find((item) => !recent.slice(0, 2).includes(item.conceptId)) ?? candidates[0];
  if (rotated) return rotated;
  return { conceptId: CONCEPT_ORDER[hash(dateKey(now)) % CONCEPT_ORDER.length], reason: "guided_discovery" };
}

function difficultyFor(profile: NoxMemoryProfile, conceptId: NoxConceptId): NoxMissionDifficulty {
  const status = profile.mastery[conceptId]?.status;
  return status === "mastered" ? "mastery" : status === "improving" || status === "learning" ? "consolidation" : "discovery";
}

function reasonText(reason: NoxMissionReason, label: string, personalized: boolean): string {
  if (!personalized) return `Mission découverte : quelques positions pour apprendre à ${label}.`;
  if (reason === "weakness_confirmed") return `J’ai remarqué qu’on doit encore travailler à ${label}. Je t’ai préparé quelques positions.`;
  if (reason === "improvement_consolidation") return `On progresse pour ${label}. Cette courte mission va consolider ce nouveau réflexe.`;
  if (reason === "recent_failure") return `Une position récente nous invite à revoir comment ${label}.`;
  if (reason === "spaced_review") return `Cela fait un moment : vérifions que nous savons toujours ${label}.`;
  if (reason === "learning_in_progress") return `Nous sommes en train d’apprendre à ${label}. Continuons avec quelques positions.`;
  return `J’ai choisi une découverte adaptée pour apprendre à ${label}.`;
}

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function capitalize(value: string) { return value.charAt(0).toLocaleUpperCase("fr") + value.slice(1); }
function hash(value: string) { let result = 0; for (const char of value) result = (result * 31 + char.charCodeAt(0)) >>> 0; return result; }
