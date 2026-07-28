from fastapi import APIRouter, HTTPException

from app.models.exercise_analysis import (
    ExerciseAnalysisRequest,
    ExerciseAnalysisResponse,
)
from app.services.exercise_analysis import (
    analyse_position,
)


router = APIRouter(
    prefix="/api/exercises",
    tags=["Exercises"],
)


@router.post(
    "/analyse-position",
    response_model=ExerciseAnalysisResponse,
)
def analyse_exercise_position(
    payload: ExerciseAnalysisRequest,
) -> ExerciseAnalysisResponse:
    try:
        return analyse_position(
            fen=payload.fen,
            depth=payload.depth,
            multipv=payload.multipv,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="Une erreur est survenue pendant l’analyse Stockfish.",
        ) from error