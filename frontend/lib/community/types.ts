import type { CommunityAvatarId } from "@/lib/community/avatars";
import type { ClanExpedition } from "@/lib/community/clanExpedition";
import type { BattleBannerId } from "@/lib/rewards/banners";
import type { NoxRankId } from "@/lib/nox/progressionTypes";

export type CommunityMember = {
  id: string;
  name: string;
  rating: number;
  avatarId: CommunityAvatarId;
  wins: number;
  losses: number;
  draws: number;
  monthlyPoints: number;
  bannerId?: BattleBannerId;
};

export type CommunityClan = {
  id: string;
  name: string;
  tag: string;
  memberCount: number;
  monthlyPoints: number;
  inviteCode?: string;
};

export type CommunityClanMember = Omit<CommunityMember, "id" | "wins" | "losses" | "draws" | "monthlyPoints"> & {
  publicId: string;
  noxRank: NoxRankId | null;
  noxRankLabel: string | null;
  activityLabel: string;
  isCurrentPlayer: boolean;
  isOwner: boolean;
  sharesProgress: boolean;
};

export type ClanActivityItem = {
  id: string;
  kind: "welcome" | "game" | "milestone";
  message: string;
  occurredAt: string;
};

export type ClanWeeklyGoal = {
  label: string;
  current: number;
  target: number;
  completed: boolean;
  weekLabel: string;
};

export type CommunityDashboard = {
  profile: CommunityMember;
  friends: CommunityMember[];
  league: {
    monthLabel: string;
    tier: string;
    points: number;
    rank: number;
  };
  clan: CommunityClan | null;
  clanExpedition: ClanExpedition | null;
  clanLeaderboard: CommunityClan[];
  clanMembers: CommunityClanMember[];
  clanActivity: ClanActivityItem[];
  clanWeeklyGoal: ClanWeeklyGoal | null;
  clanRole: "owner" | "member" | null;
  shareProgress: boolean;
};
