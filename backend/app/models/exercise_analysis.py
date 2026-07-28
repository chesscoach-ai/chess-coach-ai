from pydantic import BaseModel, Field


class ExerciseAnalysisRequest(BaseModel):
    fen: str
    depth: int = Field(default=16, ge=8, le=30)
    multipv: int = Field(default=3, ge=1, le=5)


class EngineMove(BaseModel):
    uci: str
    san: str
    evaluation: float | None
    mate_in: int | None
    principal_variation: list[str]


class ExerciseAnalysisResponse(BaseModel):
    fen: str
    best_move: str
    moves: list[EngineMove]