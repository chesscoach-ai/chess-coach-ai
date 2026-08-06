import type { LearningProfile, LearningTheme } from "@/lib/learning/types";
import type { MoveAnalysis } from "@/services/api/ApiService";

const POSITION_FOCUS: Record<LearningTheme, string> = {
  opening:
    "Ce coup mérite ton attention parce qu’il organise le centre et la sortie des pièces, deux repères qui t’ont déjà coûté du temps dans l’ouverture.",
  tactics:
    "Ici, ne mémorise pas seulement le coup : observe quelles pièces deviennent attaquées ou mieux protégées juste après son déplacement.",
  material:
    "Ton point de vigilance est le matériel : compare ce que cette pièce attaque avant et après son déplacement, puis compte les défenseurs.",
  calculation:
    "Cette position est un bon exercice pour ton calcul : imagine d’abord la réponse adverse la plus gênante, puis vérifie si le coup tient encore.",
  positional:
    "Regarde surtout l’activité gagnée par la pièce déplacée. C’est ce changement de rôle, plus que la notation du coup, qu’il faut retenir.",
  endgame:
    "Dans une finale, chaque tempo compte : regarde si ce coup rapproche le roi, libère un pion ou limite le roi adverse.",
};

const EXERCISE_QUESTIONS: Record<LearningTheme, string[]> = {
  opening: [
    "Quelles pièces sont encore enfermées, et ton roi est-il prêt à se mettre à l’abri ?",
    "Avant de jouer, vérifie qui contrôle le centre et quelle pièce peut se développer avec un gain de temps.",
  ],
  tactics: [
    "Fais un balayage précis : échecs possibles, pièces non protégées, puis alignements sur les rois et les dames.",
    "Quelle pièce adverse a le moins de défenseurs ? Commence ton enquête là, sans encore déplacer de pièce.",
  ],
  material: [
    "Compte les attaquants et les défenseurs sur les cases de contact avant d’envisager un échange.",
    "Si tu captures, quelle sera la recapture ? Fais le bilan complet avant de toucher la pièce.",
  ],
  calculation: [
    "Choisis deux coups candidats, puis cherche pour chacun la réponse adverse qui t’embêterait le plus.",
    "Ne t’arrête pas à ton idée : visualise la position une réponse plus tard avant de décider.",
  ],
  positional: [
    "Quelle est ta pièce la moins utile dans cette position, et sur quelle case aurait-elle un vrai rôle ?",
    "Observe les cases faibles et les lignes ouvertes : quelle pièce pourrait en profiter sans se mettre en danger ?",
  ],
  endgame: [
    "Compare l’activité des deux rois et les courses de pions avant toute poussée irréversible.",
    "Quel tempo peux-tu gagner tout en rapprochant ton roi ou en limitant celui de l’adversaire ?",
  ],
};

export function buildPositionCoachInsight({
  move,
  profile,
}: {
  move: MoveAnalysis;
  profile: LearningProfile | null;
}): string {
  const idea = move.strategic_ideas[0] ?? move.explanation;

  if (!profile || !profile.primaryWeakness) {
    return `${idea} Après le déplacement du ${move.moved_piece}, compare son activité et la meilleure réponse adverse : c’est ce duo d’informations qui rendra ton choix réutilisable.`;
  }

  const history =
    profile.sessionsCount > 1
      ? `Sur tes ${profile.sessionsCount} dernières analyses, le coach a surtout repéré ${profile.primaryWeaknessLabel}. `
      : "Je commence à reconnaître ta façon de décider. ";

  return `${history}${POSITION_FOCUS[profile.primaryWeakness]} Dans cette position, le ${move.moved_piece} joue ${move.move_san} : ${idea}`;
}

export function buildExerciseCoachMessage({
  profile,
  exerciseId,
  mistakes,
  hintsUsed,
  elapsedTime,
  status,
}: {
  profile: LearningProfile | null;
  exerciseId: string;
  mistakes: number;
  hintsUsed: number;
  elapsedTime: number;
  status: "idle" | "incorrect" | "correct" | "completed";
}): { title: string; message: string } {
  const theme = profile?.primaryWeakness ?? "calculation";
  const questions = EXERCISE_QUESTIONS[theme];
  const question = questions[stableIndex(exerciseId, questions.length)];
  const name = profile?.playerName ? `${profile.playerName}, ` : "";

  if (status === "correct" || status === "completed") {
    return {
      title: mistakes === 0 ? "Ton raisonnement tient la route" : "Tu as ajusté ton plan",
      message:
        mistakes === 0 && hintsUsed === 0
          ? `${name}tu as trouvé sans filet. Retrouve maintenant le détail qui t’a permis d’écarter les autres coups : c’est lui qui fera progresser ton instinct.`
          : `${name}la solution est trouvée. Le vrai progrès est d’identifier pourquoi ton premier réflexe t’a écarté du plan, puis de rejouer la position sans aide.`,
    };
  }

  if (status === "incorrect") {
    return {
      title: "On reprend l’enquête, sans révéler le coup",
      message: `${name}ton essai donne une information utile : tu as peut-être validé ton idée avant d’examiner la réponse adverse. ${question}`,
    };
  }

  if (mistakes === 0 && elapsedTime > 75) {
    return {
      title: "Tu calcules sérieusement",
      message: `${name}ta patience est une force, mais ne cherche pas à tout calculer. ${question}`,
    };
  }

  return {
    title:
      profile?.primaryWeaknessLabel && profile.sessionsCount > 0
        ? `Un exercice ciblé sur ${profile.primaryWeaknessLabel}`
        : "Je t’aide à structurer ta recherche",
    message: `${name}${question} Je ne te donne pas la case d’arrivée : je veux voir quel indice de la position tu utilises en premier.`,
  };
}

function stableIndex(value: string, length: number): number {
  const total = Array.from(value).reduce(
    (sum, character) => sum + character.charCodeAt(0),
    0,
  );
  return total % length;
}
