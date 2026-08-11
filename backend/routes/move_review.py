"""Route historique /move-review adaptée depuis le service dédié."""

from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from stockfish_runtime.errors import StockfishRuntimeError
from stockfish_runtime.config import default_runtime_config
from stockfish_runtime.move_review import (
    MoveReviewQuery,
    default_move_review_service,
)

from .analysis import EvaluationType
from .errors import raise_move_review_http_error


router = APIRouter()
MoveClassification = Literal[
    "excellent",
    "good",
    "inaccuracy",
    "mistake",
    "blunder",
]


class MoveReviewRequest(BaseModel):
    fen_before: str
    played_move: str
    depth: int = Field(
        default=default_runtime_config.default_depth,
        ge=1,
        le=25,
    )


class MoveReviewResponse(BaseModel):
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
    best_variation: list[str]
    best_variation_uci: list[str]
    played_move_gives_check: bool
    played_move_is_capture: bool
    played_move_is_castling: bool
    played_move_is_promotion: bool


@router.post("/move-review", response_model=MoveReviewResponse)
def review_move(payload: MoveReviewRequest) -> MoveReviewResponse:
    try:
        result = default_move_review_service.review(
            MoveReviewQuery(
                fen_before=payload.fen_before,
                played_move=payload.played_move,
                depth=payload.depth,
            )
        )
    except StockfishRuntimeError as error:
        raise_move_review_http_error(error)
    return MoveReviewResponse.model_validate(asdict(result))
