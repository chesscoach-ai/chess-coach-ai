"use client";

import { useMemo, useState } from "react";

import PGNExampleCatalog from "@/components/PGN/PGNExampleCatalog";
import {
  PGN_EXAMPLES,
  getExamplesByCategory,
  type PGNExample,
  type PGNExampleCategory,
} from "@/data/pgn/examples";

type LibraryCategory =
  | "all"
  | PGNExampleCategory;

type PGNLibraryBrowserProps = {
  onClose: () => void;

  onSelect: (
    example: PGNExample,
  ) => void | Promise<void>;

  initialCategory?: LibraryCategory;

  loadingExerciseId?: string | null;
};

const CATEGORIES: Array<{
  id: LibraryCategory;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    id: "all",
    label: "Tout",
    icon: "▦",
    description: "Toute la bibliothèque",
  },
  {
    id: "opening",
    label: "Ouvertures",
    icon: "♟",
    description: "Développement et plans",
  },
  {
    id: "middlegame",
    label: "Milieux",
    icon: "⚔",
    description: "Stratégie et tactique",
  },
  {
    id: "endgame",
    label: "Finales",
    icon: "♔",
    description: "Technique et conversion",
  },
];

export default function PGNLibraryBrowser({
  onClose,
  onSelect,
  initialCategory = "all",
  loadingExerciseId = null,
}: PGNLibraryBrowserProps) {
  const [category, setCategory] =
    useState<LibraryCategory>(
      initialCategory,
    );

  const examples = useMemo(() => {
    if (category === "all") {
      return PGN_EXAMPLES;
    }

    return getExamplesByCategory(
      category,
    );
  }, [category]);

  async function handleSelect(
    example: PGNExample,
  ): Promise<void> {
    /*
     * On empêche l’ouverture de plusieurs exercices
     * pendant que Stockfish analyse déjà une position.
     */
    if (loadingExerciseId !== null) {
      return;
    }

    await onSelect(example);
  }

  return (
    <section
      id="exercise-library"
      className="scroll-mt-24 space-y-4"
    >
      {loadingExerciseId && (
        <div className="rounded-2xl border border-blue-700/50 bg-blue-950/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-transparent"
            />

            <div>
              <p className="font-semibold text-blue-100">
                Analyse Stockfish en cours
              </p>

              <p className="mt-1 text-sm text-blue-300/80">
                Préparation de l’exercice «{" "}
                {loadingExerciseId} »…
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CATEGORIES.map((item) => {
          const active =
            item.id === category;

          const count =
            item.id === "all"
              ? PGN_EXAMPLES.length
              : getExamplesByCategory(
                  item.id,
                ).length;

          return (
            <button
              key={item.id}
              type="button"
              disabled={
                loadingExerciseId !== null
              }
              onClick={() => {
                setCategory(item.id);
              }}
              className={[
                "rounded-2xl border p-4 text-left transition",
                active
                  ? "border-blue-600 bg-blue-950/35 shadow-lg shadow-blue-950/20"
                  : "border-gray-800 bg-gray-900/65 hover:border-gray-700",
                loadingExerciseId !== null
                  ? "cursor-not-allowed opacity-60"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl">
                  {item.icon}
                </span>

                <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs text-gray-400">
                  {count}
                </span>
              </div>

              <p className="mt-3 font-bold text-white">
                {item.label}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <div
        className={
          loadingExerciseId !== null
            ? "pointer-events-none opacity-60"
            : ""
        }
        aria-busy={
          loadingExerciseId !== null
        }
      >
        <PGNExampleCatalog
          category={category}
          examples={examples}
          onClose={onClose}
          onSelect={(example) => {
            void handleSelect(example);
          }}
        />
      </div>
    </section>
  );
}