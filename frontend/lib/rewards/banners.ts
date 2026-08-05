export const BATTLE_BANNERS = [
  {
    id: "royal-blue",
    name: "Serment royal",
    description: "La bannière des chevaliers qui entrent dans l’arène.",
    icon: "♞",
    cost: 0,
    panelClass:
      "from-gray-900 via-blue-950/30 to-violet-950/25 border-blue-800/60",
    cardClass: "from-blue-700 to-indigo-950",
  },
  {
    id: "ember-guard",
    name: "Garde braisée",
    description: "Pour les rois qui préfèrent attaquer avant le café.",
    icon: "🔥",
    cost: 40,
    panelClass:
      "from-gray-900 via-red-950/30 to-amber-950/25 border-red-800/60",
    cardClass: "from-orange-500 to-red-950",
  },
  {
    id: "forest-oath",
    name: "Serment sylvestre",
    description: "Calme en apparence, tactique sous les feuilles.",
    icon: "🌿",
    cost: 80,
    panelClass:
      "from-gray-900 via-emerald-950/30 to-cyan-950/20 border-emerald-800/60",
    cardClass: "from-emerald-500 to-teal-950",
  },
  {
    id: "crystal-storm",
    name: "Orage de cristal",
    description: "Une bannière qui annonce les fourchettes électriques.",
    icon: "💎",
    cost: 140,
    panelClass:
      "from-gray-900 via-cyan-950/30 to-violet-950/30 border-cyan-700/60",
    cardClass: "from-cyan-400 to-violet-900",
  },
  {
    id: "astral-crown",
    name: "Couronne astrale",
    description: "Le ciel étoilé des collectionneurs les plus tenaces.",
    icon: "👑",
    cost: 220,
    panelClass:
      "from-gray-900 via-violet-950/35 to-fuchsia-950/25 border-violet-700/60",
    cardClass: "from-violet-500 to-fuchsia-950",
  },
] as const;

export type BattleBannerId = (typeof BATTLE_BANNERS)[number]["id"];

export function getBattleBanner(id: string) {
  return BATTLE_BANNERS.find((banner) => banner.id === id) ?? BATTLE_BANNERS[0];
}

export function isBattleBannerId(value: string): value is BattleBannerId {
  return BATTLE_BANNERS.some((banner) => banner.id === value);
}
