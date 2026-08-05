import type { PlayerMatchStats } from "@/lib/multiplayer/gameStore";

export type ClanExpeditionContribution = PlayerMatchStats & {
  id: string;
  name: string;
  games: number;
  medals: number;
};

export type ClanExpedition = {
  weekLabel: string;
  medals: number;
  goal: number;
  stage: string;
  nextStageAt: number | null;
  contributions: ClanExpeditionContribution[];
};

const EXPEDITION_STAGES = [
  { at: 0, name: "Camp dressé" },
  { at: 20, name: "Pont-levis franchi" },
  { at: 50, name: "Tour conquise" },
  { at: 90, name: "Citadelle capturée" },
] as const;

export function getParisWeekDateKeys(date = new Date()): string[] {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const parisNoon = new Date(
    `${read("year")}-${read("month")}-${read("day")}T12:00:00Z`,
  );
  const daysSinceMonday = (parisNoon.getUTCDay() + 6) % 7;
  parisNoon.setUTCDate(parisNoon.getUTCDate() - daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(parisNoon);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function getExpeditionMedals(stats: PlayerMatchStats): number {
  return stats.wins * 4 + stats.draws * 2 + stats.losses;
}

export function buildClanExpedition(
  contributions: Array<
    PlayerMatchStats & {
      id: string;
      name: string;
    }
  >,
  weekDateKeys = getParisWeekDateKeys(),
): ClanExpedition {
  const ranked = contributions
    .map((contribution) => ({
      ...contribution,
      games:
        contribution.wins + contribution.draws + contribution.losses,
      medals: getExpeditionMedals(contribution),
    }))
    .sort(
      (first, second) =>
        second.medals - first.medals || second.games - first.games,
    );
  const medals = ranked.reduce(
    (total, contribution) => total + contribution.medals,
    0,
  );
  const currentStage =
    [...EXPEDITION_STAGES]
      .reverse()
      .find((stage) => medals >= stage.at) ?? EXPEDITION_STAGES[0];
  const nextStage =
    EXPEDITION_STAGES.find((stage) => stage.at > medals) ?? null;
  const firstDay = new Date(`${weekDateKeys[0]}T12:00:00Z`);
  const lastDay = new Date(`${weekDateKeys[6]}T12:00:00Z`);
  const shortDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  return {
    weekLabel: `${shortDate.format(firstDay)} – ${shortDate.format(lastDay)}`,
    medals,
    goal: EXPEDITION_STAGES.at(-1)?.at ?? 90,
    stage: currentStage.name,
    nextStageAt: nextStage?.at ?? null,
    contributions: ranked,
  };
}
