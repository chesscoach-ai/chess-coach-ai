import type { OnlineGameHistoryItem } from "@/lib/multiplayer/types";

export type BattleArena = {
  name: string;
  icon: string;
  floor: number;
  nextAt: number | null;
};

const ARENAS: BattleArena[] = [
  {
    name: "Camp des Écuyers",
    icon: "🛡️",
    floor: 0,
    nextAt: 900,
  },
  {
    name: "Forteresse de Bronze",
    icon: "♜",
    floor: 900,
    nextAt: 1_100,
  },
  {
    name: "Tour d’Argent",
    icon: "♞",
    floor: 1_100,
    nextAt: 1_300,
  },
  {
    name: "Citadelle d’Or",
    icon: "♛",
    floor: 1_300,
    nextAt: 1_500,
  },
  {
    name: "Bastion de Cristal",
    icon: "💎",
    floor: 1_500,
    nextAt: 1_800,
  },
  {
    name: "Trône des Maîtres",
    icon: "👑",
    floor: 1_800,
    nextAt: null,
  },
];

export function getBattleArena(
  rating: number,
): BattleArena {
  return (
    [...ARENAS]
      .reverse()
      .find(
        (arena) =>
          rating >= arena.floor,
      ) ?? ARENAS[0]
  );
}

export function getDailyCrowns(
  games: OnlineGameHistoryItem[],
  dateKey: string,
): number {
  return games
    .filter(
      (game) =>
        getParisDateKey(
          new Date(game.endedAt),
        ) === dateKey,
    )
    .reduce((total, game) => {
      if (game.result === "1/2-1/2") {
        return total + 1;
      }
      const won =
        (game.youAre === "white" &&
          game.result === "1-0") ||
        (game.youAre === "black" &&
          game.result === "0-1");
      return total + (won ? 3 : 0);
    }, 0);
}

export function getParisDateKey(
  date = new Date(),
): string {
  const parts =
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  const read = (type: string) =>
    parts.find(
      (part) => part.type === type,
    )?.value ?? "00";
  return `${read("year")}-${read("month")}-${read("day")}`;
}
