"""Transformation directe des résultats python-chess en ChessFacts."""

from typing import Any

import chess

from analysis_contract.builders import build_move_heuristics
from analysis_contract.facts import (
    EvaluationFacts,
    MoveFacts,
    PrincipalVariationFacts,
)

from .primitives import (
    PIECE_NAMES,
    EvaluationType,
    calculate_evaluation_gap,
    convert_variation,
    detect_strategic_ideas,
    extract_evaluation,
    get_captured_piece,
    move_gives_check,
    move_gives_checkmate,
)


def build_candidate_facts(
    *,
    board: chess.Board,
    info: dict[str, Any],
    rank: int,
    requested_depth: int,
    best_evaluation: float,
    best_evaluation_type: EvaluationType,
) -> MoveFacts | None:
    variation = info.get("pv")
    score = info.get("score")
    if not variation or score is None:
        return None

    first_move = variation[0]
    if first_move not in board.legal_moves:
        return None
    piece = board.piece_at(first_move.from_square)
    if piece is None:
        return None

    evaluation, evaluation_type = extract_evaluation(score, board.turn)
    variation_san, variation_uci = convert_variation(board, variation)
    is_capture = board.is_capture(first_move)
    gives_check = move_gives_check(board, first_move)
    is_castling = board.is_castling(first_move)
    is_promotion = first_move.promotion is not None
    strategic_ideas = detect_strategic_ideas(
        board,
        first_move,
        is_capture=is_capture,
        gives_check=gives_check,
        is_castling=is_castling,
        is_promotion=is_promotion,
    )
    perspective = "white" if board.turn == chess.WHITE else "black"

    return MoveFacts(
        rank=rank,
        uci=first_move.uci(),
        san=board.san(first_move),
        piece_type=PIECE_NAMES.get(piece.piece_type, "pièce"),
        piece_color="white" if piece.color == chess.WHITE else "black",
        from_square=chess.square_name(first_move.from_square),
        to_square=chess.square_name(first_move.to_square),
        is_capture=is_capture,
        captured_piece=get_captured_piece(board, first_move),
        gives_check=gives_check,
        gives_checkmate=move_gives_checkmate(board, first_move),
        is_castling=is_castling,
        is_promotion=is_promotion,
        promotion_piece=(
            PIECE_NAMES.get(first_move.promotion)
            if first_move.promotion is not None
            else None
        ),
        evaluation=EvaluationFacts(
            value=evaluation,
            type=evaluation_type,
            perspective=perspective,
        ),
        evaluation_gap=calculate_evaluation_gap(
            best_evaluation,
            best_evaluation_type,
            evaluation,
            evaluation_type,
        ),
        depth=info.get("depth", requested_depth),
        principal_variation=PrincipalVariationFacts(
            san=tuple(variation_san),
            uci=tuple(variation_uci),
        ),
        heuristics=build_move_heuristics(strategic_ideas),
    )
