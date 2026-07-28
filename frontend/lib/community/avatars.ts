export const COMMUNITY_AVATARS = [
  {
    id: "iron-squire",
    name: "Écuyer de fer",
    image: "/avatars/iron-squire.webp",
    requiredRating: 0,
    rarity: "Commun",
  },
  {
    id: "storm-rider",
    name: "Cavalier de l’orage",
    image: "/avatars/storm-rider.webp",
    requiredRating: 1200,
    rarity: "Rare",
  },
  {
    id: "crimson-regent",
    name: "Régent écarlate",
    image: "/avatars/crimson-regent.webp",
    requiredRating: 1600,
    rarity: "Épique",
  },
  {
    id: "astral-grandmaster",
    name: "Grand maître astral",
    image: "/avatars/astral-grandmaster.webp",
    requiredRating: 2000,
    rarity: "Légendaire",
  },
] as const;

export type CommunityAvatarId = (typeof COMMUNITY_AVATARS)[number]["id"];

export function getCommunityAvatar(id: string) {
  return (
    COMMUNITY_AVATARS.find((avatar) => avatar.id === id) ??
    COMMUNITY_AVATARS[0]
  );
}
