"use client";

import Image from "next/image";
import { useState } from "react";

import { getNoxRankVisual, NOX_STATE_VISUALS } from "@/lib/nox/rankAssets";
import type { NoxRankId } from "@/lib/nox/progressionTypes";
import type { NoxState } from "@/lib/nox/types";

const SIZE_CLASSES = {
  compact: "h-12 w-12",
  regular: "h-16 w-16",
  hero: "h-24 w-24 sm:h-28 sm:w-28",
} as const;

export default function NoxAvatar({
  rank = "squire",
  state = "idle",
  rankLabel = "Écuyer",
  size = "regular",
  priority = false,
  showState = true,
}: {
  rank?: NoxRankId;
  state?: NoxState;
  rankLabel?: string;
  size?: keyof typeof SIZE_CLASSES;
  priority?: boolean;
  showState?: boolean;
}) {
  const visual = getNoxRankVisual(rank);
  const stateVisual = NOX_STATE_VISUALS[state];
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const requestedSource = size === "compact" ? visual.compactAvatar : visual.avatar;
  const source = failedAvatar === requestedSource ? visual.fallbackAvatar : requestedSource;

  return (
    <div
      className={`group/nox relative shrink-0 ${SIZE_CLASSES[size]}`}
      data-nox-rank={rank}
      data-nox-state={state}
      aria-label={`Nox, ${rankLabel}. ${visual.description} État : ${stateVisual.label}.`}
    >
      <span
        aria-hidden="true"
        className={`absolute -inset-2 rounded-[1.35rem] bg-gradient-to-br blur-lg transition-opacity motion-reduce:transition-none ${visual.aura} ${stateVisual.halo}`}
      />
      <div className={`relative h-full w-full overflow-hidden rounded-2xl border-2 bg-slate-950 shadow-[0_0_24px_rgba(99,102,241,0.22)] ${visual.accent} ${stateVisual.motion} motion-reduce:animate-none motion-reduce:transform-none`}>
        <Image
          src={source}
          alt=""
          fill
          sizes={size === "hero" ? "112px" : size === "regular" ? "64px" : "48px"}
          className={`object-contain object-bottom transition-transform duration-500 motion-reduce:transition-none ${visual.silhouette}`}
          onError={() => setFailedAvatar(requestedSource)}
          priority={priority}
        />
        <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/80 to-transparent" aria-hidden="true" />
      </div>
      <span
        aria-hidden="true"
        title={visual.badge}
        className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/20 bg-slate-950 px-1 text-[11px] font-black text-white shadow-lg"
      >
        {visual.emblem}
      </span>
      {showState && state !== "idle" && (
        <span aria-hidden="true" className="absolute -left-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/15 bg-slate-950 px-1 text-[10px] font-black text-indigo-100 shadow-lg">
          {stateVisual.symbol}
        </span>
      )}
    </div>
  );
}
