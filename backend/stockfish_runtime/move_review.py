"""Comparaison d'un coup joué avec le meilleur choix Stockfish."""

from dataclasses import dataclass
from typing import Literal

import chess
import chess.engine

from .config import default_runtime_config
from .engine_manager import EngineManager
from .engine_pool import default_engine_pool
from .executor import AnalysisBudget, RuntimeExecutor
from .errors import (
    FinishedPositionError,
    InvalidMoveError,
    InvalidPositionError,
    NoUsableVariationError,
)
from .primitives import (
    PIECE_NAMES,
    EvaluationType,
    convert_variation,
    evaluate_terminal_position,
    extract_evaluation,
    extract_normalized_evaluation,
    move_gives_check,
)


MoveClassification = Literal[
    "excellent",
    "good",
    "inaccuracy",
    "mistake",
    "blunder",
]


@dataclass(frozen=True, slots=True)
class MoveReviewQuery:
    fen_before: str
    played_move: str
    depth: int = default_runtime_config.default_depth


@dataclass(frozen=True, slots=True)
class MoveReviewResult:
    played_move: str
    played_move_san: str
    played_move_piece: str
    best_move: str
    best_move_san: str
    best_move_piece: str
    is_best_move: bool
    evaluation_before: float
    evaluation_before_type: EvaluationType
    evaluation_after: float
    evaluation_after_type: EvaluationType
    evaluation_loss: float
    classification: MoveClassification
    classification_label: str
    explanation: str
    best_variation: tuple[str, ...]
    best_variation_uci: tuple[str, ...]
    played_move_gives_check: bool
    played_move_is_capture: bool
    played_move_is_castling: bool
    played_move_is_promotion: bool


class MoveReviewService:
    def __init__(
        self,
        manager: EngineManager,
        executor: RuntimeExecutor | None = None,
    ) -> None:
        self.manager = manager
        self.executor = executor or RuntimeExecutor(manager)

    def review(self, query: MoveReviewQuery) -> MoveReviewResult:
        self.manager.metrics.increment("total_analyses")
        self.manager.ensure_available()
        try:
            board_before = chess.Board(query.fen_before)
        except ValueError as error:
            raise InvalidPositionError("review_fen") from error
        if board_before.is_game_over():
            raise FinishedPositionError("review_position")

        try:
            played_move = chess.Move.from_uci(query.played_move)
        except ValueError as error:
            raise InvalidMoveError("invalid_uci") from error
        if played_move not in board_before.legal_moves:
            raise InvalidMoveError("illegal_move")

        mover_color = board_before.turn
        played_move_san = board_before.san(played_move)
        played_piece = board_before.piece_at(played_move.from_square)
        played_move_piece = PIECE_NAMES.get(
            played_piece.piece_type if played_piece else chess.PAWN,
            "pièce",
        )
        is_capture = board_before.is_capture(played_move)
        is_castling = board_before.is_castling(played_move)
        is_promotion = played_move.promotion is not None
        gives_check = move_gives_check(board_before, played_move)
        board_after = board_before.copy()
        board_after.push(played_move)

        def calculate(
            engine: chess.engine.SimpleEngine,
            budget: AnalysisBudget,
        ) -> MoveReviewResult:
                best_info = budget.run(lambda remaining: engine.analyse(
                    board_before,
                    chess.engine.Limit(depth=query.depth, time=remaining),
                ))
                best_variation = best_info.get("pv")
                best_score = best_info.get("score")
                if not best_variation or best_score is None:
                    raise NoUsableVariationError("review_no_best_move")

                best_move = best_variation[0]
                if best_move not in board_before.legal_moves:
                    raise NoUsableVariationError("review_invalid_best_move")
                best_move_san = board_before.san(best_move)
                best_piece = board_before.piece_at(best_move.from_square)
                best_move_piece = PIECE_NAMES.get(
                    best_piece.piece_type if best_piece else chess.PAWN,
                    "pièce",
                )
                best_variation_san, best_variation_uci = convert_variation(
                    board_before,
                    best_variation,
                )
                evaluation_before, evaluation_before_type = extract_evaluation(
                    best_score,
                    mover_color,
                )
                normalized_before = extract_normalized_evaluation(
                    best_score,
                    mover_color,
                )

                if board_after.is_game_over():
                    (
                        evaluation_after,
                        evaluation_after_type,
                        normalized_after,
                    ) = evaluate_terminal_position(board_after, mover_color)
                else:
                    after_info = budget.run(lambda remaining: engine.analyse(
                        board_after,
                        chess.engine.Limit(depth=query.depth, time=remaining),
                    ))
                    after_score = after_info.get("score")
                    if after_score is None:
                        raise NoUsableVariationError("review_after_unavailable")
                    evaluation_after, evaluation_after_type = extract_evaluation(
                        after_score,
                        mover_color,
                    )
                    normalized_after = extract_normalized_evaluation(
                        after_score,
                        mover_color,
                    )

                evaluation_loss = round(
                    max(0.0, normalized_before - normalized_after),
                    2,
                )
                is_best_move = played_move == best_move
                classification, label = classify_move(
                    evaluation_loss,
                    is_best_move,
                )
                return MoveReviewResult(
                    played_move=played_move.uci(),
                    played_move_san=played_move_san,
                    played_move_piece=played_move_piece,
                    best_move=best_move.uci(),
                    best_move_san=best_move_san,
                    best_move_piece=best_move_piece,
                    is_best_move=is_best_move,
                    evaluation_before=evaluation_before,
                    evaluation_before_type=evaluation_before_type,
                    evaluation_after=evaluation_after,
                    evaluation_after_type=evaluation_after_type,
                    evaluation_loss=evaluation_loss,
                    classification=classification,
                    classification_label=label,
                    explanation=build_move_review_explanation(
                        played_move_san=played_move_san,
                        best_move_san=best_move_san,
                        classification=classification,
                        evaluation_loss=evaluation_loss,
                        is_best_move=is_best_move,
                        is_capture=is_capture,
                        gives_check=gives_check,
                        is_castling=is_castling,
                        is_promotion=is_promotion,
                    ),
                    best_variation=tuple(best_variation_san),
                    best_variation_uci=tuple(best_variation_uci),
                    played_move_gives_check=gives_check,
                    played_move_is_capture=is_capture,
                    played_move_is_castling=is_castling,
                    played_move_is_promotion=is_promotion,
                )

        return self.executor.execute(calculate).value


def classify_move(
    evaluation_loss: float,
    is_best_move: bool,
) -> tuple[MoveClassification, str]:
    if is_best_move or evaluation_loss <= 0.10:
        return "excellent", "Excellent"
    if evaluation_loss <= 0.35:
        return "good", "Bon coup"
    if evaluation_loss <= 0.90:
        return "inaccuracy", "Imprécision"
    if evaluation_loss <= 2.00:
        return "mistake", "Erreur"
    return "blunder", "Gaffe"


def build_move_review_explanation(
    *,
    played_move_san: str,
    best_move_san: str,
    classification: MoveClassification,
    evaluation_loss: float,
    is_best_move: bool,
    is_capture: bool,
    gives_check: bool,
    is_castling: bool,
    is_promotion: bool,
) -> str:
    if is_best_move:
        sentences = [f"{played_move_san} est le premier choix de Stockfish."]
    else:
        sentences = [
            f"Après {played_move_san}, Stockfish préfère {best_move_san}."
        ]
    sentences.append(_move_review_comment(classification))
    if not is_best_move:
        unit = "pion" if evaluation_loss <= 1 else "pions"
        sentences.append(
            f"La perte d’évaluation est estimée à "
            f"{evaluation_loss:.2f} {unit}."
        )

    tactical_details: list[str] = []
    if is_capture:
        tactical_details.append("réalise une capture")
    if gives_check:
        tactical_details.append("donne échec")
    if is_castling:
        tactical_details.append("met le roi à l’abri par le roque")
    if is_promotion:
        tactical_details.append("permet une promotion")
    if tactical_details:
        sentences.append("Ce coup " + ", ".join(tactical_details) + ".")
    return " ".join(sentences)


def _move_review_comment(classification: MoveClassification) -> str:
    comments = {
        "excellent": (
            "Ce coup conserve pleinement la qualité de la position et "
            "correspond au meilleur choix de Stockfish, ou à une option "
            "pratiquement équivalente."
        ),
        "good": (
            "Ce coup est solide et conserve l’essentiel de l’avantage, même "
            "si Stockfish préfère légèrement une autre option."
        ),
        "inaccuracy": (
            "Ce coup reste jouable, mais il abandonne une partie de l’avantage "
            "ou permet à l’adversaire d’améliorer sa position."
        ),
        "mistake": (
            "Ce coup détériore sensiblement la position. Une option plus "
            "précise permettait de conserver davantage de contrôle."
        ),
        "blunder": (
            "Ce coup modifie fortement l’évaluation de la position. Il peut "
            "perdre du matériel, manquer une menace importante ou permettre "
            "une attaque décisive."
        ),
    }
    return comments[classification]


default_move_review_service = MoveReviewService(default_engine_pool)
