"""Route exercices utilisant le service Stockfish partagé."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from analysis_contract.adapters import to_legacy_exercise_payload
from stockfish_runtime.errors import StockfishRuntimeError
from stockfish_runtime.service import (
    PositionAnalysisQuery,
    default_analysis_service,
)

from .errors import raise_position_http_error


router = APIRouter()


class ExerciseAnalysisRequest(BaseModel):
    fen: str
    depth: int = Field(default=16, ge=8, le=25)
    multipv: int = Field(default=3, ge=1, le=5)


class ExerciseEngineMove(BaseModel):
    uci: str
    san: str
    evaluation: float | None
    mate_in: int | None
    principal_variation: list[str]
    principal_variation_uci: list[str]


class ExerciseAnalysisResponse(BaseModel):
    fen: str
    best_move: str
    best_move_san: str
    moves: list[ExerciseEngineMove]


@router.post(
    "/api/exercises/analyse-position",
    response_model=ExerciseAnalysisResponse,
)
def analyse_exercise_position(
    payload: ExerciseAnalysisRequest,
) -> ExerciseAnalysisResponse:
    try:
        facts = default_analysis_service.analyse(
            PositionAnalysisQuery(
                fen=payload.fen,
                depth=payload.depth,
                multipv=payload.multipv,
            )
        )
    except StockfishRuntimeError as error:
        raise_position_http_error(error)
    return ExerciseAnalysisResponse.model_validate(
        to_legacy_exercise_payload(facts)
    )
