"use client";

import type { ProductMode } from "@/components/Layout/ProductWorkspace";

type WorkspaceMenuProps = {
  mode: ProductMode;
  onPlay: () => void;
  onCoach: () => void;
  onExercises: () => void;
  onCommunity: () => void;
  onStatistics: () => void;
  onHistory: () => void;
};

export default function WorkspaceMenu({
  mode,
  onPlay,
  onCoach,
  onExercises,
  onCommunity,
  onStatistics,
  onHistory,
}: WorkspaceMenuProps) {
  const baseClass =
    "flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition active:scale-[0.98]";
  const secondaryClass = `${baseClass} text-gray-400 hover:bg-gray-800 hover:text-white`;

  return (
    <nav
      aria-label="Navigation principale"
      className="native-sticky-top sticky top-0 z-50 -mx-3 mb-4 overflow-x-auto border-y border-gray-800/90 bg-gray-950/95 px-3 py-2 shadow-xl backdrop-blur-xl sm:-mx-6 sm:px-6"
    >
      <div className="mx-auto flex min-w-max max-w-[1500px] items-center gap-1.5">
        <button
          type="button"
          aria-current={mode === "multiplayer" ? "page" : undefined}
          onClick={onPlay}
          className={`${baseClass} ${
            mode === "multiplayer"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
              : "text-blue-300 hover:bg-blue-950/50"
          }`}
        >
          <span aria-hidden="true">♞</span>
          Multijoueur
        </button>
        <button
          type="button"
          aria-current={mode === "analysis" ? "page" : undefined}
          onClick={onCoach}
          className={`${baseClass} ${
            mode === "analysis"
              ? "bg-violet-700 text-white shadow-lg shadow-violet-950/40"
              : "text-violet-300 hover:bg-violet-950/50"
          }`}
        >
          <span aria-hidden="true">💡</span>
          Nox — Analyse
        </button>
        <button
          type="button"
          aria-current={mode === "exercises" ? "page" : undefined}
          onClick={onExercises}
          className={`${baseClass} ${
            mode === "exercises"
              ? "bg-emerald-700 text-white"
              : "text-emerald-300 hover:bg-emerald-950/50"
          }`}
        >
          <span aria-hidden="true">◆</span>
          Exercices
        </button>
        <button type="button" onClick={onCommunity} className={secondaryClass}>
          <span aria-hidden="true">⚔</span>
          Communauté
        </button>
        <button
          type="button"
          aria-current={mode === "progression" ? "page" : undefined}
          onClick={onStatistics}
          className={`${baseClass} ${
            mode === "progression"
              ? "bg-cyan-700 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span aria-hidden="true">↗</span>
          Progression
        </button>
        <button type="button" onClick={onHistory} className={secondaryClass}>
          <span aria-hidden="true">◷</span>
          Mes parties
        </button>
      </div>
    </nav>
  );
}
