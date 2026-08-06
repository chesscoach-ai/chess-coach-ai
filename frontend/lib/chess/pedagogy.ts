import type {
  MoveAnalysis,
  MoveReviewResponse,
} from "@/services/api/ApiService";
import type { AiPersonaId } from "@/lib/ai/opponents";
import type { LearningProfile } from "@/lib/learning/types";

export function explainPlayedMove(
  review: MoveReviewResponse,
  personaId: AiPersonaId = "balanced",
  profile: LearningProfile | null = null,
): string {
  const playedPiece = describePieceMove(
    review.played_move_piece,
    review.played_move,
    review.played_move_san,
  );
  const bestPiece = describePieceMove(
    review.best_move_piece,
    review.best_move,
    review.best_move_san,
  );
  const effects: string[] = [];

  if (review.played_move_is_capture) {
    effects.push("capture une pièce adverse");
  }
  if (review.played_move_gives_check) {
    effects.push("attaque directement le roi");
  }
  if (review.played_move_is_castling) {
    effects.push("met le roi à l’abri grâce au roque");
  }
  if (review.played_move_is_promotion) {
    effects.push("transforme un pion arrivé au bout de l’échiquier");
  }

  const effectText =
    effects.length > 0
      ? ` Ce coup ${effects.join(" et ")}.`
      : "";

  const verdict =
    review.classification === "excellent"
      ? `${playedPiece}, très joli ! Tu as trouvé une réponse très précise.${effectText} C’était aussi le meilleur choix : ${bestPiece}.`
      : review.classification === "good"
        ? `${playedPiece} est une bonne décision : ton idée tient la route.${effectText} Le meilleur choix était ${bestPiece}.`
        : review.classification === "inaccuracy"
          ? `${playedPiece} reste jouable, mais ${bestPiece} rendait ton plan un peu plus simple.${effectText}`
          : review.classification === "mistake"
            ? `Je vois ce que tu cherchais : ${playedPiece}. Le souci, c’est que ${bestPiece} protégeait mieux ta position.${effectText}`
            : `Oups, ${playedPiece} laisse une vraie occasion à l’adversaire. Si elle est repérée, ton roi risque de finir maté sauvagement. Rien de grave : le meilleur choix était ${bestPiece}. Demande-toi quelle menace il empêchait.${effectText}`;

  const personalFollowUp = buildReviewFollowUp(review, profile);

  switch (personaId) {
    case "tal":
      return `${verdict} Cherche maintenant les échecs, les prises et les menaces : c’est là que la position devient vivante. ${personalFollowUp}`;
    case "capablanca":
      return `${verdict} Garde une idée claire : améliore ta pièce la moins active avant de compliquer la position. ${personalFollowUp}`;
    case "petrosian":
      return `${verdict} Avant le prochain coup, repère surtout la meilleure idée adverse et coupe-la à la racine. ${personalFollowUp}`;
    case "fischer":
      return `${verdict} Joue avec énergie, mais vérifie toujours la réponse la plus directe de l’adversaire. ${personalFollowUp}`;
    case "carlsen":
      return `${verdict} Pas besoin de forcer : garde tes pièces actives et fais durer la pression. ${personalFollowUp}`;
    default:
      return `${verdict} ${personalFollowUp}`;
  }
}

function buildReviewFollowUp(
  review: MoveReviewResponse,
  profile: LearningProfile | null,
): string {
  const playerContext =
    profile?.primaryWeaknessLabel && profile.sessionsCount > 0
      ? `Comme nous travaillons ${profile.primaryWeaknessLabel}, `
      : "Pour ancrer ce réflexe, ";

  if (review.played_move_gives_check) {
    return `${playerContext}liste les réponses légales du roi et vérifie laquelle te laisse poursuivre l’attaque.`;
  }
  if (review.played_move_is_capture) {
    return `${playerContext}refais le bilan matériel après toutes les recaptures possibles, pas seulement après la première prise.`;
  }
  if (review.played_move_is_castling) {
    return `${playerContext}observe maintenant quelle tour vient d’entrer dans le jeu et sur quelle colonne elle sera utile.`;
  }
  if (review.classification === "mistake" || review.classification === "blunder") {
    return `${playerContext}compare ton intention avec la réponse adverse la plus contraignante : c’est précisément là que le plan s’est fissuré.`;
  }
  if (review.is_best_move) {
    return `${playerContext}nomme la pièce dont l’activité s’améliore grâce à ce coup ; tu reconnaîtras plus vite ce motif dans une future partie.`;
  }
  return `${playerContext}compare l’activité du ${review.played_move_piece} avec celle du ${review.best_move_piece} après le meilleur coup proposé.`;
}

function describePieceMove(
  piece: string,
  uci: string,
  san: string,
): string {
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const article = /^[aeiouyh]/i.test(piece)
    ? "l’"
    : piece === "tour" || piece === "dame"
      ? "la "
      : "le ";
  return `${article}${piece} va de ${from} vers ${to} (${san})`;
}

export function formatEngineEvaluation(
  result: Pick<MoveAnalysis, "evaluation" | "evaluation_type">,
): string {
  if (result.evaluation_type === "mate") {
    const sign = result.evaluation > 0 ? "+" : "";
    return `M${sign}${result.evaluation}`;
  }

  const sign = result.evaluation > 0 ? "+" : "";
  return `${sign}${result.evaluation.toFixed(2)}`;
}
