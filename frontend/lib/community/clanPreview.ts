import type { CommunityDashboard } from "@/lib/community/types";

export const CLAN_PREVIEW_SCENARIOS = [
  "empty",
  "duo",
  "active",
  "activity",
  "invite",
  "challenge",
  "goal",
] as const;

export type ClanPreviewScenario = (typeof CLAN_PREVIEW_SCENARIOS)[number];

export function resolveClanPreview(
  value: string | null,
  environment: string,
): ClanPreviewScenario | null {
  if (environment === "production") return null;
  return CLAN_PREVIEW_SCENARIOS.includes(value as ClanPreviewScenario)
    ? (value as ClanPreviewScenario)
    : null;
}

export function buildClanPreview(scenario: ClanPreviewScenario): CommunityDashboard {
  const profile = {
    id: "preview-current",
    name: "Lina",
    rating: 842,
    avatarId: "iron-squire" as const,
    wins: 12,
    losses: 9,
    draws: 2,
    monthlyPoints: 38,
  };
  const empty = scenario === "empty";
  const members = empty
    ? []
    : [
        {
          publicId: "preview-lina",
          name: "Lina",
          rating: 842,
          avatarId: "iron-squire" as const,
          noxRank: "young-knight" as const,
          noxRankLabel: "Jeune Chevalier",
          activityLabel: "3 parties cette semaine",
          isCurrentPlayer: true,
          isOwner: true,
          sharesProgress: true,
        },
        {
          publicId: "preview-samir",
          name: "Samir",
          rating: 910,
          avatarId: "bronze-vanguard" as const,
          noxRank: "knight" as const,
          noxRankLabel: "Chevalier",
          activityLabel: "2 parties cette semaine",
          isCurrentPlayer: false,
          isOwner: false,
          sharesProgress: true,
        },
        ...(scenario === "duo"
          ? []
          : [{
              publicId: "preview-ines",
              name: "Inès",
              rating: 775,
              avatarId: "iron-squire" as const,
              noxRank: null,
              noxRankLabel: null,
              activityLabel: "Progression privée",
              isCurrentPlayer: false,
              isOwner: false,
              sharesProgress: false,
            }]),
      ];
  const current = scenario === "goal" ? 6 : scenario === "active" ? 5 : 3;
  return {
    profile,
    friends: [],
    league: { monthLabel: "septembre 2026", tier: "Ligue Bronze", points: 38, rank: 2 },
    clan: empty ? null : { id: "preview-clan", name: "Les Cavaliers de Minuit", tag: "NOX", memberCount: members.length, monthlyPoints: 74, inviteCode: "KLY-DEMO2026" },
    clanExpedition: null,
    clanLeaderboard: [],
    clanMembers: members,
    clanActivity: empty ? [] : [
      { id: "preview-game", kind: "game", message: "Samir a joué 2 parties avec la troupe cette semaine.", occurredAt: "2026-09-02" },
      { id: "preview-welcome", kind: "welcome", message: "La bannière Les Cavaliers de Minuit est levée. Bienvenue dans la troupe !", occurredAt: "2026-08-29" },
    ],
    clanWeeklyGoal: empty ? null : { label: "Jouer ensemble cette semaine", current, target: 6, completed: current >= 6, weekLabel: "31 août – 6 sept." },
    clanRole: empty ? null : "owner",
    shareProgress: !empty,
  };
}
