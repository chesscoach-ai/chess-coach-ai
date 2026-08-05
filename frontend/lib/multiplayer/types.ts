import type { Square } from "chess.js";

export type OnlineGameStatus = "waiting" | "active" | "finished";
export type PlayerColor = "white" | "black";
export type GameResult = "1-0" | "0-1" | "1/2-1/2";

export type OnlineMove = {
  san: string;
  uci: string;
  from: Square;
  to: Square;
  playedAt: string;
};

export type GameSpeed =
  | "bullet"
  | "blitz"
  | "rapid";

export type OnlineTimeControl = {
  initialMinutes: number;
  incrementSeconds: number;
  label: string;
  speed: GameSpeed;
  speedLabel: string;
};

export type OnlinePlayer = {
  name: string;
  rating: number;
  ratingAfter: number | null;
};

export type OnlineGame = {
  id: string;
  inviteCode: string;
  status: OnlineGameStatus;
  fen: string;
  moves: OnlineMove[];
  white: OnlinePlayer;
  black: OnlinePlayer | null;
  youAre: PlayerColor;
  turn: PlayerColor;
  clocks: {
    initialMs: number;
    incrementMs: number;
    whiteMs: number;
    blackMs: number;
    turnStartedAt: string | null;
    serverNow: string;
  };
  result: GameResult | null;
  termination: string | null;
  drawOfferBy: PlayerColor | null;
  matchType: "private" | "matchmaking";
  createdAt: string;
  endedAt: string | null;
  timeControl: OnlineTimeControl;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
};

export type OnlineGameHistoryItem = {
  id: string;
  youAre: PlayerColor;
  white: OnlinePlayer;
  black: OnlinePlayer;
  result: GameResult;
  termination: string;
  createdAt: string;
  endedAt: string;
  timeControl: OnlineTimeControl;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  reviewUnlocked: boolean;
  pgn: string;
};

export type SpeedStatistics = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

export type OnlinePlayerStatistics = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  currentRating: number;
  peakRating: number;
  ratingChange: number;
  averageAccuracy: number | null;
  analyzedGames: number;
  currentStreak: number;
  activityDates: string[];
  bySpeed: Record<GameSpeed, SpeedStatistics>;
};

export type OnlineMoveInput = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};
