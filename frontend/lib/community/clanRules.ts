export const CLAN_MEMBER_LIMIT = 12;

export function normalizeClanInviteCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^(?:KLY-[A-F0-9]{8}|[A-Z0-9]{2,8})$/.test(code) ? code : null;
}

export function canJoinClan(memberCount: number, alreadyInClan: boolean): "allowed" | "already-member" | "full" {
  if (alreadyInClan) return "already-member";
  return memberCount >= CLAN_MEMBER_LIMIT ? "full" : "allowed";
}

export function ownerDepartureOutcome(remainingMemberIds: string[]): "dissolve" | "transfer" {
  return remainingMemberIds.length === 0 ? "dissolve" : "transfer";
}

export function isPublicClanActivity(input: {
  sharesProgress: boolean;
  containsPrivateGame: boolean;
  containsConversation: boolean;
}): boolean {
  return input.sharesProgress && !input.containsPrivateGame && !input.containsConversation;
}
