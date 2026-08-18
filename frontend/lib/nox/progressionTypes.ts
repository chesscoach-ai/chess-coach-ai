import type { NoxConceptId } from "@/lib/nox/memoryTypes";

export const NOX_RANK_IDS = [
  "squire",
  "young-knight",
  "knight",
  "captain",
  "commander",
  "grandmaster",
] as const;

export type NoxRankId = (typeof NOX_RANK_IDS)[number];

export type NoxRankMilestone = {
  id: string;
  rank: NoxRankId;
  label: string;
  occurredAt: string;
};

export type NoxProgressionSnapshot = {
  rank: NoxRankId;
  rankLabel: string;
  nextRank: NoxRankId | null;
  nextRankLabel: string | null;
  growthScore: number;
  progressPercent: number;
  sources: string[];
  remaining: string[];
  conceptsObserved: NoxConceptId[];
  eventsCounted: number;
  eventsIgnored: number;
  lastRankChange: string | null;
  milestones: NoxRankMilestone[];
  persistent: boolean;
  recentlyEvolved: boolean;
  preview: boolean;
};

export type StoredNoxProgression = {
  highestRank: NoxRankId;
  lastRankChange: string | null;
  milestones: NoxRankMilestone[];
};
