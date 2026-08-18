import type { NoxRankId } from "@/lib/nox/progressionTypes";

export const NOX_RANK_ASSETS: Record<NoxRankId, { avatar: string; accent: string; emblem: string }> = {
  squire: { avatar: "/brand/nox-squire.svg", accent: "border-indigo-500/60", emblem: "◇" },
  "young-knight": { avatar: "/brand/nox-squire.svg", accent: "border-sky-400/70", emblem: "✦" },
  knight: { avatar: "/brand/nox-squire.svg", accent: "border-blue-300/80", emblem: "♞" },
  captain: { avatar: "/brand/nox-squire.svg", accent: "border-amber-400/80", emblem: "⚔" },
  commander: { avatar: "/brand/nox-squire.svg", accent: "border-violet-300/80", emblem: "♜" },
  grandmaster: { avatar: "/brand/nox-squire.svg", accent: "border-yellow-300/90", emblem: "♛" },
};
