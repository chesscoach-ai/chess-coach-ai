"""Politique indépendante qui évite un appel IA après chaque coup."""

from .models import NoxContext, PolicyDecision


class NoxAiPolicy:
    def decide(self, context: NoxContext) -> PolicyDecision:
        if context.best_move is None and context.played_move is None:
            return "deterministic_only"
        if context.interaction.question == "show":
            return "deterministic_only"
        if context.interaction.depth == "conversation":
            return "ai_required_if_available"
        if context.interaction.question in {"why", "plan", "missed"}:
            return "ai_preferred"
        if context.classification and context.classification.code in {
            "excellent",
            "mistake",
            "blunder",
        }:
            return "ai_preferred"
        return "deterministic_only"


default_nox_policy = NoxAiPolicy()
