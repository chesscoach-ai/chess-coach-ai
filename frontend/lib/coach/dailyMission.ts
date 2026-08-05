import {
  PGN_EXAMPLES,
  type PGNExample,
  type PGNExampleCategory,
  type PGNExampleDifficulty,
} from "@/data/pgn/examples";
import type {
  LearningProfile,
  LearningTheme,
} from "@/lib/learning/types";
import { getLocalDateKey } from "@/lib/progression/journey";

export type DailyConcept = {
  title: string;
  question: string;
  answers: string[];
  correctAnswer: number;
  explanation: string;
  action: string;
};

export type DailyCoachPlan = {
  id: string;
  date: string;
  focus: LearningTheme;
  focusLabel: string;
  concept: DailyConcept;
  exercise: PGNExample;
};

const CONCEPTS: Record<
  LearningTheme,
  DailyConcept
> = {
  opening: {
    title: "Le centre avant les acrobaties",
    question:
      "Dans l’ouverture, quelle priorité rend généralement tes prochains coups plus faciles ?",
    answers: [
      "Sortir la dame au plus vite",
      "Développer les pièces et sécuriser le roi",
      "Pousser tous les pions d’un côté",
    ],
    correctAnswer: 1,
    explanation:
      "Développer tes pièces donne plus de choix, tandis que le roque évite que ton roi se fasse mater sauvagement au centre.",
    action:
      "Pendant la partie, vise deux pièces développées et un roi prêt à roquer.",
  },
  tactics: {
    title: "Les coups forcés parlent d’abord",
    question:
      "Quel ordre de recherche évite le plus souvent de manquer une tactique immédiate ?",
    answers: [
      "Échecs, prises, menaces",
      "Pions, cavaliers, fous",
      "Attaque, défense, espoir",
    ],
    correctAnswer: 0,
    explanation:
      "Les échecs, prises et menaces limitent les réponses adverses. Ils sont donc les candidats les plus urgents à calculer.",
    action:
      "Avant chaque coup, balaie rapidement les échecs, prises et menaces des deux camps.",
  },
  material: {
    title: "Une pièce gratuite a parfois des dents",
    question:
      "Avant de capturer une pièce qui semble offerte, que faut-il vérifier en premier ?",
    answers: [
      "Si la capture est jolie",
      "Ce que l’adversaire reprend ou menace ensuite",
      "Si la partie durera moins longtemps",
    ],
    correctAnswer: 1,
    explanation:
      "Une capture n’est rentable qu’après avoir regardé la réponse adverse. Les cadeaux empoisonnés adorent les joueurs pressés.",
    action:
      "Compte les attaquants et défenseurs de la case avant chaque échange.",
  },
  calculation: {
    title: "Calculer moins, mais mieux",
    question:
      "Quelle méthode produit un calcul plus fiable ?",
    answers: [
      "Choisir un coup et espérer",
      "Comparer deux ou trois coups candidats et la meilleure réponse adverse",
      "Calculer uniquement ses propres menaces",
    ],
    correctAnswer: 1,
    explanation:
      "Un bon calcul commence par quelques candidats crédibles, puis suppose que l’adversaire répond de la façon la plus résistante.",
    action:
      "Formule deux candidats avant de toucher une pièce, puis cherche la réponse la plus gênante.",
  },
  positional: {
    title: "Réveille ta pire pièce",
    question:
      "Quand aucune tactique immédiate n’existe, quel plan est souvent sain ?",
    answers: [
      "Améliorer la pièce la moins active",
      "Avancer un pion au hasard",
      "Répéter le dernier plan",
    ],
    correctAnswer: 0,
    explanation:
      "Améliorer ta pièce la moins active augmente la coordination de toute l’armée sans créer de faiblesse inutile.",
    action:
      "Repère ta pièce la moins utile et cherche sa meilleure case réaliste.",
  },
  endgame: {
    title: "Le roi devient une pièce d’attaque",
    question:
      "Pourquoi le roi doit-il souvent s’activer en finale ?",
    answers: [
      "Parce que les dames ont disparu",
      "Pour soutenir les pions et contrôler les cases clés",
      "Pour éviter automatiquement les échanges",
    ],
    correctAnswer: 1,
    explanation:
      "Avec moins de menaces de mat, le roi peut soutenir les pions, attaquer les faiblesses et gagner l’opposition.",
    action:
      "Dès que les grosses pièces disparaissent, demande-toi où ton roi serait le plus utile.",
  },
};

const LABELS: Record<
  LearningTheme,
  string
> = {
  opening: "tes ouvertures",
  tactics: "ta vision tactique",
  material: "la gestion du matériel",
  calculation: "ton calcul",
  positional: "tes plans positionnels",
  endgame: "tes finales",
};

export function buildDailyCoachPlan(
  profile: LearningProfile | null,
  date = new Date(),
): DailyCoachPlan {
  const dateKey = getLocalDateKey(date);
  const focus =
    profile?.primaryWeakness ??
    getRotatingTheme(dateKey);
  const category =
    getCategoryForTheme(focus);
  const difficulty =
    getDifficulty(profile?.rating ?? 900);
  const candidates = PGN_EXAMPLES.filter(
    (example) =>
      example.category === category &&
      example.difficulty === difficulty,
  );
  const fallback = PGN_EXAMPLES.filter(
    (example) =>
      example.category === category,
  );
  const pool =
    candidates.length > 0
      ? candidates
      : fallback.length > 0
        ? fallback
        : PGN_EXAMPLES;
  const exercise =
    pool[hash(`${dateKey}:${focus}`) % pool.length];

  return {
    id: `${dateKey}:${focus}:${exercise.id}`,
    date: dateKey,
    focus,
    focusLabel: LABELS[focus],
    concept: CONCEPTS[focus],
    exercise,
  };
}

function getCategoryForTheme(
  theme: LearningTheme,
): PGNExampleCategory {
  if (theme === "opening") {
    return "opening";
  }
  if (theme === "endgame") {
    return "endgame";
  }
  return "middlegame";
}

function getDifficulty(
  rating: number,
): PGNExampleDifficulty {
  if (rating < 1_050) {
    return "débutant";
  }
  if (rating < 1_700) {
    return "intermédiaire";
  }
  return "avancé";
}

function getRotatingTheme(
  dateKey: string,
): LearningTheme {
  const themes: LearningTheme[] = [
    "tactics",
    "opening",
    "calculation",
    "positional",
    "material",
    "endgame",
  ];
  return themes[hash(dateKey) % themes.length];
}

function hash(value: string): number {
  let result = 0;
  for (const character of value) {
    result =
      (result * 31 +
        character.charCodeAt(0)) >>>
      0;
  }
  return result;
}
