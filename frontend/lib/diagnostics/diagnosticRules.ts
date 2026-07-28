import type {
  DiagnosticTheme,
  PedagogicalDiagnostic,
} from "@/types/pedagogicalDiagnostic";

export type DiagnosticInput = {
  ply: number;
  moveNumber: number;
  side: "white" | "black";
  fenBefore: string;

  playedMoveUci: string;
  playedMoveSan?: string;
  bestMoveUci: string;
  bestMoveSan?: string;

  evaluationBeforeCp?: number;
  evaluationAfterCp?: number;
  evaluationLossCp: number;

  principalVariationSan?: string[];
  principalVariationUci?: string[];

  backendTheme?: DiagnosticTheme;
  backendExplanation?: string;

  materialLossCp?: number;
  isMateThreat?: boolean;
  missesMate?: boolean;
  leavesKingInCenter?: boolean;
  delaysDevelopment?: boolean;
  movedSamePieceAgain?: boolean;
  hangingPiece?: boolean;
  missedTacticalShot?: boolean;
  worsensPawnStructure?: boolean;
  losesInitiative?: boolean;
  endgameTechniqueError?: boolean;
};

type RuleResult = {
  theme: DiagnosticTheme;
  score: number;
  title: string;
  summary: string;
  whyItMatters: string;
  coachingAdvice: string;
  hint: string;
  signals: PedagogicalDiagnostic["signals"];
};

export function buildPedagogicalDiagnostic(
  input: DiagnosticInput,
): PedagogicalDiagnostic {
  const rules = evaluateRules(input);
  const bestRule =
    rules.sort((a, b) => b.score - a.score)[0] ??
    fallbackRule(input);

  const secondaryThemes = rules
    .filter(
      (rule) =>
        rule.theme !== bestRule.theme &&
        rule.score >= 25,
    )
    .slice(0, 2)
    .map((rule) => rule.theme);

  return {
    id: `${input.ply}-${input.playedMoveUci}-${input.bestMoveUci}`,
    ply: input.ply,
    moveNumber: input.moveNumber,
    side: input.side,
    playedMoveUci: input.playedMoveUci,
    playedMoveSan: input.playedMoveSan,
    bestMoveUci: input.bestMoveUci,
    bestMoveSan: input.bestMoveSan,
    severity: classifySeverity(
      input.evaluationLossCp,
    ),
    primaryTheme: bestRule.theme,
    secondaryThemes,
    evaluationBeforeCp:
      input.evaluationBeforeCp,
    evaluationAfterCp:
      input.evaluationAfterCp,
    evaluationLossCp:
      input.evaluationLossCp,
    title: bestRule.title,
    summary:
      input.backendExplanation ??
      bestRule.summary,
    whyItMatters:
      bestRule.whyItMatters,
    coachingAdvice:
      bestRule.coachingAdvice,
    hint: bestRule.hint,
    principalVariationSan:
      input.principalVariationSan,
    principalVariationUci:
      input.principalVariationUci,
    signals: bestRule.signals,
    confidence: Math.min(
      0.98,
      Math.max(
        0.35,
        bestRule.score / 100,
      ),
    ),
  };
}

function evaluateRules(
  input: DiagnosticInput,
): RuleResult[] {
  const results: RuleResult[] = [];

  if (
    input.hangingPiece ||
    (input.materialLossCp ?? 0) >= 100
  ) {
    results.push({
      theme: "material",
      score:
        55 +
        Math.min(
          35,
          (input.materialLossCp ?? 100) /
            20,
        ),
      title: "Perte de matériel évitable",
      summary:
        "Le coup joué permet à l’adversaire de gagner du matériel ou laisse une pièce insuffisamment protégée.",
      whyItMatters:
        "Un déficit matériel durable rend la défense plus difficile et réduit les possibilités tactiques.",
      coachingAdvice:
        "Avant de jouer, vérifie systématiquement les pièces attaquées, les défenseurs et les échanges forcés.",
      hint:
        "Cherche d’abord les coups qui protègent une pièce, créent une menace plus forte ou simplifient favorablement.",
      signals: [
        {
          key: "materialLossCp",
          value:
            input.materialLossCp ?? null,
        },
        {
          key: "hangingPiece",
          value:
            Boolean(input.hangingPiece),
        },
      ],
    });
  }

  if (
    input.isMateThreat ||
    input.missesMate ||
    input.leavesKingInCenter
  ) {
    results.push({
      theme: "king-safety",
      score:
        52 +
        (input.missesMate ? 35 : 0) +
        (input.isMateThreat ? 20 : 0) +
        (input.leavesKingInCenter
          ? 12
          : 0),
      title: input.missesMate
        ? "Occasion de mat manquée"
        : "Sécurité du roi compromise",
      summary:
        input.missesMate
          ? "Une séquence forcée permettait de conclure ou de créer une attaque décisive contre le roi."
          : "Le coup joué laisse le roi exposé ou ne répond pas correctement à une menace directe.",
      whyItMatters:
        "Les menaces contre le roi priment sur les considérations positionnelles et matérielles ordinaires.",
      coachingAdvice:
        "Commence chaque calcul par les échecs, les prises et les menaces de mat des deux camps.",
      hint:
        "Examine tous les échecs disponibles et les cases de fuite du roi adverse.",
      signals: [
        {
          key: "isMateThreat",
          value:
            Boolean(input.isMateThreat),
        },
        {
          key: "missesMate",
          value:
            Boolean(input.missesMate),
        },
        {
          key: "leavesKingInCenter",
          value:
            Boolean(input.leavesKingInCenter),
        },
      ],
    });
  }

  if (
    input.missedTacticalShot
  ) {
    results.push({
      theme: "tactic",
      score: 84,
      title: "Ressource tactique manquée",
      summary:
        "La position contenait une séquence concrète plus forte que le coup joué.",
      whyItMatters:
        "Une tactique transforme immédiatement l’évaluation de la position et peut décider la partie.",
      coachingAdvice:
        "Utilise une routine de calcul : échecs, prises, menaces, puis vérifie la meilleure réponse adverse.",
      hint:
        "Cherche un coup forcing qui limite fortement les réponses adverses.",
      signals: [
        {
          key: "missedTacticalShot",
          value: true,
        },
      ],
    });
  }

  if (
    input.delaysDevelopment ||
    input.movedSamePieceAgain
  ) {
    results.push({
      theme: "development",
      score:
        48 +
        (input.delaysDevelopment
          ? 18
          : 0) +
        (input.movedSamePieceAgain
          ? 12
          : 0),
      title: "Développement insuffisant",
      summary:
        "Le coup joué consomme un tempo sans améliorer suffisamment la coordination des pièces.",
      whyItMatters:
        "Un retard de développement peut laisser le roi au centre et permettre à l’adversaire de prendre l’initiative.",
      coachingAdvice:
        "En ouverture, privilégie le développement, le contrôle du centre et la mise en sécurité du roi.",
      hint:
        "Cherche une pièce encore sur sa case de départ qui peut être développée utilement.",
      signals: [
        {
          key: "delaysDevelopment",
          value: Boolean(
            input.delaysDevelopment,
          ),
        },
        {
          key: "movedSamePieceAgain",
          value: Boolean(
            input.movedSamePieceAgain,
          ),
        },
      ],
    });
  }

  if (
    input.worsensPawnStructure
  ) {
    results.push({
      theme: "pawn-structure",
      score: 62,
      title: "Structure de pions affaiblie",
      summary:
        "Le coup crée une faiblesse durable dans la structure de pions.",
      whyItMatters:
        "Les faiblesses de pions sont difficiles à corriger et deviennent souvent des cibles en milieu de partie ou en finale.",
      coachingAdvice:
        "Avant une poussée ou une reprise de pion, évalue les cases faibles, les pions isolés et les colonnes ouvertes créées.",
      hint:
        "Compare les deux reprises possibles et cherche celle qui conserve la structure la plus saine.",
      signals: [
        {
          key: "worsensPawnStructure",
          value: true,
        },
      ],
    });
  }

  if (
    input.losesInitiative
  ) {
    results.push({
      theme: "initiative",
      score: 58,
      title: "Initiative abandonnée",
      summary:
        "Le coup joué est trop lent et permet à l’adversaire d’organiser sa défense ou de reprendre le contrôle.",
      whyItMatters:
        "Quand tu disposes de l’initiative, chaque tempo compte pour maintenir la pression.",
      coachingAdvice:
        "Cherche les coups qui créent plusieurs menaces ou améliorent une pièce avec tempo.",
      hint:
        "Trouve un coup actif qui oblige l’adversaire à répondre.",
      signals: [
        {
          key: "losesInitiative",
          value: true,
        },
      ],
    });
  }

  if (
    input.endgameTechniqueError
  ) {
    results.push({
      theme: "endgame",
      score: 70,
      title: "Technique de finale imprécise",
      summary:
        "Le coup joué complique ou compromet une finale qui demandait une méthode précise.",
      whyItMatters:
        "En finale, un seul tempo peut décider la promotion d’un pion ou l’activité du roi.",
      coachingAdvice:
        "Active le roi, calcule les courses de pions et identifie les positions théoriques pertinentes.",
      hint:
        "Regarde d’abord si ton roi peut devenir plus actif ou si un pion passé peut être créé.",
      signals: [
        {
          key: "endgameTechniqueError",
          value: true,
        },
      ],
    });
  }

  if (input.backendTheme) {
    results.push(
      genericThemeRule(
        input.backendTheme,
        72,
      ),
    );
  }

  return results;
}

function fallbackRule(
  input: DiagnosticInput,
): RuleResult {
  return {
    theme: "calculation",
    score:
      input.evaluationLossCp >= 200
        ? 65
        : 48,
    title: "Meilleure continuation manquée",
    summary:
      "Le coup joué laisse échapper une continuation plus précise proposée par le moteur.",
    whyItMatters:
      "Même sans motif unique détecté, l’écart d’évaluation indique que la réponse adverse mérite d’être calculée plus profondément.",
    coachingAdvice:
      "Avant de valider ton coup, calcule au moins une réponse forte de l’adversaire et compare deux coups candidats.",
    hint:
      "Cherche un coup plus forcing ou une amélioration immédiate de ta pièce la moins active.",
    signals: [
      {
        key: "evaluationLossCp",
        value: input.evaluationLossCp,
      },
    ],
  };
}

function genericThemeRule(
  theme: DiagnosticTheme,
  score: number,
): RuleResult {
  const labels: Record<
    DiagnosticTheme,
    string
  > = {
    tactic: "Motif tactique",
    material: "Gestion du matériel",
    "king-safety":
      "Sécurité du roi",
    development: "Développement",
    "piece-activity":
      "Activité des pièces",
    "pawn-structure":
      "Structure de pions",
    initiative: "Initiative",
    calculation: "Calcul",
    endgame: "Finale",
    opening: "Ouverture",
    other: "Décision imprécise",
  };

  return {
    theme,
    score,
    title: labels[theme],
    summary:
      "Le diagnostic transmis par le moteur indique que ce thème explique principalement la perte d’évaluation.",
    whyItMatters:
      "Identifier le thème permet de transformer une erreur ponctuelle en axe de progression réutilisable.",
    coachingAdvice:
      "Rejoue la position, compare plusieurs coups candidats et formule la raison de ton choix avant d’afficher la solution.",
    hint:
      "Concentre-toi sur le thème indiqué et cherche le coup qui répond le plus directement au problème.",
    signals: [
      {
        key: "backendTheme",
        value: theme,
      },
    ],
  };
}

function classifySeverity(
  lossCp: number,
): PedagogicalDiagnostic["severity"] {
  if (lossCp >= 250) {
    return "blunder";
  }

  if (lossCp >= 120) {
    return "mistake";
  }

  if (lossCp >= 50) {
    return "inaccuracy";
  }

  return "info";
}
