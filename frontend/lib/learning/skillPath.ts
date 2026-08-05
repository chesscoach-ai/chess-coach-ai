import type { PGNExample } from "@/data/pgn/examples";
import type { LearningProfile, LearningTheme } from "@/lib/learning/types";
import type { PGNExerciseProgress } from "@/lib/pgnExerciseProgress";

export type SkillChapterId =
  | "foundations"
  | "tactics"
  | "strategy"
  | "endgames"
  | "champions";

export type SkillPathChapter = {
  id: SkillChapterId;
  title: string;
  description: string;
  icon: string;
  completed: number;
  total: number;
  status: "active" | "mastered" | "available";
  nextExerciseId: string | null;
};

export type SkillPath = {
  chapters: SkillPathChapter[];
  mastered: number;
  total: number;
  progressPercent: number;
  recommendedExerciseId: string | null;
  recommendedChapterId: SkillChapterId;
  recommendationLabel: string;
};

const CHAPTERS: Array<{
  id: SkillChapterId;
  title: string;
  description: string;
  icon: string;
}> = [
  {
    id: "foundations",
    title: "Fondations",
    description: "Développe tes pièces et sécurise ton roi.",
    icon: "🏕️",
  },
  {
    id: "tactics",
    title: "Réflexes tactiques",
    description: "Vois les menaces avant qu’elles ne mordent.",
    icon: "⚡",
  },
  {
    id: "strategy",
    title: "Plans de bataille",
    description: "Place tes pièces avec une vraie intention.",
    icon: "🗺️",
  },
  {
    id: "endgames",
    title: "Finales",
    description: "Transforme un petit avantage en victoire.",
    icon: "♔",
  },
  {
    id: "champions",
    title: "Salle des légendes",
    description: "Prends les décisions des grands champions.",
    icon: "🏛️",
  },
];

const TACTICAL_WORDS =
  /attaque|sacrifice|tactique|combinaison|mat|initiative|gain|fourchette|clouage|tempo/i;

export function buildSkillPath(input: {
  examples: PGNExample[];
  progress: Record<string, PGNExerciseProgress>;
  profile?: Pick<LearningProfile, "primaryWeakness" | "rating"> | null;
}): SkillPath {
  const byChapter = new Map<SkillChapterId, PGNExample[]>(
    CHAPTERS.map((chapter) => [chapter.id, []]),
  );
  for (const example of input.examples) {
    byChapter.get(getExampleChapter(example))?.push(example);
  }

  const preferredChapter = input.profile?.primaryWeakness
    ? getThemeChapter(input.profile.primaryWeakness)
    : firstIncompleteChapter(byChapter, input.progress);
  const targetRating = input.profile?.rating ?? 900;
  const chapters = CHAPTERS.map((chapter) => {
    const examples = byChapter.get(chapter.id) ?? [];
    const mastered = examples.filter((example) =>
      isMastered(input.progress[example.id]),
    ).length;
    const next = rankExercises(examples, input.progress, targetRating)[0];
    return {
      ...chapter,
      completed: mastered,
      total: examples.length,
      status:
        examples.length > 0 && mastered === examples.length
          ? ("mastered" as const)
          : chapter.id === preferredChapter
            ? ("active" as const)
            : ("available" as const),
      nextExerciseId: next?.id ?? null,
    };
  });
  const preferredExercises = byChapter.get(preferredChapter) ?? [];
  const recommended =
    rankExercises(preferredExercises, input.progress, targetRating)[0] ??
    rankExercises(input.examples, input.progress, targetRating)[0] ??
    null;
  const mastered = input.examples.filter((example) =>
    isMastered(input.progress[example.id]),
  ).length;

  return {
    chapters,
    mastered,
    total: input.examples.length,
    progressPercent:
      input.examples.length === 0
        ? 0
        : Math.round((mastered / input.examples.length) * 100),
    recommendedExerciseId: recommended?.id ?? null,
    recommendedChapterId: preferredChapter,
    recommendationLabel: input.profile?.primaryWeakness
      ? "Choisie d’après tes parties analysées"
      : "Choisie d’après ta progression",
  };
}

function rankExercises(
  examples: PGNExample[],
  progress: Record<string, PGNExerciseProgress>,
  rating: number,
): PGNExample[] {
  const targetDifficulty = rating < 1_000 ? 0 : rating < 1_600 ? 1 : 2;
  const difficulty = {
    débutant: 0,
    intermédiaire: 1,
    avancé: 2,
  } as const;

  return [...examples].sort((first, second) => {
    const firstProgress = progress[first.id];
    const secondProgress = progress[second.id];
    const firstPriority = getProgressPriority(firstProgress);
    const secondPriority = getProgressPriority(secondProgress);
    return (
      firstPriority - secondPriority ||
      Math.abs(difficulty[first.difficulty] - targetDifficulty) -
        Math.abs(difficulty[second.difficulty] - targetDifficulty) ||
      first.title.localeCompare(second.title, "fr")
    );
  });
}

function getProgressPriority(progress: PGNExerciseProgress | undefined) {
  if (progress?.needsReview) return 0;
  if (!progress?.completedAt) return 1;
  return 2;
}

function isMastered(progress: PGNExerciseProgress | undefined): boolean {
  return Boolean(progress?.completedAt && !progress.needsReview);
}

function firstIncompleteChapter(
  byChapter: Map<SkillChapterId, PGNExample[]>,
  progress: Record<string, PGNExerciseProgress>,
): SkillChapterId {
  return (
    CHAPTERS.find((chapter) =>
      (byChapter.get(chapter.id) ?? []).some(
        (example) => !isMastered(progress[example.id]),
      ),
    )?.id ?? "champions"
  );
}

function getExampleChapter(example: PGNExample): SkillChapterId {
  if (example.collection === "legend") return "champions";
  if (example.category === "opening") return "foundations";
  if (example.category === "endgame") return "endgames";
  const searchable = [
    example.title,
    example.subtitle,
    example.description,
    ...example.themes,
  ].join(" ");
  return TACTICAL_WORDS.test(searchable) ? "tactics" : "strategy";
}

function getThemeChapter(theme: LearningTheme): SkillChapterId {
  if (theme === "opening") return "foundations";
  if (theme === "endgame") return "endgames";
  if (theme === "positional") return "strategy";
  return "tactics";
}
