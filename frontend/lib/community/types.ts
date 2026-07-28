import type { CommunityAvatarId } from "@/lib/community/avatars";

export type CommunityMember = {
  id: string;
  name: string;
  rating: number;
  avatarId: CommunityAvatarId;
  wins: number;
  losses: number;
  draws: number;
  monthlyPoints: number;
};

export type CommunityClan = {
  id: string;
  name: string;
  tag: string;
  memberCount: number;
  monthlyPoints: number;
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
  clanLeaderboard: CommunityClan[];
};
