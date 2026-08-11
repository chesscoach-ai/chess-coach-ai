"""Construction du contrat ChessFacts depuis les résultats actuels.

Le protocole permet à 0.2 de consommer les ``MoveAnalysis`` historiques sans
import circulaire. En 0.3, le constructeur pourra recevoir directement les
résultats Stockfish après extraction de la logique de ``main.py``.
"""

from collections.abc import Iterable, Sequence
from typing import Literal, Protocol

import chess

from .facts import (
    AnalysisMetadata,
    ChessFacts,
    DeterministicHeuristic,
    EvaluationFacts,
    MoveFacts,
    MoveHeuristics,
    PositionFacts,
    PrincipalVariationFacts,
    TerminalPositionFacts,
)


EvaluationType = Literal["centipawn", "mate"]
Color = Literal["white", "black"]


class AnalysisMoveSource(Protocol):
    rank: int
    move: str
    move_san: str
    moved_piece: str
    moved_piece_color: Color
    from_square: str
    to_square: str
    is_capture: bool
    captured_piece: str | None
    gives_check: bool
    gives_checkmate: bool
    is_castling: bool
    is_promotion: bool
    promotion_piece: str | None
    evaluation: float
    evaluation_type: EvaluationType
    evaluation_gap: float | None
    depth: int
    principal_variation: list[str]
    principal_variation_uci: list[str]
    strategic_ideas: list[str]


HEURISTIC_CODES = {
    "Met le roi à l’abri et connecte les tours.": "king_safety",
    "Force l’adversaire à répondre à l’échec.": "forcing_check",
    "Modifie immédiatement l’équilibre matériel.": "material_change",
    "Transforme un pion en une pièce plus puissante.": "promotion",
    "Renforce le contrôle du centre.": "center_control",
    "Développe une pièce mineure vers une case active.": "minor_piece_development",
    "Active la dame tôt, mais elle peut devenir une cible.": "early_queen_activity",
    "Améliore la coordination ou le placement des pièces.": "piece_coordination",
}


def build_chess_facts(
    *,
    fen: str,
    requested_depth: int,
    requested_multipv: int,
    moves: Iterable[AnalysisMoveSource],
    calculation_time_ms: float,
    cache_status: Literal["hit", "miss"] = "miss",
) -> ChessFacts:
    proposals = tuple(_build_move_facts(move) for move in moves)
    return build_chess_facts_from_proposals(
        fen=fen,
        requested_depth=requested_depth,
        requested_multipv=requested_multipv,
        proposals=proposals,
        calculation_time_ms=calculation_time_ms,
        cache_status=cache_status,
    )


def build_chess_facts_from_proposals(
    *,
    fen: str,
    requested_depth: int,
    requested_multipv: int,
    proposals: Sequence[MoveFacts],
    calculation_time_ms: float,
    cache_status: Literal["hit", "miss"] = "miss",
) -> ChessFacts:
    proposals = tuple(proposals)
    if not proposals:
        raise ValueError("ChessFacts requires at least one move proposal")

    board = chess.Board(fen)
    side_to_move: Color = "white" if board.turn == chess.WHITE else "black"
    terminal = _build_terminal_facts(board)

    return ChessFacts(
        position=PositionFacts(
            fen=fen,
            side_to_move=side_to_move,
            requested_depth=requested_depth,
            achieved_depth=max(proposal.depth for proposal in proposals),
            requested_multipv=requested_multipv,
            terminal=terminal,
        ),
        evaluation=proposals[0].evaluation,
        proposals=proposals,
        metadata=AnalysisMetadata(
            state="ready",
            cache_status=cache_status,
            calculation_time_ms=round(max(0.0, calculation_time_ms), 3),
        ),
    )


def with_cache_hit(facts: ChessFacts) -> ChessFacts:
    return facts.model_copy(
        update={
            "metadata": facts.metadata.model_copy(
                update={
                    "cache_status": "hit",
                    "calculation_time_ms": 0.0,
                }
            )
        },
        deep=True,
    )


def _build_move_facts(move: AnalysisMoveSource) -> MoveFacts:
    perspective: Color = move.moved_piece_color
    heuristics = build_move_heuristics(move.strategic_ideas)

    return MoveFacts(
        rank=move.rank,
        uci=move.move,
        san=move.move_san,
        piece_type=move.moved_piece,
        piece_color=move.moved_piece_color,
        from_square=move.from_square,
        to_square=move.to_square,
        is_capture=move.is_capture,
        captured_piece=move.captured_piece,
        gives_check=move.gives_check,
        gives_checkmate=move.gives_checkmate,
        is_castling=move.is_castling,
        is_promotion=move.is_promotion,
        promotion_piece=move.promotion_piece,
        evaluation=EvaluationFacts(
            value=move.evaluation,
            type=move.evaluation_type,
            perspective=perspective,
        ),
        evaluation_gap=move.evaluation_gap,
        depth=move.depth,
        principal_variation=PrincipalVariationFacts(
            san=tuple(move.principal_variation),
            uci=tuple(move.principal_variation_uci),
        ),
        heuristics=heuristics,
    )


def build_move_heuristics(
    strategic_ideas: Iterable[str],
) -> MoveHeuristics:
    heuristics = tuple(
        DeterministicHeuristic(
            code=HEURISTIC_CODES.get(description, "other"),
            description=description,
        )
        for description in strategic_ideas
    )
    return MoveHeuristics(strategic_ideas=heuristics)


def _build_terminal_facts(board: chess.Board) -> TerminalPositionFacts:
    if not board.is_game_over():
        return TerminalPositionFacts(is_game_over=False)

    winner: Color | None = None
    outcome = board.outcome()
    if outcome and outcome.winner is not None:
        winner = "white" if outcome.winner == chess.WHITE else "black"

    if board.is_checkmate():
        reason = "checkmate"
    elif board.is_stalemate():
        reason = "stalemate"
    elif board.is_insufficient_material():
        reason = "insufficient_material"
    elif board.is_seventyfive_moves():
        reason = "seventy_five_moves"
    elif board.is_fivefold_repetition():
        reason = "fivefold_repetition"
    else:
        reason = "other"

    return TerminalPositionFacts(
        is_game_over=True,
        reason=reason,
        winner=winner,
    )
