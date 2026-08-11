"""Route historique /analysis adaptée depuis ChessFacts."""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from analysis_contract.adapters import to_legacy_analysis_payload
from analysis_contract.facts import ChessFacts
from stockfish_runtime.config import default_runtime_config
from stockfish_runtime.errors import StockfishRuntimeError
from stockfish_runtime.service import (
    PositionAnalysisQuery,
    StockfishAnalysisService,
    default_analysis_service,
)

from .errors import raise_position_http_error


router = APIRouter()
EvaluationType = Literal["centipawn", "mate"]


class AnalysisRequest(BaseModel):
    fen: str
    depth: int = Field(
        default=default_runtime_config.default_depth,
        ge=1,
        le=25,
    )
    multipv: int = Field(default=3, ge=1, le=5)


class MoveAnalysis(BaseModel):
    rank: int
    move: str
    move_san: str
    from_square: str
    to_square: str
    moved_piece: str
    moved_piece_color: Literal["white", "black"]
    captured_piece: str | None
    is_capture: bool
    gives_check: bool
    gives_checkmate: bool
    is_castling: bool
    is_promotion: bool
    promotion_piece: str | None
    beginner_label: str
    beginner_description: str
    evaluation: float
    evaluation_type: EvaluationType
    evaluation_gap: float | None
    depth: int
    principal_variation: list[str]
    principal_variation_uci: list[str]
    strategic_ideas: list[str]
    explanation: str


class AnalysisResponse(BaseModel):
    best_move: str
    best_move_san: str
    best_move_details: MoveAnalysis
    principal_variation: list[str]
    principal_variation_uci: list[str]
    evaluation: float
    evaluation_type: EvaluationType
    depth: int
    top_moves: list[MoveAnalysis]


def analyse_position_facts(
    payload: AnalysisRequest,
    service: StockfishAnalysisService = default_analysis_service,
) -> ChessFacts:
    try:
        return service.analyse(
            PositionAnalysisQuery(
                fen=payload.fen,
                depth=payload.depth,
                multipv=payload.multipv,
            )
        )
    except StockfishRuntimeError as error:
        raise_position_http_error(error)


@router.post("/analysis", response_model=AnalysisResponse)
def analyse_position(payload: AnalysisRequest) -> AnalysisResponse:
    return AnalysisResponse.model_validate(
        to_legacy_analysis_payload(analyse_position_facts(payload))
    )
