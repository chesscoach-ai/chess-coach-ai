export const KNIGHTLY_BETA_VERSION = "0.1.0-beta.1";

export const BETA_EVENT_NAMES = [
  "app_opened",
  "onboarding_completed",
  "game_started",
  "game_completed",
  "first_analysis",
  "first_nox_interaction",
  "first_mission_started",
  "first_mission_completed",
  "daily_session_viewed",
  "daily_session_started",
  "daily_session_resumed",
  "daily_session_completed",
  "daily_session_abandoned",
  "account_created",
  "frontend_error",
] as const;

export type BetaEventName = (typeof BETA_EVENT_NAMES)[number];

export function isBetaEventName(value: unknown): value is BetaEventName {
  return typeof value === "string" && BETA_EVENT_NAMES.includes(value as BetaEventName);
}
