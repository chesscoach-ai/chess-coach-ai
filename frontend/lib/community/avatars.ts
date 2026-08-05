export const COMMUNITY_AVATARS = [
  {
    id: "iron-squire",
    name: "Écuyer de fer",
    image: "/avatars/iron-squire.webp",
    requiredRating: 0,
    rarity: "Commun",
  },
  {
    id: "bronze-vanguard",
    name: "Avant-garde de bronze",
    image: "/avatars/bronze-vanguard.webp",
    requiredRating: 800,
    rarity: "Peu commun",
  },
  {
    id: "jade-warden",
    name: "Gardien de jade",
    image: "/avatars/jade-warden.webp",
    requiredRating: 1000,
    rarity: "Rare",
  },
  {
    id: "storm-rider",
    name: "Cavalier de l’orage",
    image: "/avatars/storm-rider.webp",
    requiredRating: 1200,
    rarity: "Rare",
  },
  {
    id: "frost-bishop",
    name: "Fou du givre",
    image: "/avatars/frost-bishop.webp",
    requiredRating: 1400,
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
    id: "sun-paladin",
    name: "Paladin solaire",
    image: "/avatars/sun-paladin.webp",
    requiredRating: 1800,
    rarity: "Épique",
  },
  {
    id: "astral-grandmaster",
    name: "Grand maître astral",
    image: "/avatars/astral-grandmaster.webp",
    requiredRating: 2000,
    rarity: "Légendaire",
  },
  {
    id: "void-knight",
    name: "Chevalier du Néant",
    image: "/avatars/void-knight.webp",
    requiredRating: 2200,
    rarity: "Légendaire",
  },
  {
    id: "royal-champion",
    name: "Champion royal",
    image: "/avatars/royal-champion.webp",
    requiredRating: 2400,
    rarity: "Mythique",
  },
] as const;

export type CommunityAvatarId = (typeof COMMUNITY_AVATARS)[number]["id"];

export function getCommunityAvatar(id: string) {
  return (
    COMMUNITY_AVATARS.find((avatar) => avatar.id === id) ??
    COMMUNITY_AVATARS[0]
  );
}
