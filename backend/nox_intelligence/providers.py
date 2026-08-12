"""Providers interchangeables de Nox, sans dépendance UI."""

from dataclasses import dataclass, field
import json
from typing import Protocol

from openai import OpenAI

from .config import NoxAiConfig
from .models import (
    NoxArrow,
    NoxConcept,
    NoxContext,
    NoxResponse,
    NoxUsage,
    NoxVisual,
)


@dataclass(frozen=True, slots=True)
class GeneratedNoxResponse:
    response: NoxResponse
    usage: NoxUsage = field(default_factory=NoxUsage)


class NoxIntelligenceProvider(Protocol):
    def generate(self, context: NoxContext) -> GeneratedNoxResponse:
        ...


class DeterministicNoxProvider:
    def generate(self, context: NoxContext) -> GeneratedNoxResponse:
        move = context.played_move or context.best_move
        if move is None:
            return GeneratedNoxResponse(
                NoxResponse(
                    state="idle",
                    title="Je reste à tes côtés",
                    message=(
                        "Je n’ai pas assez d’informations fiables pour "
                        "t’expliquer ce point précisément."
                    ),
                )
            )

        classification = context.classification.code if context.classification else None
        state = (
            "success"
            if classification in {"excellent", "good"}
            else "warning"
            if classification in {"inaccuracy", "mistake", "blunder"}
            else "tip"
        )
        if context.interaction.question == "plan":
            title = "Ton prochain repère"
            message = _heuristic_message(context) or (
                "Améliore ta pièce la moins active, protège ton roi et vérifie "
                "la réponse adverse avant d’avancer."
            )
        elif context.interaction.question == "missed":
            title = "Le détail à revoir"
            message = (
                "Ce coup ouvre une occasion à ton adversaire. Compare-le avec "
                f"{context.best_move.san}."
                if context.best_move and context.played_move
                else "Je n’ai pas de comparaison fiable à te montrer ici."
            )
        elif context.interaction.question == "show":
            title = "Regarde le trajet"
            message = f"Suis {move.piece} de {move.from_square} vers {move.to_square}."
        elif context.interaction.question == "why":
            title = f"Pourquoi {move.san} ?"
            message = _heuristic_message(context) or (
                f"Ce coup déplace {move.piece} de {move.from_square} vers "
                f"{move.to_square}. Compare ensuite sa sécurité et son activité."
            )
        elif classification == "excellent":
            title = "Très joli !"
            message = f"{move.san} améliore vraiment ta position."
        elif classification in {"mistake", "blunder"}:
            title = "Un danger était caché"
            message = (
                "Ce coup donne une vraie occasion à ton adversaire. "
                "Regardons-la ensemble."
            )
        else:
            title = f"Pourquoi {move.san} ?"
            message = _heuristic_message(context) or (
                f"Ce coup déplace {move.piece} de {move.from_square} vers "
                f"{move.to_square} et améliore sa participation."
            )
        return GeneratedNoxResponse(
            NoxResponse(
                state=state,
                title=title,
                message=message,
                referenced_move_uci=move.uci,
                visual=NoxVisual(
                    arrows=(
                        NoxArrow(
                            from_square=move.from_square,
                            to_square=move.to_square,
                        ),
                    ),
                    highlights=(move.to_square,),
                ),
            )
        )


def _heuristic_message(context: NoxContext) -> str | None:
    if not context.heuristics:
        return None
    labels = {
        "center_control": "Ce coup renforce ton contrôle du centre.",
        "minor_piece_development": (
            "Cette pièce se développe vers une case plus active."
        ),
        "king_safety": "L’idée est de mieux protéger ton roi.",
        "piece_coordination": "Tes pièces pourront mieux travailler ensemble.",
        "material_change": "Vérifie l’équilibre des pièces échangées.",
    }
    return labels.get(context.heuristics[0].id)


NOX_INSTRUCTIONS = """Tu es Nox, l'écuyer chaleureux de Knightly.
Tu expliques uniquement les faits structurés fournis. Stockfish est la source
de vérité : ne propose jamais un autre meilleur coup et ne complète jamais un
fait manquant. Si une information manque, dis-le simplement. Parle français,
en phrases courtes, sans jargon inexpliqué ni ton culpabilisant. Une réaction
fait 20 à 50 mots ; une explication reste sous 120 mots. Utilise seulement les
coups et cases présents dans le contexte. Retourne strictement NoxResponse."""


class OpenAINoxProvider:
    def __init__(
        self,
        config: NoxAiConfig,
        *,
        client: OpenAI | None = None,
        reasoning_effort: str | None = None,
    ) -> None:
        self.config = config
        self.reasoning_effort = reasoning_effort
        if client is not None:
            self.client = client
        elif config.api_key:
            self.client = OpenAI(api_key=config.api_key, max_retries=0)
        else:
            raise ValueError("OPENAI_API_KEY is not configured")

    def generate(self, context: NoxContext) -> GeneratedNoxResponse:
        request = dict(
            model=self.config.model,
            instructions=(
                f"{NOX_INSTRUCTIONS}\nVersion du prompt: "
                f"{self.config.prompt_version}."
            ),
            input=json.dumps(
                context.model_dump(mode="json"),
                ensure_ascii=False,
                separators=(",", ":"),
            ),
            text_format=NoxResponse,
            max_output_tokens=self.config.max_output_tokens,
            store=False,
            timeout=self.config.timeout_seconds,
        )
        if self.reasoning_effort is not None:
            request["reasoning"] = {"effort": self.reasoning_effort}
        api_response = self.client.responses.parse(**request)
        parsed = api_response.output_parsed
        if parsed is None:
            raise ValueError("OpenAI returned no structured NoxResponse")
        usage = getattr(api_response, "usage", None)
        return GeneratedNoxResponse(
            response=parsed,
            usage=NoxUsage(
                input_tokens=int(getattr(usage, "input_tokens", 0) or 0),
                output_tokens=int(getattr(usage, "output_tokens", 0) or 0),
            ),
        )
