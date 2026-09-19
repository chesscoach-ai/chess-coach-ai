import type { NoxRankId } from "@/lib/nox/progressionTypes";
import type { NoxState } from "@/lib/nox/types";

export type NoxRankVisual = {
  avatar: string;
  compactAvatar: string;
  fallbackAvatar: string;
  accent: string;
  aura: string;
  silhouette: string;
  emblem: string;
  badge: string;
  description: string;
  milestone: string;
  assetStatus: "provisional" | "final";
};

export type NoxStateVisual = {
  label: string;
  dot: string;
  halo: string;
  motion: string;
  symbol: string;
};

const PROVISIONAL_AVATAR = "/brand/nox-squire.svg";
const finalAvatar = (rank: NoxRankId, size: 256 | 512) =>
  `/brand/nox-final/nox-${rank}-${size}.webp`;

/** Source unique de l'identité visuelle de Nox, indépendante des règles de progression. */
export const NOX_RANK_ASSETS: Record<NoxRankId, NoxRankVisual> = {
  squire: {
    avatar: finalAvatar("squire", 512), compactAvatar: finalAvatar("squire", 256), fallbackAvatar: PROVISIONAL_AVATAR,
    accent: "border-indigo-500/60", aura: "from-indigo-500/20 via-blue-500/5 to-transparent", silhouette: "scale-100", emblem: "◇",
    badge: "Écu de novice", description: "Nox découvre ton jeu et apprend à observer sans juger.",
    milestone: "Découvrir plusieurs notions et commencer à en améliorer une.", assetStatus: "final",
  },
  "young-knight": {
    avatar: finalAvatar("young-knight", 512), compactAvatar: finalAvatar("young-knight", 256), fallbackAvatar: PROVISIONAL_AVATAR,
    accent: "border-sky-400/70", aura: "from-sky-400/30 via-indigo-500/10 to-transparent", silhouette: "scale-100", emblem: "✦",
    badge: "Étoile d’apprentissage", description: "Nox reconnaît tes premiers progrès et t’aide à les répéter.",
    milestone: "Transformer les premières observations en habitudes utiles.", assetStatus: "final",
  },
  knight: {
    avatar: finalAvatar("knight", 512), compactAvatar: finalAvatar("knight", 256), fallbackAvatar: PROVISIONAL_AVATAR,
    accent: "border-blue-300/80", aura: "from-blue-300/35 via-cyan-500/10 to-transparent", silhouette: "scale-100", emblem: "♞",
    badge: "Heaume de chevalier", description: "Nox relie tes parties, tes exercices et tes acquis confirmés.",
    milestone: "Maîtriser plusieurs notions et corriger une faiblesse observée.", assetStatus: "final",
  },
  captain: {
    avatar: finalAvatar("captain", 512), compactAvatar: finalAvatar("captain", 256), fallbackAvatar: PROVISIONAL_AVATAR,
    accent: "border-amber-400/80", aura: "from-amber-400/35 via-orange-500/10 to-transparent", silhouette: "scale-100", emblem: "⚔",
    badge: "Lames du capitaine", description: "Nox sait prioriser tes besoins et bâtir des missions plus précises.",
    milestone: "Consolider quatre maîtrises et corriger deux faiblesses réelles.", assetStatus: "final",
  },
  commander: {
    avatar: finalAvatar("commander", 512), compactAvatar: finalAvatar("commander", 256), fallbackAvatar: PROVISIONAL_AVATAR,
    accent: "border-violet-300/80", aura: "from-violet-300/40 via-fuchsia-500/10 to-transparent", silhouette: "scale-100", emblem: "♜",
    badge: "Insigne de commandement", description: "Nox distingue les tendances durables des erreurs isolées.",
    milestone: "Confirmer six maîtrises sur plusieurs journées d’apprentissage.", assetStatus: "final",
  },
  grandmaster: {
    avatar: finalAvatar("grandmaster", 512), compactAvatar: finalAvatar("grandmaster", 256), fallbackAvatar: PROVISIONAL_AVATAR,
    accent: "border-yellow-300/90", aura: "from-yellow-300/45 via-amber-400/15 to-transparent", silhouette: "scale-100", emblem: "♛",
    badge: "Couronne de Nox", description: "Nox est devenu le témoin expérimenté de tout ton parcours.",
    milestone: "Maîtriser les huit familles pédagogiques et corriger durablement quatre faiblesses.", assetStatus: "final",
  },
};

export const NOX_STATE_VISUALS: Record<NoxState, NoxStateVisual> = {
  idle: { label: "À tes côtés", dot: "bg-slate-400", halo: "opacity-35", motion: "motion-safe:animate-[nox-breathe_4s_ease-in-out_infinite]", symbol: "·" },
  listening: { label: "Je t’écoute", dot: "bg-violet-400 motion-safe:animate-pulse", halo: "opacity-70", motion: "motion-safe:animate-[nox-listen_1.8s_ease-in-out_infinite]", symbol: "◖" },
  thinking: { label: "Je réfléchis", dot: "bg-blue-400 motion-safe:animate-pulse", halo: "opacity-75", motion: "motion-safe:animate-[nox-think_2.2s_ease-in-out_infinite]", symbol: "…" },
  tip: { label: "Une piste pour toi", dot: "bg-indigo-400", halo: "opacity-65", motion: "motion-safe:animate-[nox-tip_2.6s_ease-in-out_infinite]", symbol: "✦" },
  success: { label: "Bien vu", dot: "bg-emerald-400", halo: "opacity-80", motion: "motion-safe:animate-[nox-success_700ms_ease-out_1]", symbol: "✓" },
  warning: { label: "À observer", dot: "bg-amber-400", halo: "opacity-55", motion: "motion-safe:animate-[nox-warning_1.5s_ease-in-out_2]", symbol: "!" },
};

export function getNoxRankVisual(rank: NoxRankId | null | undefined): NoxRankVisual {
  return NOX_RANK_ASSETS[rank ?? "squire"] ?? NOX_RANK_ASSETS.squire;
}
