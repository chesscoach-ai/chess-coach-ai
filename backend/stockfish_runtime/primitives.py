"""Conversions échiquéennes partagées entre analyse et move-review."""

from typing import Literal

import chess
import chess.engine

from .errors import AnalysisFailedError


EvaluationType = Literal["centipawn", "mate"]

PIECE_NAMES = {
    chess.PAWN: "pion",
    chess.KNIGHT: "cavalier",
    chess.BISHOP: "fou",
    chess.ROOK: "tour",
    chess.QUEEN: "dame",
    chess.KING: "roi",
}


def convert_variation(
    board: chess.Board,
    variation: list[chess.Move],
) -> tuple[list[str], list[str]]:
    replay = board.copy()
    san: list[str] = []
    uci: list[str] = []
    for move in variation:
        if move not in replay.legal_moves:
            break
        san.append(replay.san(move))
        uci.append(move.uci())
        replay.push(move)
    return san, uci


def extract_evaluation(
    score: chess.engine.PovScore,
    perspective: chess.Color,
) -> tuple[float, EvaluationType]:
    pov_score = score.pov(perspective)
    mate_score = pov_score.mate()
    if mate_score is not None:
        return float(mate_score), "mate"
    centipawn_score = pov_score.score()
    if centipawn_score is None:
        raise AnalysisFailedError("evaluation_unavailable")
    return round(centipawn_score / 100, 2), "centipawn"


def extract_normalized_evaluation(
    score: chess.engine.PovScore,
    perspective: chess.Color,
) -> float:
    centipawn_score = score.pov(perspective).score(mate_score=100_000)
    if centipawn_score is None:
        raise AnalysisFailedError("evaluation_not_comparable")
    return centipawn_score / 100


def get_captured_piece(board: chess.Board, move: chess.Move) -> str | None:
    if not board.is_capture(move):
        return None
    if board.is_en_passant(move):
        return "pion"
    captured = board.piece_at(move.to_square)
    if captured is None:
        return None
    return PIECE_NAMES.get(captured.piece_type, "pièce")


def move_gives_check(board: chess.Board, move: chess.Move) -> bool:
    after = board.copy()
    after.push(move)
    return after.is_check()


def move_gives_checkmate(board: chess.Board, move: chess.Move) -> bool:
    after = board.copy()
    after.push(move)
    return after.is_checkmate()


def detect_strategic_ideas(
    board: chess.Board,
    move: chess.Move,
    *,
    is_capture: bool,
    gives_check: bool,
    is_castling: bool,
    is_promotion: bool,
) -> list[str]:
    ideas: list[str] = []
    if is_castling:
        ideas.append("Met le roi à l’abri et connecte les tours.")
    if gives_check:
        ideas.append("Force l’adversaire à répondre à l’échec.")
    if is_capture:
        ideas.append("Modifie immédiatement l’équilibre matériel.")
    if is_promotion:
        ideas.append("Transforme un pion en une pièce plus puissante.")
    if move.to_square in {chess.D4, chess.E4, chess.D5, chess.E5}:
        ideas.append("Renforce le contrôle du centre.")
    if _develops_minor_piece(board, move):
        ideas.append("Développe une pièce mineure vers une case active.")
    if _moves_queen_early(board, move):
        ideas.append("Active la dame tôt, mais elle peut devenir une cible.")
    if not ideas:
        ideas.append("Améliore la coordination ou le placement des pièces.")
    return ideas


def calculate_evaluation_gap(
    best_evaluation: float,
    best_type: EvaluationType,
    evaluation: float,
    evaluation_type: EvaluationType,
) -> float | None:
    if best_type != "centipawn" or evaluation_type != "centipawn":
        return None
    return round(max(0.0, best_evaluation - evaluation), 2)


def evaluate_terminal_position(
    board: chess.Board,
    perspective: chess.Color,
) -> tuple[float, EvaluationType, float]:
    if board.is_checkmate():
        winner = not board.turn
        if winner == perspective:
            return 1.0, "mate", 1000.0
        return -1.0, "mate", -1000.0
    return 0.0, "centipawn", 0.0


def _develops_minor_piece(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    return bool(
        piece
        and piece.piece_type in {chess.KNIGHT, chess.BISHOP}
        and move.from_square
        in {
            chess.B1,
            chess.G1,
            chess.C1,
            chess.F1,
            chess.B8,
            chess.G8,
            chess.C8,
            chess.F8,
        }
    )


def _moves_queen_early(board: chess.Board, move: chess.Move) -> bool:
    piece = board.piece_at(move.from_square)
    return bool(
        piece
        and piece.piece_type == chess.QUEEN
        and board.fullmove_number <= 10
    )
