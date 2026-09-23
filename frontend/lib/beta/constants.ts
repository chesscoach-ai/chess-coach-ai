export const KNIGHTLY_BETA_VERSION = "0.1.0-beta.2";

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
  "plus_offer_viewed",
  "plus_details_viewed",
  "plus_cta_clicked",
  "plus_limit_reached",
  "plus_dismissed",
  "account_created",
  "frontend_error",
  "clan_viewed",
  "clan_created",
  "clan_joined",
  "clan_invite_created",
  "clan_invite_accepted",
  "clan_challenge_sent",
  "clan_challenge_started",
  "clan_activity_viewed",
  "clan_goal_viewed",
  "clan_goal_completed",
  "return_context_viewed",
  "resume_action_clicked",
  "weekly_summary_viewed",
  "nox_progress_moment_viewed",
  "return_after_absence",
] as const;

export type BetaEventName = (typeof BETA_EVENT_NAMES)[number];

export function isBetaEventName(value: unknown): value is BetaEventName {
  return typeof value === "string" && BETA_EVENT_NAMES.includes(value as BetaEventName);
}
