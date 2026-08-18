import { NOX_CONCEPT_LABELS } from "@/lib/nox/memoryRules";
import type { LearningEvent, NoxMemoryProfile } from "@/lib/nox/memoryTypes";
import {
  NOX_RANK_IDS,
  type NoxProgressionSnapshot,
  type NoxRankId,
  type StoredNoxProgression,
} from "@/lib/nox/progressionTypes";

export const NOX_RANKS: Record<NoxRankId, { label: string; threshold: number }> = {
  squire: { label: "Écuyer", threshold: 0 },
  "young-knight": { label: "Jeune Chevalier", threshold: 25 },
  knight: { label: "Chevalier", threshold: 90 },
  captain: { label: "Capitaine", threshold: 155 },
  commander: { label: "Commandant", threshold: 235 },
  grandmaster: { label: "Grand Maître de Nox", threshold: 330 },
};

type Dimensions = {
  observed: number;
  improving: number;
  mastered: number;
  corrected: number;
  activeDays: number;
  missionDays: number;
  milestones: number;
};

const REQUIREMENTS: Record<NoxRankId, Partial<Dimensions>> = {
  squire: {},
  "young-knight": { observed: 2, improving: 1, activeDays: 2 },
  knight: { observed: 4, mastered: 2, corrected: 1, activeDays: 4, missionDays: 1 },
  captain: { observed: 5, mastered: 4, corrected: 2, activeDays: 7, missionDays: 2 },
  commander: { observed: 7, mastered: 6, corrected: 3, activeDays: 12, missionDays: 3 },
  grandmaster: { observed: 8, mastered: 8, corrected: 4, activeDays: 20, missionDays: 4 },
};

export function calculateNoxProgression(input: {
  profile: NoxMemoryProfile;
  events: LearningEvent[];
  stored?: StoredNoxProgression | null;
  persistent?: boolean;
  ignoredEvents?: number;
  now?: Date;
  legacy?: { xp?: number; league?: string };
}): NoxProgressionSnapshot {
  const uniqueEvents = [...new Map(input.events.map((event) => [event.sourceId, event])).values()];
  const concepts = Object.values(input.profile.mastery).filter(Boolean);
  const observed = concepts.length;
  const improving = concepts.filter((item) => item?.status === "improving").length;
  const mastered = concepts.filter((item) => item?.status === "mastered").length;
  const corrected = concepts.filter((item) => {
    if (!item?.weaknessObserved || (item.status !== "improving" && item.status !== "mastered")) return false;
    const conceptDays = new Set(
      uniqueEvents.filter((event) => event.conceptId === item.conceptId).map((event) => event.occurredAt.slice(0, 10)),
    ).size;
    return conceptDays >= 3 && item.successes >= item.failures;
  }).length;
  const activeDays = new Set(uniqueEvents.map((event) => event.occurredAt.slice(0, 10))).size;
  const missionDays = new Set(
    uniqueEvents.filter((event) => event.type === "mission_completed").map((event) => event.occurredAt.slice(0, 10)),
  ).size;
  const dimensions: Dimensions = {
    observed,
    improving,
    mastered,
    corrected,
    activeDays,
    missionDays,
    milestones: input.profile.milestones.length,
  };
  const growthScore =
    Math.min(observed, 8) * 5 +
    improving * 12 +
    mastered * 24 +
    corrected * 22 +
    Math.min(activeDays, 20) * 3 +
    Math.min(missionDays, 4) * 8 +
    Math.min(dimensions.milestones, 8) * 4;

  let earnedRank: NoxRankId = "squire";
  for (const rank of NOX_RANK_IDS) {
    if (growthScore >= NOX_RANKS[rank].threshold && meets(dimensions, REQUIREMENTS[rank])) earnedRank = rank;
  }
  const storedRank = input.stored?.highestRank ?? "squire";
  const rank = rankIndex(storedRank) > rankIndex(earnedRank) ? storedRank : earnedRank;
  const nextRank = NOX_RANK_IDS[rankIndex(rank) + 1] ?? null;
  const base = NOX_RANKS[rank].threshold;
  const target = nextRank ? NOX_RANKS[nextRank].threshold : base;
  const rawProgress = nextRank ? Math.round(((growthScore - base) / Math.max(1, target - base)) * 100) : 100;
  const remaining = nextRank ? describeMissing(dimensions, REQUIREMENTS[nextRank], growthScore, target) : [];
  const progressPercent = nextRank ? Math.max(0, Math.min(remaining.length ? 95 : 100, rawProgress)) : 100;
  const sources = buildSources(concepts, corrected, activeDays, missionDays);
  const lastRankChange = input.stored?.lastRankChange ?? null;
  const now = input.now ?? new Date();

  return {
    rank,
    rankLabel: NOX_RANKS[rank].label,
    nextRank,
    nextRankLabel: nextRank ? NOX_RANKS[nextRank].label : null,
    growthScore,
    progressPercent,
    sources,
    remaining,
    conceptsObserved: concepts.map((item) => item!.conceptId),
    eventsCounted: uniqueEvents.length,
    eventsIgnored: Math.max(input.ignoredEvents ?? 0, input.events.length - uniqueEvents.length),
    lastRankChange,
    milestones: input.stored?.milestones ?? [],
    persistent: input.persistent ?? false,
    recentlyEvolved: Boolean(lastRankChange && now.getTime() - new Date(lastRankChange).getTime() < 300_000),
    preview: false,
  };
}

export function applyNoxRankPreview(
  snapshot: NoxProgressionSnapshot,
  rank: NoxRankId | null,
  environment: string,
): NoxProgressionSnapshot {
  if (environment === "production" || !rank || !NOX_RANK_IDS.includes(rank)) return snapshot;
  const nextRank = NOX_RANK_IDS[rankIndex(rank) + 1] ?? null;
  const previewMilestone = rank === "squire" ? [] : [{
    id: `PREVIEW_NOX_REACHED_${rank.toUpperCase().replaceAll("-", "_")}`,
    rank,
    label: `Aperçu DEV : Nox devient ${NOX_RANKS[rank].label}.`,
    occurredAt: new Date().toISOString(),
  }];
  return {
    ...snapshot,
    rank,
    rankLabel: NOX_RANKS[rank].label,
    nextRank,
    nextRankLabel: nextRank ? NOX_RANKS[nextRank].label : null,
    progressPercent: nextRank ? 72 : 100,
    milestones: [...previewMilestone, ...snapshot.milestones],
    recentlyEvolved: rank !== "squire",
    preview: true,
  };
}

export function rankIndex(rank: NoxRankId): number {
  return NOX_RANK_IDS.indexOf(rank);
}

function meets(current: Dimensions, required: Partial<Dimensions>): boolean {
  return Object.entries(required).every(([key, value]) => current[key as keyof Dimensions] >= (value ?? 0));
}

function describeMissing(current: Dimensions, required: Partial<Dimensions>, score: number, target: number): string[] {
  const descriptions: Array<[keyof Dimensions, (count: number) => string]> = [
    ["observed", (count) => count === 1 ? "notion différente à explorer" : "notions différentes à explorer"],
    ["improving", (count) => count === 1 ? "notion à mettre en progrès" : "notions à mettre en progrès"],
    ["mastered", (count) => count === 1 ? "maîtrise à confirmer" : "maîtrises à confirmer"],
    ["corrected", (count) => count === 1 ? "faiblesse à corriger" : "faiblesses à corriger"],
    ["activeDays", (count) => count === 1 ? "jour d’apprentissage distinct" : "jours d’apprentissage distincts"],
    ["missionDays", (count) => count === 1 ? "mission sur un jour différent" : "missions sur des jours différents"],
  ];
  const missing = descriptions.flatMap(([key, label]) => {
    const count = Math.max(0, (required[key] ?? 0) - current[key]);
    return count ? [`${count} ${label(count)}`] : [];
  });
  if (score < target) missing.push("encore quelques acquis à consolider");
  return missing.slice(0, 3);
}

function buildSources(concepts: Array<NonNullable<NoxMemoryProfile["mastery"][keyof NoxMemoryProfile["mastery"]]>>, corrected: number, activeDays: number, missionDays: number): string[] {
  const mastered = concepts.filter((item) => item.status === "mastered");
  const improving = concepts.filter((item) => item.status === "improving");
  const result: string[] = [];
  if (mastered[0]) result.push(`Tu maîtrises mieux ${NOX_CONCEPT_LABELS[mastered[0].conceptId]}.`);
  else if (improving[0]) result.push(`Tu progresses pour ${NOX_CONCEPT_LABELS[improving[0].conceptId]}.`);
  if (corrected) result.push(`${corrected} faiblesse${corrected > 1 ? "s" : ""} réellement corrigée${corrected > 1 ? "s" : ""}.`);
  if (activeDays >= 2) result.push(`${activeDays} jours d’apprentissage différents, sans punir les pauses.`);
  if (missionDays) result.push(`${missionDays} journée${missionDays > 1 ? "s" : ""} avec une mission pédagogique réussie.`);
  return result.slice(0, 3);
}
