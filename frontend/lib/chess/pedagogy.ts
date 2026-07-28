import type {
  MoveAnalysis,
  MoveReviewResponse,
} from "@/services/api/ApiService";
import type { AiPersonaId } from "@/lib/ai/opponents";

export function explainPlayedMove(
  review: MoveReviewResponse,
  personaId: AiPersonaId = "balanced",
): string {
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
      ? `${review.played_move_san}, très joli ! Tu as trouvé une réponse très précise.${effectText}`
      : review.classification === "good"
        ? `${review.played_move_san} est une bonne décision : ton idée tient la route.${effectText}`
        : review.classification === "inaccuracy"
          ? `${review.played_move_san} reste jouable, mais ${review.best_move_san} rendait ton plan un peu plus simple.${effectText}`
          : review.classification === "mistake"
            ? `Je vois ce que tu cherchais avec ${review.played_move_san}. Le souci, c’est que ${review.best_move_san} protégeait mieux ta position.${effectText}`
            : `Oups, ${review.played_move_san} laisse une vraie occasion à l’adversaire. Rien de grave : regarde ${review.best_move_san} et demande-toi quelle menace il empêchait.${effectText}`;

  switch (personaId) {
    case "tal":
      return `${verdict} Cherche maintenant les échecs, les prises et les menaces : c’est là que la position devient vivante.`;
    case "capablanca":
      return `${verdict} Garde une idée claire : améliore ta pièce la moins active avant de compliquer la position.`;
    case "petrosian":
      return `${verdict} Avant le prochain coup, repère surtout la meilleure idée adverse et coupe-la à la racine.`;
    case "fischer":
      return `${verdict} Joue avec énergie, mais vérifie toujours la réponse la plus directe de l’adversaire.`;
    case "carlsen":
      return `${verdict} Pas besoin de forcer : garde tes pièces actives et fais durer la pression.`;
    default:
      return `${verdict} Pour le prochain coup, prends une seconde pour vérifier les menaces des deux camps.`;
  }
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
