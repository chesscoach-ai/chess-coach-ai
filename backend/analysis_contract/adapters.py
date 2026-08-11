"""Adaptateurs compatibles avec les réponses publiques antérieures à 0.2."""

from typing import Any

from .facts import ChessFacts, MoveFacts


def to_legacy_analysis_payload(facts: ChessFacts) -> dict[str, Any]:
    moves = [_to_legacy_move(move) for move in facts.proposals]
    best = moves[0]

    return {
        "best_move": best["move"],
        "best_move_san": best["move_san"],
        "best_move_details": best,
        "principal_variation": best["principal_variation"],
        "principal_variation_uci": best["principal_variation_uci"],
        "evaluation": best["evaluation"],
        "evaluation_type": best["evaluation_type"],
        "depth": best["depth"],
        "top_moves": moves,
    }


def to_legacy_exercise_payload(facts: ChessFacts) -> dict[str, Any]:
    moves: list[dict[str, Any]] = []

    for move in facts.proposals:
        is_mate = move.evaluation.type == "mate"
        moves.append(
            {
                "uci": move.uci,
                "san": move.san,
                "evaluation": None if is_mate else move.evaluation.value,
                "mate_in": int(move.evaluation.value) if is_mate else None,
                "principal_variation": list(move.principal_variation.san),
                "principal_variation_uci": list(move.principal_variation.uci),
            }
        )

    return {
        "fen": facts.position.fen,
        "best_move": facts.proposals[0].uci,
        "best_move_san": facts.proposals[0].san,
        "moves": moves,
    }


def _to_legacy_move(move: MoveFacts) -> dict[str, Any]:
    strategic_ideas = [
        heuristic.description
        for heuristic in move.heuristics.strategic_ideas
    ]
    beginner_label, beginner_description = _build_beginner_move_text(
        move,
        strategic_ideas,
    )

    return {
        "rank": move.rank,
        "move": move.uci,
        "move_san": move.san,
        "from_square": move.from_square,
        "to_square": move.to_square,
        "moved_piece": move.piece_type,
        "moved_piece_color": move.piece_color,
        "captured_piece": move.captured_piece,
        "is_capture": move.is_capture,
        "gives_check": move.gives_check,
        "gives_checkmate": move.gives_checkmate,
        "is_castling": move.is_castling,
        "is_promotion": move.is_promotion,
        "promotion_piece": move.promotion_piece,
        "beginner_label": beginner_label,
        "beginner_description": beginner_description,
        "evaluation": move.evaluation.value,
        "evaluation_type": move.evaluation.type,
        "evaluation_gap": move.evaluation_gap,
        "depth": move.depth,
        "principal_variation": list(move.principal_variation.san),
        "principal_variation_uci": list(move.principal_variation.uci),
        "strategic_ideas": strategic_ideas,
        "explanation": _build_move_explanation(move, strategic_ideas),
    }


def _build_beginner_move_text(
    move: MoveFacts,
    strategic_ideas: list[str],
) -> tuple[str, str]:
    color_label = "blanc" if move.piece_color == "white" else "noir"

    if move.is_castling:
        label = "Mettre le roi à l’abri grâce au roque."
        description = (
            f"Le roi {color_label} et une tour se déplacent en même temps. "
            "Le roi devient généralement plus difficile à attaquer."
        )
    elif move.captured_piece:
        label = (
            f"Déplacer le {move.piece_type} de {move.from_square} "
            f"vers {move.to_square} et capturer le "
            f"{move.captured_piece} adverse."
        )
        description = (
            f"Le {move.piece_type} {color_label} quitte "
            f"{move.from_square}, arrive en {move.to_square} et retire "
            f"le {move.captured_piece} adverse de l’échiquier."
        )
    else:
        label = (
            f"Déplacer le {move.piece_type} de {move.from_square} "
            f"vers {move.to_square}."
        )
        description = (
            f"Le {move.piece_type} {color_label} quitte "
            f"{move.from_square} et arrive en {move.to_square}."
        )

    if move.gives_checkmate:
        description += (
            " Ce coup met le roi adverse en échec et mat : "
            "la partie est terminée."
        )
    elif move.gives_check:
        description += (
            " Ce coup met le roi adverse en échec : "
            "l’adversaire doit répondre immédiatement."
        )

    if move.promotion_piece:
        description += f" Le pion est promu en {move.promotion_piece}."

    if strategic_ideas:
        description += f" Pourquoi ce coup est utile : {strategic_ideas[0]}"

    return label, description


def _evaluation_gap_comment(move: MoveFacts) -> str:
    if move.rank == 1:
        return (
            "Stockfish considère ce coup comme la "
            "meilleure option dans cette position."
        )
    if move.evaluation_gap is None:
        return (
            "Cette option est différente du meilleur coup, "
            "mais la présence d’une séquence de mat empêche "
            "une comparaison numérique simple."
        )
    if move.evaluation_gap <= 0.10:
        return "Ce coup est presque aussi fort que le premier choix."
    if move.evaluation_gap <= 0.30:
        return "Ce coup reste une très bonne alternative."
    if move.evaluation_gap <= 0.75:
        return "Ce coup est jouable, mais il est sensiblement moins précis."
    if move.evaluation_gap <= 1.50:
        return (
            "Ce coup concède un avantage notable "
            "par rapport au meilleur choix."
        )
    return "Ce coup est nettement inférieur au meilleur choix selon Stockfish."


def _build_move_explanation(
    move: MoveFacts,
    strategic_ideas: list[str],
) -> str:
    sentences: list[str] = []

    if move.is_castling:
        sentences.append(
            f"{move.san} est un roque qui sécurise le roi "
            "et améliore la coordination des tours."
        )
    else:
        sentences.append(
            f"{move.san} déplace le {move.piece_type} "
            f"de {move.from_square} vers {move.to_square}."
        )
    if move.is_capture and move.captured_piece:
        sentences.append(f"Le coup capture un {move.captured_piece} adverse.")
    if move.gives_check:
        sentences.append(
            "Il donne également échec au roi adverse, "
            "ce qui rend la réponse forcée ou très contrainte."
        )
    if move.is_promotion:
        sentences.append(
            "Le pion atteint la dernière rangée et obtient une promotion."
        )

    sentences.append(_evaluation_gap_comment(move))
    if strategic_ideas:
        sentences.append(f"Idée principale : {strategic_ideas[0]}")
    return " ".join(sentences)
