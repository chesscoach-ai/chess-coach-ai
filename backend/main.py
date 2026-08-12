import hmac
import logging
import os
from typing import Literal

import chess
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from database.migrations import read_migration_status
from routes.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    MoveAnalysis,
    analyse_position,
    analyse_position_facts,
    router as analysis_router,
)
from routes.exercises import (
    ExerciseAnalysisRequest,
    ExerciseAnalysisResponse,
    ExerciseEngineMove,
    analyse_exercise_position,
    router as exercises_router,
)
from routes.move_review import (
    MoveReviewRequest,
    MoveReviewResponse,
    review_move,
    router as move_review_router,
)
from stockfish_runtime.engine_pool import default_engine_pool
from stockfish_runtime.service import default_analysis_service


app = FastAPI(
    title="Chess Coach AI API",
    version="0.9.0",
)
logger = logging.getLogger("chess_coach.api")


@app.middleware("http")
async def protect_engine_api(request: Request, call_next):
    expected_secret = os.getenv("BACKEND_API_SECRET", "").strip()
    if expected_secret and request.url.path not in {"/health", "/ready"}:
        provided_secret = request.headers.get(
            "X-Backend-Api-Secret",
            "",
        )
        if not hmac.compare_digest(provided_secret, expected_secret):
            return JSONResponse(
                status_code=401,
                content={"detail": "Accès au moteur refusé."},
            )
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(exercises_router)
app.include_router(move_review_router)


def shutdown_stockfish_engine() -> None:
    default_engine_pool.shutdown()
    default_analysis_service.cache_backend.close()


def warmup_stockfish_engines() -> None:
    """Prépare Stockfish au démarrage sans rendre l'API indisponible."""

    try:
        default_engine_pool.warmup()
    except Exception:
        logger.exception("stockfish_warmup_failed")


app.router.add_event_handler("startup", warmup_stockfish_engines)
app.router.add_event_handler("shutdown", shutdown_stockfish_engine)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Chess Coach AI API fonctionne.",
        "status": "online",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "api",
    }


@app.get("/ready")
def ready() -> JSONResponse:
    engine_state = default_engine_pool.readiness
    return JSONResponse(
        status_code=200 if engine_state == "ready" else 503,
        content={
            "status": "ready" if engine_state == "ready" else engine_state,
            "engine": engine_state,
            "pool_size": default_engine_pool.pool_size,
            "threads_per_engine": default_engine_pool.config.threads,
            "hash_mb_per_engine": default_engine_pool.config.hash_mb,
            "max_queue_size": default_engine_pool.config.max_queue_size,
        },
    )


@app.get("/runtime/metrics")
def runtime_metrics() -> dict[str, int | float]:
    """Expose les compteurs techniques au benchmark authentifie."""

    return default_engine_pool.metrics.snapshot().as_dict()


@app.get("/runtime/cache")
def runtime_cache() -> dict[str, str | bool | int | None]:
    """Expose l'état du cache aux outils de diagnostic authentifiés."""

    return default_analysis_service.cache_status()


@app.get("/runtime/database")
def runtime_database() -> dict[str, str | bool | None]:
    """Expose uniquement l'état non sensible du schéma au diagnostic."""

    return read_migration_status().as_dict()


# ============================================================
# Coach pédagogique conversationnel
# ============================================================

CoachLevel = Literal["beginner", "intermediate", "advanced"]


class CoachArrow(BaseModel):
    from_square: str
    to_square: str
    kind: Literal["move", "control", "attack", "defense"] = "move"


class CoachExplainRequest(BaseModel):
    fen: str
    best_move: MoveAnalysis
    question: str = Field(
        default="Explique-moi le meilleur coup.",
        min_length=1,
        max_length=500,
    )
    level: CoachLevel = "beginner"
    played_move: str | None = None


class CoachExplainResponse(BaseModel):
    title: str
    answer: str
    highlights: list[str]
    arrows: list[CoachArrow]
    variation: list[str]
    suggested_questions: list[str]
    source: Literal["rules"] = "rules"


def coach_piece_article(piece_name: str) -> str:
    if piece_name in {"dame", "tour"}:
        return "la"
    return "le"


def coach_level_sentence(
    level: CoachLevel,
    move: MoveAnalysis,
) -> str:
    ideas = " ".join(move.strategic_ideas)
    if level == "advanced":
        return (
            f"D’un point de vue plus précis, {move.move_san} "
            f"est évalué à {move.evaluation:+.2f} et la ligne "
            "principale confirme que ce coup conserve la meilleure "
            "coordination disponible. "
            f"{ideas}"
        )
    if level == "intermediate":
        return (
            "L’idée importante est de ne pas regarder uniquement "
            "la case d’arrivée : ce coup améliore aussi la position "
            "des autres pièces. "
            f"{ideas}"
        )
    return (
        "Pour retenir l’essentiel : ce coup améliore ta position "
        "sans te demander de calculer une longue combinaison. "
        f"{ideas}"
    )


def build_control_arrows(
    board: chess.Board,
    move: MoveAnalysis,
) -> list[CoachArrow]:
    arrows = [
        CoachArrow(
            from_square=move.from_square,
            to_square=move.to_square,
            kind="move",
        ),
    ]
    try:
        chess_move = chess.Move.from_uci(move.move)
    except ValueError:
        return arrows
    temp_board = board.copy()
    if chess_move not in temp_board.legal_moves:
        return arrows
    temp_board.push(chess_move)
    moved_piece = temp_board.piece_at(chess_move.to_square)
    if moved_piece is None:
        return arrows

    central_squares = {
        chess.D4,
        chess.E4,
        chess.D5,
        chess.E5,
    }
    for attacked_square in temp_board.attacks(chess_move.to_square):
        if attacked_square in central_squares:
            arrows.append(
                CoachArrow(
                    from_square=move.to_square,
                    to_square=chess.square_name(attacked_square),
                    kind="control",
                ),
            )
    return arrows[:5]


def coach_question_intent(question: str) -> str:
    normalized = question.casefold()
    if any(
        word in normalized
        for word in ("variante", "suite", "après", "réponse", "montre")
    ):
        return "variation"
    if any(word in normalized for word in ("plan", "objectif", "ensuite")):
        return "plan"
    if any(
        word in normalized
        for word in ("pourquoi pas", "compar", "autre coup", "mon coup")
    ):
        return "comparison"
    return "why"


def build_coach_answer(
    request: CoachExplainRequest,
    board: chess.Board,
) -> tuple[str, str]:
    move = request.best_move
    intent = coach_question_intent(request.question)
    article = coach_piece_article(move.moved_piece)

    if intent == "variation":
        variation = (
            " → ".join(move.principal_variation[:6])
            if move.principal_variation
            else "aucune variante fiable n’est disponible"
        )
        return (
            "La suite proposée par Stockfish",
            (
                f"Après {move.move_san}, la ligne principale est : "
                f"{variation}. Cette variante n’est pas une obligation, "
                "mais elle montre les réponses que Stockfish considère "
                "comme les plus précises."
            ),
        )

    if intent == "plan":
        ideas = " ".join(move.strategic_ideas)
        return (
            "Le plan à retenir",
            (
                f"Le premier objectif est de jouer {move.move_san}. "
                f"{ideas} Ensuite, cherche à améliorer ta pièce la moins "
                "active, à sécuriser ton roi et à vérifier les menaces "
                "adverses avant de lancer une attaque."
            ),
        )

    if intent == "comparison":
        played_text = (
            f"Ton coup envisagé est {request.played_move}. "
            if request.played_move
            else ""
        )
        gap_text = ""
        if move.evaluation_gap is not None:
            gap_text = (
                f" L’écart avec la meilleure option est estimé à "
                f"{move.evaluation_gap:.2f} pion."
            )
        return (
            "Pourquoi Stockfish préfère ce coup",
            (
                f"{played_text}Stockfish préfère {move.move_san}, car ce "
                f"coup déplace {article} {move.moved_piece} de "
                f"{move.from_square} vers {move.to_square}. "
                f"{move.explanation}{gap_text}"
            ),
        )

    tactical_text = ""
    if move.gives_checkmate:
        tactical_text = " Il termine immédiatement la partie par échec et mat."
    elif move.gives_check:
        tactical_text = " Il oblige aussi l’adversaire à répondre à l’échec."
    elif move.is_capture and move.captured_piece:
        tactical_text = f" Il capture également un {move.captured_piece} adverse."
    return (
        f"Pourquoi jouer {move.move_san} ?",
        (
            f"{move.beginner_description} "
            f"{coach_level_sentence(request.level, move)}"
            f"{tactical_text}"
        ),
    )


@app.post(
    "/coach/explain",
    response_model=CoachExplainResponse,
)
def explain_with_coach(
    request: CoachExplainRequest,
) -> CoachExplainResponse:
    try:
        board = chess.Board(request.fen)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="Le FEN fourni au coach est invalide.",
        ) from error

    title, answer = build_coach_answer(request, board)
    highlights = list(
        dict.fromkeys(
            [
                request.best_move.from_square,
                request.best_move.to_square,
                *[
                    arrow.to_square
                    for arrow in build_control_arrows(board, request.best_move)
                    if arrow.kind == "control"
                ],
            ],
        ),
    )
    return CoachExplainResponse(
        title=title,
        answer=answer,
        highlights=highlights,
        arrows=build_control_arrows(board, request.best_move),
        variation=request.best_move.principal_variation[:8],
        suggested_questions=[
            "Pourquoi ce coup est-il meilleur ?",
            "Montre-moi la variante.",
            "Quel est mon plan ensuite ?",
            "Pourquoi pas un autre coup ?",
        ],
    )
