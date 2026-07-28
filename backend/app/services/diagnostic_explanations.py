from app.models.diagnostics import (
    DiagnosticSignals,
    DiagnosticTheme,
)


def choose_primary_theme(
    signals: DiagnosticSignals,
) -> DiagnosticTheme:
    if signals.misses_mate or signals.is_mate_threat:
        return "king-safety"

    if (
        signals.hanging_piece
        or signals.material_loss_cp >= 100
    ):
        return "material"

    if signals.missed_tactical_shot:
        return "tactic"

    if (
        signals.delays_development
        or signals.moved_same_piece_again
        or signals.leaves_king_in_center
    ):
        return "development"

    if signals.endgame_technique_error:
        return "endgame"

    if signals.worsens_pawn_structure:
        return "pawn-structure"

    if signals.loses_initiative:
        return "initiative"

    return "calculation"


def build_short_explanation(
    theme: DiagnosticTheme,
    played_move_san: str | None,
    best_move_san: str | None,
) -> str:
    played = played_move_san or "le coup joué"
    best = best_move_san or "le meilleur coup"

    templates: dict[
        DiagnosticTheme, str
    ] = {
        "material": (
            f"{played} permet une perte de matériel évitable. "
            f"{best} protège mieux les pièces ou crée une menace plus forte."
        ),
        "king-safety": (
            f"{played} ne répond pas suffisamment aux menaces contre le roi. "
            f"{best} traite en priorité la sécurité du roi ou une séquence forcée."
        ),
        "tactic": (
            f"{played} laisse passer une ressource tactique. "
            f"{best} exploite immédiatement la position avec un coup forcing."
        ),
        "development": (
            f"{played} ralentit le développement ou la mise en sécurité du roi. "
            f"{best} améliore plus efficacement la coordination des pièces."
        ),
        "endgame": (
            f"{played} manque de précision dans une finale où chaque tempo compte. "
            f"{best} active davantage le roi ou améliore la course des pions."
        ),
        "pawn-structure": (
            f"{played} crée une faiblesse durable dans la structure de pions. "
            f"{best} conserve une structure plus saine."
        ),
        "initiative": (
            f"{played} abandonne une partie de l’initiative. "
            f"{best} maintient la pression et limite les réponses adverses."
        ),
        "calculation": (
            f"{played} laisse échapper une continuation plus précise. "
            f"{best} résiste mieux à la meilleure réponse adverse."
        ),
        "piece-activity": (
            f"{played} n’améliore pas assez l’activité des pièces. "
            f"{best} active une pièce plus utilement."
        ),
        "opening": (
            f"{played} s’écarte des priorités de l’ouverture. "
            f"{best} développe ou contrôle mieux le centre."
        ),
        "other": (
            f"{played} est moins précis que {best} dans cette position."
        ),
    }

    return templates[theme]
