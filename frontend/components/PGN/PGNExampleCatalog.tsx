"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type PGNExample,
  type PGNExampleCategory,
  type PGNExampleDifficulty,
} from "@/data/pgn/examples";
import {
  getFavoriteExampleIds,
  getRecentExampleIds,
  toggleFavoriteExample,
} from "@/lib/pgnLibrary";
import PGNExamplePreviewBoard from "@/components/PGN/PGNExamplePreviewBoard";
import PGNExerciseDetails from "@/components/PGN/PGNExerciseDetails";
import { getPGNExampleMetrics } from "@/lib/pgnExampleMetrics";
import {
  getAllExerciseProgress,
  markExerciseCompleted,
  markExerciseStarted,
  recordTrainingActivity,
  resetExerciseProgress,
  type PGNExerciseProgress,
} from "@/lib/pgnExerciseProgress";

type PGNExampleCatalogProps = {
  category: PGNExampleCategory | "all";
  examples: PGNExample[];
  onClose: () => void;
  onSelect: (
    example: PGNExample,
  ) => void | Promise<void>;
};

type CatalogView =
  | "all"
  | "favorites"
  | "recent"
  | "legends";

type ProgressFilter =
  | "all"
  | "not-started"
  | "in-progress"
  | "completed"
  | "review";

const CATEGORY_LABELS: Record<
  PGNExampleCategory | "all",
  {
    title: string;
    description: string;
    icon: string;
  }
> = {
  all: {
    title: "Tous les exercices",
    description:
      "Un catalogue progressif de positions vérifiées, avec une sélection de parties historiques à rejouer.",
    icon: "▦",
  },
  opening: {
    title: "Débuts de partie",
    description:
      "Travaille les ouvertures, le développement et la sécurité du roi.",
    icon: "♟",
  },
  middlegame: {
    title: "Milieux de partie",
    description:
      "Explore les plans stratégiques, les attaques et les moments critiques.",
    icon: "⚔",
  },
  endgame: {
    title: "Finales",
    description:
      "Perfectionne ta technique, l’activité du roi et la conversion.",
    icon: "♔",
  },
};

const DIFFICULTIES: Array<{
  id: PGNExampleDifficulty | "all";
  label: string;
}> = [
  {
    id: "all",
    label: "Tous les niveaux",
  },
  {
    id: "débutant",
    label: "Débutant",
  },
  {
    id: "intermédiaire",
    label: "Intermédiaire",
  },
  {
    id: "avancé",
    label: "Avancé",
  },
];


const PROGRESS_FILTERS: Array<{
  id: ProgressFilter;
  label: string;
}> = [
  {
    id: "all",
    label: "Toute progression",
  },
  {
    id: "not-started",
    label: "À découvrir",
  },
  {
    id: "in-progress",
    label: "En cours",
  },
  {
    id: "completed",
    label: "Terminés",
  },
  {
    id: "review",
    label: "À revoir",
  },
];

export default function PGNExampleCatalog({
  category,
  examples,
  onClose,
  onSelect,
}: PGNExampleCatalogProps) {
  const [search, setSearch] =
    useState("");
  const [difficulty, setDifficulty] =
    useState<
      PGNExampleDifficulty | "all"
    >("all");
  const [view, setView] =
    useState<CatalogView>("all");
  const [visibleCount, setVisibleCount] =
    useState(12);
  const [
    progressFilter,
    setProgressFilter,
  ] = useState<ProgressFilter>(
    "all",
  );
  const [
    favoriteExampleIds,
    setFavoriteExampleIds,
  ] = useState<string[]>([]);
  const [
    recentExampleIds,
    setRecentExampleIds,
  ] = useState<string[]>([]);
  const [
    selectedExample,
    setSelectedExample,
  ] = useState<PGNExample | null>(
    null,
  );
  const [
    exerciseProgress,
    setExerciseProgress,
  ] = useState<Record<
    string,
    PGNExerciseProgress
  >>({});
  useEffect(() => {
    const loadId = window.setTimeout(() => {
      setFavoriteExampleIds(
        getFavoriteExampleIds(),
      );
      setRecentExampleIds(
        getRecentExampleIds(),
      );
      setExerciseProgress(
        getAllExerciseProgress(),
      );
    }, 0);

    return () => window.clearTimeout(loadId);
  }, []);

  const categoryData =
    CATEGORY_LABELS[category];

  const filteredExamples = useMemo(() => {
    const normalizedSearch =
      search.trim().toLocaleLowerCase(
        "fr",
      );

    return examples
      .filter((example) => {
        if (
          view === "favorites" &&
          !favoriteExampleIds.includes(
            example.id,
          )
        ) {
          return false;
        }

        if (
          view === "recent" &&
          !recentExampleIds.includes(
            example.id,
          )
        ) {
          return false;
        }

        if (
          view === "legends" &&
          example.collection !== "legend"
        ) {
          return false;
        }

        const matchesDifficulty =
          difficulty === "all" ||
          example.difficulty ===
            difficulty;

        const progress =
          exerciseProgress[
            example.id
          ];

        const matchesProgress =
          progressFilter === "all" ||
          (progressFilter ===
            "not-started" &&
            !progress) ||
          (progressFilter ===
            "in-progress" &&
            Boolean(progress) &&
            !progress.completedAt) ||
          (progressFilter ===
            "completed" &&
            Boolean(
              progress?.completedAt,
            )) ||
          (progressFilter ===
            "review" &&
            Boolean(
              progress?.needsReview,
            ));

        const searchableText = [
          example.title,
          example.subtitle,
          example.description,
          ...example.themes,
        ]
          .join(" ")
          .toLocaleLowerCase("fr");

        const matchesSearch =
          normalizedSearch.length === 0 ||
          searchableText.includes(
            normalizedSearch,
          );

        return (
          matchesDifficulty &&
          matchesProgress &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        if (view === "recent") {
          return (
            recentExampleIds.indexOf(
              a.id,
            ) -
            recentExampleIds.indexOf(
              b.id,
            )
          );
        }

        const aFavorite =
          favoriteExampleIds.includes(
            a.id,
          );
        const bFavorite =
          favoriteExampleIds.includes(
            b.id,
          );

        if (aFavorite !== bFavorite) {
          return aFavorite ? -1 : 1;
        }

        const aBaseTitle =
          a.title.replace(
            / · position \d+$/,
            "",
          );
        const bBaseTitle =
          b.title.replace(
            / · position \d+$/,
            "",
          );
        const titleComparison =
          aBaseTitle.localeCompare(
            bBaseTitle,
            "fr",
          );

        if (titleComparison !== 0) {
          return titleComparison;
        }

        return (
          (a.decisionNumber ?? 0) -
          (b.decisionNumber ?? 0)
        );
      });
  }, [
    difficulty,
    exerciseProgress,
    examples,
    favoriteExampleIds,
    progressFilter,
    recentExampleIds,
    search,
    view,
  ]);
  const visibleExamples =
    filteredExamples.slice(
      0,
      visibleCount,
    );

  function clearFilters() {
    setSearch("");
    setDifficulty("all");
    setProgressFilter("all");
    setView("all");
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    difficulty !== "all" ||
    progressFilter !== "all" ||
    view !== "all";

  function handleToggleFavorite(
    exampleId: string,
  ) {
    setFavoriteExampleIds(
      toggleFavoriteExample(
        exampleId,
      ),
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 shadow-2xl">
      <header className="border-b border-gray-800 bg-gray-900/80 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-800/70 bg-blue-950/35 text-2xl"
              aria-hidden="true"
            >
              {categoryData.icon}
            </span>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
                Bibliothèque
              </p>

              <h2 className="mt-1 text-2xl font-bold text-white">
                {categoryData.title}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                {categoryData.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800"
          >
            Fermer
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <ViewButton
            active={view === "all"}
            label="Tous"
            count={examples.length}
            onClick={() => {
              setView("all");
            }}
          />

          <ViewButton
            active={
              view === "favorites"
            }
            label="Favoris"
            count={
              examples.filter((example) =>
                favoriteExampleIds.includes(
                  example.id,
                ),
              ).length
            }
            onClick={() => {
              setView("favorites");
            }}
          />

          <ViewButton
            active={view === "recent"}
            label="Récents"
            count={
              examples.filter((example) =>
                recentExampleIds.includes(
                  example.id,
                ),
              ).length
            }
            onClick={() => {
              setView("recent");
            }}
          />

          <ViewButton
            active={view === "legends"}
            label="Parties de légende"
            count={
              examples.filter(
                (example) =>
                  example.collection ===
                  "legend",
              ).length
            }
            onClick={() => {
              setView("legends");
            }}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px_auto]">
          <label className="block">
            <span className="sr-only">
              Rechercher un exemple
            </span>

            <input
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
              }}
              placeholder="Rechercher un nom, un thème ou un plan…"
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-gray-200 outline-none transition placeholder:text-gray-600 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            />
          </label>

          <label className="block">
            <span className="sr-only">
              Filtrer par difficulté
            </span>

            <select
              value={difficulty}
              onChange={(event) => {
                setDifficulty(
                  event.target.value as
                    | PGNExampleDifficulty
                    | "all",
                );
              }}
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-gray-200 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              {DIFFICULTIES.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">
              Filtrer par progression
            </span>

            <select
              value={progressFilter}
              onChange={(event) => {
                setProgressFilter(
                  event.target
                    .value as ProgressFilter,
                );
              }}
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-gray-200 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
            >
              {PROGRESS_FILTERS.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.label}
                  </option>
                ),
              )}
            </select>
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:bg-gray-800"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </header>

      <div className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-400">
            {filteredExamples.length}{" "}
            exercice
            {filteredExamples.length > 1
              ? "s"
              : ""}{" "}
            disponible
            {filteredExamples.length > 1
              ? "s"
              : ""}
          </p>

          <p className="text-xs text-gray-500">
            Les thèmes restent indiqués sur chaque carte, sans ajouter de filtre.
          </p>
        </div>

        {filteredExamples.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleExamples.map(
              (example) => (
                <ExampleCard
                  key={example.id}
                  example={example}
                  isFavorite={favoriteExampleIds.includes(
                    example.id,
                  )}
                  progress={
                    exerciseProgress[
                      example.id
                    ] ?? null
                  }
                  onToggleFavorite={() => {
                    handleToggleFavorite(
                      example.id,
                    );
                  }}
                  onSelect={() => {
                    setSelectedExample(
                      example,
                    );
                  }}
                />
              ),
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 p-8 text-center">
            <p className="font-semibold text-gray-200">
              Aucun exercice trouvé
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Essaie un autre mot-clé,
              change de niveau ou reviens à
              l’affichage « Tous ».
            </p>
          </div>
        )}

        {visibleCount <
          filteredExamples.length && (
          <button
            type="button"
            onClick={() => {
              setVisibleCount(
                (current) => current + 12,
              );
            }}
            className="mx-auto mt-6 flex rounded-xl border border-blue-700 bg-blue-950/30 px-5 py-3 text-sm font-semibold text-blue-200 transition hover:bg-blue-950/50"
          >
            Afficher 12 positions de plus
          </button>
        )}
      </div>

      {selectedExample && (
        <PGNExerciseDetails
          example={selectedExample}
          isFavorite={favoriteExampleIds.includes(
            selectedExample.id,
          )}
          progress={
            exerciseProgress[
              selectedExample.id
            ] ?? null
          }
          onClose={() => {
            setSelectedExample(null);
          }}
          onToggleFavorite={() => {
            handleToggleFavorite(
              selectedExample.id,
            );
          }}
          onStart={() => {
            const progress =
              markExerciseStarted(
                selectedExample.id,
              );

            recordTrainingActivity(
              "started",
            );

            setExerciseProgress(
              (current) => ({
                ...current,
                [selectedExample.id]:
                  progress,
              }),
            );

            void onSelect(selectedExample);
            setSelectedExample(null);
          }}
          onMarkCompleted={() => {
            const progress =
              markExerciseCompleted(
                selectedExample.id,
              );

            recordTrainingActivity(
              "completed",
            );

            setExerciseProgress(
              (current) => ({
                ...current,
                [selectedExample.id]:
                  progress,
              }),
            );
          }}
          onResetProgress={() => {
            resetExerciseProgress(
              selectedExample.id,
            );

            setExerciseProgress(
              (current) => {
                const next = {
                  ...current,
                };

                delete next[
                  selectedExample.id
                ];

                return next;
              },
            );
          }}
        />
      )}
    </section>
  );
}

function ViewButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-sm font-semibold transition",
        active
          ? "border-blue-600 bg-blue-950/40 text-blue-200"
          : "border-gray-700 bg-gray-950 text-gray-400 hover:text-gray-200",
      ].join(" ")}
    >
      {label}
      <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs">
        {count}
      </span>
    </button>
  );
}

function ExampleCard({
  example,
  isFavorite,
  progress,
  onToggleFavorite,
  onSelect,
}: {
  example: PGNExample;
  isFavorite: boolean;
  progress: PGNExerciseProgress | null;
  onToggleFavorite: () => void;
  onSelect: (example: PGNExample) => void;
}) {
  const metrics =
    getPGNExampleMetrics(example);

  return (
    <article className="grid h-full gap-5 rounded-2xl border border-gray-800 bg-gray-900/70 p-4 transition hover:-translate-y-0.5 hover:border-blue-700/70 sm:grid-cols-[150px_minmax(0,1fr)] sm:p-5">
      <div className="mx-auto w-full max-w-[180px] sm:mx-0 sm:max-w-none">
        <PGNExamplePreviewBoard
          example={example}
        />
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">
              {example.title}
            </p>

            <p className="mt-1 text-sm text-gray-400">
              {example.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={
              isFavorite
                ? "Retirer des favoris"
                : "Ajouter aux favoris"
            }
            aria-pressed={isFavorite}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition",
              isFavorite
                ? "border-yellow-700 bg-yellow-950/45 text-yellow-300"
                : "border-gray-700 bg-gray-950 text-gray-500 hover:text-yellow-300",
            ].join(" ")}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {example.collection === "legend" && (
            <span className="inline-flex rounded-full border border-violet-700 bg-violet-950/40 px-3 py-1 text-xs font-semibold text-violet-200">
              ♛ Partie de légende
            </span>
          )}

          <DifficultyBadge
            difficulty={
              example.difficulty
            }
          />

          <CategoryBadge
            category={example.category}
          />

          <ExerciseProgressBadge
            progress={progress}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <MetricItem
            label="Durée"
            value={`${metrics.estimatedMinutes} min`}
          />
          <MetricItem
            label="Coups"
            value={`${metrics.fullMoveCount}`}
          />
          <MetricItem
            label="Niveau"
            value={metrics.estimatedElo}
          />
          <MetricItem
            label="Au trait"
            value={metrics.sideToMove}
          />
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-400">
          {example.description}
        </p>

        {example.historicalNote && (
          <p className="mt-3 rounded-xl border border-violet-900/60 bg-violet-950/20 p-3 text-xs leading-5 text-violet-200/80">
            Conseil historique :{" "}
            {example.historicalNote}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {example.themes.map(
            (theme) => (
              <span
                key={theme}
                className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs text-gray-300"
              >
                {theme}
              </span>
            ),
          )}
        </div>

        <div className="mt-auto pt-5">
          <button
            type="button"
            onClick={() => {
              onSelect(example);
            }}
            className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Voir l’exercice
          </button>
        </div>
      </div>
    </article>
  );
}

function MetricItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/80 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
        {label}
      </p>

      <p className="mt-1 truncate font-semibold text-gray-300">
        {value}
      </p>
    </div>
  );
}

function ExerciseProgressBadge({
  progress,
}: {
  progress: PGNExerciseProgress | null;
}) {
  if (progress?.completedAt) {
    return (
      <span className="inline-flex rounded-full border border-emerald-800 bg-emerald-950/40 px-3 py-1 text-xs font-semibold text-emerald-300">
        ✓ Terminé
      </span>
    );
  }

  if (progress) {
    return (
      <span className="inline-flex rounded-full border border-blue-800 bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-300">
        En cours
      </span>
    );
  }

  return null;
}

function CategoryBadge({
  category,
}: {
  category: PGNExampleCategory;
}) {
  const label =
    category === "opening"
      ? "Ouverture"
      : category ===
          "middlegame"
        ? "Milieu de partie"
        : "Finale";

  return (
    <span className="inline-flex rounded-full border border-gray-700 bg-gray-950 px-3 py-1 text-xs font-semibold text-gray-300">
      {label}
    </span>
  );
}

function DifficultyBadge({
  difficulty,
}: {
  difficulty: PGNExampleDifficulty;
}) {
  const className =
    difficulty === "débutant"
      ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
      : difficulty ===
          "intermédiaire"
        ? "border-orange-800 bg-orange-950/40 text-orange-300"
        : "border-red-800 bg-red-950/40 text-red-300";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        className,
      ].join(" ")}
    >
      {difficulty}
    </span>
  );
}
