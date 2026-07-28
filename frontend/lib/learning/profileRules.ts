import type {
  LearningMoveSample,
  LearningProfile,
  LearningRecommendation,
  LearningTheme,
  StoredLearningProfile,
} from "@/lib/learning/types";

export const THEME_LABELS: Record<LearningTheme, string> = {
  opening: "les principes d’ouverture",
  tactics: "la vigilance tactique",
  material: "la gestion du matériel",
  calculation: "le calcul des réponses adverses",
  positional: "l’activité et le placement des pièces",
  endgame: "la technique de finale",
};

const THEME_ACTIONS: Record<LearningTheme, string> = {
  opening:
    "Sur les 10 premiers coups, vérifie développement, centre et sécurité du roi.",
  tactics:
    "Avant chaque coup, cherche dans l’ordre les échecs, les prises et les menaces.",
  material:
    "Compte les attaquants et défenseurs avant chaque échange ou prise.",
  calculation:
    "Compare deux coups candidats et imagine la meilleure réponse adverse.",
  positional:
    "Repère ta pièce la moins active et cherche une case où elle aura plus d’influence.",
  endgame:
    "Active le roi et calcule les courses de pions avant toute poussée irréversible.",
};

export function inferLearningTheme(
  sample: LearningMoveSample,
  totalMoves: number,
): LearningTheme {
  if (sample.moveIndex < Math.min(16, Math.ceil(totalMoves * 0.3))) {
    return "opening";
  }
  if (sample.moveIndex >= Math.max(40, Math.floor(totalMoves * 0.75))) {
    return "endgame";
  }
  const variationText = sample.bestVariation.join(" ");
  if (/[+#x]/.test(variationText)) return "tactics";
  if (sample.isCapture) return "material";
  if (
    sample.classification === "blunder" ||
    sample.classification === "mistake"
  ) {
    return "calculation";
  }
  return "positional";
}

export function buildLearningProfile(input: {
  playerName: string;
  rating: number;
  stored: StoredLearningProfile | null;
}): LearningProfile {
  const { playerName, rating, stored } = input;
  const rankedThemes = stored
    ? (Object.entries(stored.themes) as Array<
        [LearningTheme, StoredLearningProfile["themes"][LearningTheme]]
      >)
        .filter(([, aggregate]) => aggregate.occurrences > 0)
        .sort(
          ([, first], [, second]) =>
            themeScore(second) - themeScore(first),
        )
    : [];
  const primaryWeakness = rankedThemes[0]?.[0] ?? null;
  const strength = getStrength(stored);
  const recommendations = rankedThemes
    .slice(0, 3)
    .map(([theme, aggregate]) =>
      buildRecommendation(theme, aggregate.occurrences, rating),
    );

  if (recommendations.length === 0) {
    recommendations.push({
      theme: "calculation",
      title: "Construisons ton profil",
      explanation:
        "Analyse une première partie complète pour que le coach repère une tendance fiable.",
      action:
        "Importe une partie récente d’au moins 15 coups, puis laisse l’analyse aller jusqu’au bout.",
    });
  }

  return {
    playerName,
    rating,
    levelLabel: getLevelLabel(rating),
    sessionsCount: stored?.sessionsCount ?? 0,
    analyzedMoves: stored?.analyzedMoves ?? 0,
    message: buildCoachMessage({
      playerName,
      rating,
      sessionsCount: stored?.sessionsCount ?? 0,
      primaryWeakness,
      strength,
    }),
    primaryWeakness,
    primaryWeaknessLabel: primaryWeakness
      ? THEME_LABELS[primaryWeakness]
      : null,
    strength,
    recommendations,
    averageEvaluationLoss:
      stored && stored.analyzedMoves > 0
        ? Number(
            (
              stored.totalEvaluationLoss /
              stored.analyzedMoves
            ).toFixed(2),
          )
        : 0,
    classifications:
      stored?.classifications ?? {
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        blunder: 0,
      },
    themeOccurrences: {
      opening:
        stored?.themes.opening
          .occurrences ?? 0,
      tactics:
        stored?.themes.tactics
          .occurrences ?? 0,
      material:
        stored?.themes.material
          .occurrences ?? 0,
      calculation:
        stored?.themes.calculation
          .occurrences ?? 0,
      positional:
        stored?.themes.positional
          .occurrences ?? 0,
      endgame:
        stored?.themes.endgame
          .occurrences ?? 0,
    },
    updatedAt: stored?.updatedAt ?? null,
  };
}

function themeScore(aggregate: {
  occurrences: number;
  severeErrors: number;
  totalLoss: number;
}): number {
  return (
    aggregate.occurrences +
    aggregate.severeErrors * 2 +
    aggregate.totalLoss / 2
  );
}

function buildRecommendation(
  theme: LearningTheme,
  occurrences: number,
  rating: number,
): LearningRecommendation {
  const levelContext =
    rating < 1000
      ? "On va travailler une routine simple et répétable."
      : rating < 1500
        ? "L’objectif est de rendre ta prise de décision plus régulière."
        : "Nous allons affiner la précision dans les positions critiques.";
  return {
    theme,
    title: capitalize(THEME_LABELS[theme]),
    explanation: `${occurrences} erreur${occurrences > 1 ? "s" : ""} récente${occurrences > 1 ? "s" : ""} concerne${occurrences > 1 ? "nt" : ""} ce thème. ${levelContext}`,
    action: THEME_ACTIONS[theme],
  };
}

function buildCoachMessage(input: {
  playerName: string;
  rating: number;
  sessionsCount: number;
  primaryWeakness: LearningTheme | null;
  strength: string | null;
}): string {
  if (input.sessionsCount === 0 || !input.primaryWeakness) {
    return `Bienvenue ${input.playerName}. À ton niveau actuel d’environ ${input.rating} Elo, je vais surtout chercher les décisions qui reviennent souvent, pas te noyer dans de longues variantes. Analyse une partie et je construirai ton premier plan de progression.`;
  }

  const positive = input.strength
    ? `Ton point positif actuel : ${input.strength}. `
    : "";
  return `${input.playerName}, après ${input.sessionsCount} partie${input.sessionsCount > 1 ? "s" : ""} analysée${input.sessionsCount > 1 ? "s" : ""}, ta priorité est ${THEME_LABELS[input.primaryWeakness]}. ${positive}Je vais te proposer des positions courtes adaptées à ton niveau de ${input.rating} Elo pour transformer cette tendance en réflexe.`;
}

function getStrength(stored: StoredLearningProfile | null): string | null {
  if (!stored || stored.analyzedMoves === 0) return null;
  const strongMoves =
    stored.classifications.excellent + stored.classifications.good;
  const rate = Math.round((strongMoves / stored.analyzedMoves) * 100);
  if (rate >= 80) return "tu joues très régulièrement des coups solides";
  if (rate >= 60) return "la majorité de tes décisions restent fiables";
  return null;
}

function getLevelLabel(rating: number): string {
  if (rating < 900) return "Débutant";
  if (rating < 1200) return "Joueur en progression";
  if (rating < 1600) return "Intermédiaire";
  if (rating < 2000) return "Joueur confirmé";
  return "Joueur avancé";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
