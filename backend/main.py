import hmac
import os
import threading
from contextlib import contextmanager
from collections import OrderedDict
from pathlib import Path
from typing import Iterator, Literal

import chess
import chess.engine
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


app = FastAPI(
    title="Chess Coach AI API",
    version="0.9.0",
)


@app.middleware("http")
async def protect_engine_api(request: Request, call_next):
    expected_secret = os.getenv("BACKEND_API_SECRET", "").strip()
    if expected_secret and request.url.path != "/health":
        provided_secret = request.headers.get(
            "X-Backend-Api-Secret",
            "",
        )
        if not hmac.compare_digest(
            provided_secret,
            expected_secret,
        ):
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


BASE_DIR = Path(__file__).resolve().parent
STOCKFISH_PATH = Path(
    os.getenv(
        "STOCKFISH_PATH",
        str(BASE_DIR / "engines" / "stockfish.exe"),
    )
)

_ENGINE_LOCK = threading.RLock()
_STOCKFISH_ENGINE: chess.engine.SimpleEngine | None = None


def get_stockfish_engine() -> chess.engine.SimpleEngine:
    global _STOCKFISH_ENGINE

    if _STOCKFISH_ENGINE is None:
        _STOCKFISH_ENGINE = chess.engine.SimpleEngine.popen_uci(
            str(STOCKFISH_PATH),
        )
        _STOCKFISH_ENGINE.configure(
            {
                "Hash": 64,
                "Threads": 1,
            }
        )

    return _STOCKFISH_ENGINE


@contextmanager
def use_stockfish_engine() -> Iterator[chess.engine.SimpleEngine]:
    with _ENGINE_LOCK:
        yield get_stockfish_engine()


def shutdown_stockfish_engine() -> None:
    global _STOCKFISH_ENGINE

    with _ENGINE_LOCK:
        engine = _STOCKFISH_ENGINE
        _STOCKFISH_ENGINE = None

        if engine is None:
            return

        try:
            engine.quit()
        except (chess.engine.EngineError, OSError):
            pass


app.router.add_event_handler(
    "shutdown",
    shutdown_stockfish_engine,
)


EvaluationType = Literal[
    "centipawn",
    "mate",
]

MoveClassification = Literal[
    "excellent",
    "good",
    "inaccuracy",
    "mistake",
    "blunder",
]


PIECE_NAMES = {
    chess.PAWN: "pion",
    chess.KNIGHT: "cavalier",
    chess.BISHOP: "fou",
    chess.ROOK: "tour",
    chess.QUEEN: "dame",
    chess.KING: "roi",
}


class AnalysisRequest(BaseModel):
    fen: str
    depth: int = Field(
        default=15,
        ge=1,
        le=25,
    )
    multipv: int = Field(
        default=3,
        ge=1,
        le=5,
    )


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


_ANALYSIS_CACHE_LIMIT = 128
_ANALYSIS_CACHE: OrderedDict[
    tuple[str, int, int],
    AnalysisResponse,
] = OrderedDict()


def get_cached_analysis(
    key: tuple[str, int, int],
) -> AnalysisResponse | None:
    with _ENGINE_LOCK:
        cached = _ANALYSIS_CACHE.get(key)
        if cached is None:
            return None

        _ANALYSIS_CACHE.move_to_end(key)
        return cached.model_copy(deep=True)


def cache_analysis(
    key: tuple[str, int, int],
    response: AnalysisResponse,
) -> None:
    with _ENGINE_LOCK:
        _ANALYSIS_CACHE[key] = response.model_copy(deep=True)
        _ANALYSIS_CACHE.move_to_end(key)

        while len(_ANALYSIS_CACHE) > _ANALYSIS_CACHE_LIMIT:
            _ANALYSIS_CACHE.popitem(last=False)


class ExerciseAnalysisRequest(BaseModel):
    fen: str
    depth: int = Field(
        default=16,
        ge=8,
        le=25,
    )
    multipv: int = Field(
        default=3,
        ge=1,
        le=5,
    )


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


class MoveReviewRequest(BaseModel):
    fen_before: str
    played_move: str
    depth: int = Field(
        default=15,
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


@app.get("/")
def root() -> dict[str, str]:
    return {
        "message": "Chess Coach AI API fonctionne.",
        "status": "online",
    }


@app.get("/health")
def health() -> dict[str, str]:
    if not STOCKFISH_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="Stockfish est introuvable.",
        )

    # Wake Stockfish together with the Render service so the first real
    # analysis does not pay the process startup cost.
    with use_stockfish_engine():
        pass

    return {
        "status": "healthy",
        "engine": "warm",
    }


def convert_variation(
    board: chess.Board,
    variation: list[chess.Move],
) -> tuple[list[str], list[str]]:
    temp_board = board.copy()

    variation_san: list[str] = []
    variation_uci: list[str] = []

    for move in variation:
        if move not in temp_board.legal_moves:
            break

        variation_san.append(
            temp_board.san(move),
        )
        variation_uci.append(
            move.uci(),
        )

        temp_board.push(move)

    return variation_san, variation_uci


def extract_evaluation(
    score: chess.engine.PovScore,
    turn: chess.Color,
) -> tuple[float, EvaluationType]:
    pov_score = score.pov(turn)
    mate_score = pov_score.mate()

    if mate_score is not None:
        return float(mate_score), "mate"

    centipawn_score = pov_score.score()

    if centipawn_score is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "L’évaluation Stockfish est "
                "indisponible."
            ),
        )

    return (
        round(centipawn_score / 100, 2),
        "centipawn",
    )


def extract_normalized_evaluation(
    score: chess.engine.PovScore,
    perspective: chess.Color,
) -> float:
    """
    Convertit l'évaluation Stockfish en nombre comparable.

    Une position de mat est convertie en une valeur très
    importante afin de pouvoir calculer une perte d'évaluation.
    """
    pov_score = score.pov(perspective)

    centipawn_score = pov_score.score(
        mate_score=100_000,
    )

    if centipawn_score is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Impossible de comparer les "
                "évaluations Stockfish."
            ),
        )

    return centipawn_score / 100


def get_captured_piece(
    board: chess.Board,
    move: chess.Move,
) -> str | None:
    if not board.is_capture(move):
        return None

    if board.is_en_passant(move):
        return "pion"

    captured_piece = board.piece_at(
        move.to_square,
    )

    if captured_piece is None:
        return None

    return PIECE_NAMES.get(
        captured_piece.piece_type,
        "pièce",
    )


def move_gives_check(
    board: chess.Board,
    move: chess.Move,
) -> bool:
    temp_board = board.copy()
    temp_board.push(move)

    return temp_board.is_check()


def move_gives_checkmate(
    board: chess.Board,
    move: chess.Move,
) -> bool:
    temp_board = board.copy()
    temp_board.push(move)

    return temp_board.is_checkmate()


def build_beginner_move_text(
    moved_piece: str,
    moved_piece_color: Literal["white", "black"],
    from_square: str,
    to_square: str,
    captured_piece: str | None,
    gives_check: bool,
    gives_checkmate: bool,
    is_castling: bool,
    promotion_piece: str | None,
    strategic_ideas: list[str],
) -> tuple[str, str]:
    color_label = (
        "blanc"
        if moved_piece_color == "white"
        else "noir"
    )

    if is_castling:
        label = "Mettre le roi à l’abri grâce au roque."
        description = (
            f"Le roi {color_label} et une tour se déplacent "
            "en même temps. Le roi devient généralement plus "
            "difficile à attaquer."
        )
    elif captured_piece:
        label = (
            f"Déplacer le {moved_piece} de {from_square} "
            f"vers {to_square} et capturer le "
            f"{captured_piece} adverse."
        )
        description = (
            f"Le {moved_piece} {color_label} quitte "
            f"{from_square}, arrive en {to_square} et retire "
            f"le {captured_piece} adverse de l’échiquier."
        )
    else:
        label = (
            f"Déplacer le {moved_piece} de {from_square} "
            f"vers {to_square}."
        )
        description = (
            f"Le {moved_piece} {color_label} quitte "
            f"{from_square} et arrive en {to_square}."
        )

    if gives_checkmate:
        description += (
            " Ce coup met le roi adverse en échec et mat : "
            "la partie est terminée."
        )
    elif gives_check:
        description += (
            " Ce coup met le roi adverse en échec : "
            "l’adversaire doit répondre immédiatement."
        )

    if promotion_piece:
        description += (
            f" Le pion est promu en {promotion_piece}."
        )

    if strategic_ideas:
        description += f" Pourquoi ce coup est utile : {strategic_ideas[0]}"

    return label, description


def controls_central_square(
    move: chess.Move,
) -> bool:
    central_squares = {
        chess.D4,
        chess.E4,
        chess.D5,
        chess.E5,
    }

    return move.to_square in central_squares


def develops_minor_piece(
    board: chess.Board,
    move: chess.Move,
) -> bool:
    piece = board.piece_at(
        move.from_square,
    )

    if piece is None:
        return False

    if piece.piece_type not in {
        chess.KNIGHT,
        chess.BISHOP,
    }:
        return False

    starting_squares = {
        chess.B1,
        chess.G1,
        chess.C1,
        chess.F1,
        chess.B8,
        chess.G8,
        chess.C8,
        chess.F8,
    }

    return move.from_square in starting_squares


def moves_queen_early(
    board: chess.Board,
    move: chess.Move,
) -> bool:
    piece = board.piece_at(
        move.from_square,
    )

    if piece is None:
        return False

    return (
        piece.piece_type == chess.QUEEN
        and board.fullmove_number <= 10
    )


def detect_strategic_ideas(
    board: chess.Board,
    move: chess.Move,
    is_capture: bool,
    gives_check: bool,
    is_castling: bool,
    is_promotion: bool,
) -> list[str]:
    ideas: list[str] = []

    if is_castling:
        ideas.append(
            "Met le roi à l’abri et connecte les tours."
        )

    if gives_check:
        ideas.append(
            "Force l’adversaire à répondre à l’échec."
        )

    if is_capture:
        ideas.append(
            "Modifie immédiatement l’équilibre matériel."
        )

    if is_promotion:
        ideas.append(
            "Transforme un pion en une pièce plus puissante."
        )

    if controls_central_square(move):
        ideas.append(
            "Renforce le contrôle du centre."
        )

    if develops_minor_piece(
        board,
        move,
    ):
        ideas.append(
            "Développe une pièce mineure vers une case active."
        )

    if moves_queen_early(
        board,
        move,
    ):
        ideas.append(
            "Active la dame tôt, mais elle peut devenir une cible."
        )

    if not ideas:
        ideas.append(
            "Améliore la coordination ou le placement des pièces."
        )

    return ideas


def calculate_evaluation_gap(
    best_evaluation: float,
    best_evaluation_type: EvaluationType,
    evaluation: float,
    evaluation_type: EvaluationType,
) -> float | None:
    if (
        best_evaluation_type != "centipawn"
        or evaluation_type != "centipawn"
    ):
        return None

    return round(
        max(
            0.0,
            best_evaluation - evaluation,
        ),
        2,
    )


def evaluation_gap_comment(
    rank: int,
    evaluation_gap: float | None,
) -> str:
    if rank == 1:
        return (
            "Stockfish considère ce coup comme la "
            "meilleure option dans cette position."
        )

    if evaluation_gap is None:
        return (
            "Cette option est différente du meilleur coup, "
            "mais la présence d’une séquence de mat empêche "
            "une comparaison numérique simple."
        )

    if evaluation_gap <= 0.10:
        return (
            "Ce coup est presque aussi fort que "
            "le premier choix."
        )

    if evaluation_gap <= 0.30:
        return (
            "Ce coup reste une très bonne alternative."
        )

    if evaluation_gap <= 0.75:
        return (
            "Ce coup est jouable, mais il est "
            "sensiblement moins précis."
        )

    if evaluation_gap <= 1.50:
        return (
            "Ce coup concède un avantage notable "
            "par rapport au meilleur choix."
        )

    return (
        "Ce coup est nettement inférieur au "
        "meilleur choix selon Stockfish."
    )


def build_move_explanation(
    rank: int,
    move_san: str,
    moved_piece: str,
    from_square: str,
    to_square: str,
    captured_piece: str | None,
    is_capture: bool,
    gives_check: bool,
    is_castling: bool,
    is_promotion: bool,
    evaluation_gap: float | None,
    strategic_ideas: list[str],
) -> str:
    sentences: list[str] = []

    if is_castling:
        sentences.append(
            f"{move_san} est un roque qui sécurise le roi "
            "et améliore la coordination des tours."
        )
    else:
        sentences.append(
            f"{move_san} déplace le {moved_piece} "
            f"de {from_square} vers {to_square}."
        )

    if is_capture and captured_piece:
        sentences.append(
            f"Le coup capture un {captured_piece} adverse."
        )

    if gives_check:
        sentences.append(
            "Il donne également échec au roi adverse, "
            "ce qui rend la réponse forcée ou très contrainte."
        )

    if is_promotion:
        sentences.append(
            "Le pion atteint la dernière rangée "
            "et obtient une promotion."
        )

    sentences.append(
        evaluation_gap_comment(
            rank,
            evaluation_gap,
        )
    )

    if strategic_ideas:
        sentences.append(
            f"Idée principale : {strategic_ideas[0]}"
        )

    return " ".join(sentences)


def create_move_analysis(
    board: chess.Board,
    info: dict,
    rank: int,
    requested_depth: int,
    best_evaluation: float,
    best_evaluation_type: EvaluationType,
) -> MoveAnalysis | None:
    variation = info.get("pv")

    if not variation:
        return None

    first_move = variation[0]

    if first_move not in board.legal_moves:
        return None

    piece = board.piece_at(
        first_move.from_square,
    )

    if piece is None:
        return None

    score = info.get("score")

    if score is None:
        return None

    evaluation, evaluation_type = extract_evaluation(
        score,
        board.turn,
    )

    variation_san, variation_uci = convert_variation(
        board,
        variation,
    )

    move_san = board.san(first_move)

    from_square = chess.square_name(
        first_move.from_square,
    )

    to_square = chess.square_name(
        first_move.to_square,
    )

    moved_piece = PIECE_NAMES.get(
        piece.piece_type,
        "pièce",
    )

    is_capture = board.is_capture(
        first_move,
    )

    gives_check = move_gives_check(
        board,
        first_move,
    )

    gives_checkmate = move_gives_checkmate(
        board,
        first_move,
    )

    is_castling = board.is_castling(
        first_move,
    )

    is_promotion = (
        first_move.promotion is not None
    )

    captured_piece = get_captured_piece(
        board,
        first_move,
    )

    moved_piece_color: Literal["white", "black"] = (
        "white"
        if piece.color == chess.WHITE
        else "black"
    )

    promotion_piece = (
        PIECE_NAMES.get(first_move.promotion)
        if first_move.promotion is not None
        else None
    )

    evaluation_gap = calculate_evaluation_gap(
        best_evaluation,
        best_evaluation_type,
        evaluation,
        evaluation_type,
    )

    strategic_ideas = detect_strategic_ideas(
        board=board,
        move=first_move,
        is_capture=is_capture,
        gives_check=gives_check,
        is_castling=is_castling,
        is_promotion=is_promotion,
    )

    beginner_label, beginner_description = (
        build_beginner_move_text(
            moved_piece=moved_piece,
            moved_piece_color=moved_piece_color,
            from_square=from_square,
            to_square=to_square,
            captured_piece=captured_piece,
            gives_check=gives_check,
            gives_checkmate=gives_checkmate,
            is_castling=is_castling,
            promotion_piece=promotion_piece,
            strategic_ideas=strategic_ideas,
        )
    )

    explanation = build_move_explanation(
        rank=rank,
        move_san=move_san,
        moved_piece=moved_piece,
        from_square=from_square,
        to_square=to_square,
        captured_piece=captured_piece,
        is_capture=is_capture,
        gives_check=gives_check,
        is_castling=is_castling,
        is_promotion=is_promotion,
        evaluation_gap=evaluation_gap,
        strategic_ideas=strategic_ideas,
    )

    return MoveAnalysis(
        rank=rank,
        move=first_move.uci(),
        move_san=move_san,
        from_square=from_square,
        to_square=to_square,
        moved_piece=moved_piece,
        moved_piece_color=moved_piece_color,
        captured_piece=captured_piece,
        is_capture=is_capture,
        gives_check=gives_check,
        gives_checkmate=gives_checkmate,
        is_castling=is_castling,
        is_promotion=is_promotion,
        promotion_piece=promotion_piece,
        beginner_label=beginner_label,
        beginner_description=beginner_description,
        evaluation=evaluation,
        evaluation_type=evaluation_type,
        evaluation_gap=evaluation_gap,
        depth=info.get(
            "depth",
            requested_depth,
        ),
        principal_variation=variation_san,
        principal_variation_uci=variation_uci,
        strategic_ideas=strategic_ideas,
        explanation=explanation,
    )


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


def get_move_review_comment(
    classification: MoveClassification,
) -> str:
    if classification == "excellent":
        return (
            "Ce coup conserve pleinement la qualité de la "
            "position et correspond au meilleur choix de "
            "Stockfish, ou à une option pratiquement équivalente."
        )

    if classification == "good":
        return (
            "Ce coup est solide et conserve l’essentiel de "
            "l’avantage, même si Stockfish préfère légèrement "
            "une autre option."
        )

    if classification == "inaccuracy":
        return (
            "Ce coup reste jouable, mais il abandonne une "
            "partie de l’avantage ou permet à l’adversaire "
            "d’améliorer sa position."
        )

    if classification == "mistake":
        return (
            "Ce coup détériore sensiblement la position. "
            "Une option plus précise permettait de conserver "
            "davantage de contrôle."
        )

    return (
        "Ce coup modifie fortement l’évaluation de la "
        "position. Il peut perdre du matériel, manquer une "
        "menace importante ou permettre une attaque décisive."
    )


def build_move_review_explanation(
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
    sentences: list[str] = []

    if is_best_move:
        sentences.append(
            f"{played_move_san} est le premier choix de Stockfish."
        )
    else:
        sentences.append(
            f"Après {played_move_san}, Stockfish préfère "
            f"{best_move_san}."
        )

    sentences.append(
        get_move_review_comment(
            classification,
        )
    )

    if not is_best_move:
        unit = (
            "pion"
            if evaluation_loss <= 1
            else "pions"
        )

        sentences.append(
            f"La perte d’évaluation est estimée à "
            f"{evaluation_loss:.2f} {unit}."
        )

    tactical_details: list[str] = []

    if is_capture:
        tactical_details.append(
            "réalise une capture"
        )

    if gives_check:
        tactical_details.append(
            "donne échec"
        )

    if is_castling:
        tactical_details.append(
            "met le roi à l’abri par le roque"
        )

    if is_promotion:
        tactical_details.append(
            "permet une promotion"
        )

    if tactical_details:
        sentences.append(
            "Ce coup "
            + ", ".join(tactical_details)
            + "."
        )

    return " ".join(sentences)


def evaluate_terminal_position(
    board: chess.Board,
    perspective: chess.Color,
) -> tuple[float, EvaluationType, float]:
    if board.is_checkmate():
        winner = not board.turn

        if winner == perspective:
            return (
                1.0,
                "mate",
                1000.0,
            )

        return (
            -1.0,
            "mate",
            -1000.0,
        )

    return (
        0.0,
        "centipawn",
        0.0,
    )


@app.post(
    "/analysis",
    response_model=AnalysisResponse,
)
def analyse_position(
    payload: AnalysisRequest,
) -> AnalysisResponse:
    if not STOCKFISH_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Stockfish introuvable : "
                f"{STOCKFISH_PATH}"
            ),
        )

    cache_key = (
        payload.fen,
        payload.depth,
        payload.multipv,
    )
    cached_analysis = get_cached_analysis(cache_key)
    if cached_analysis is not None:
        return cached_analysis

    try:
        board = chess.Board(
            payload.fen,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail="FEN invalide.",
        ) from error

    if board.is_game_over():
        raise HTTPException(
            status_code=400,
            detail="La partie est terminée.",
        )

    try:
        with use_stockfish_engine() as engine:
            results = engine.analyse(
                board,
                chess.engine.Limit(
                    depth=payload.depth,
                ),
                multipv=payload.multipv,
            )

            if not isinstance(
                results,
                list,
            ):
                results = [results]

            valid_results = [
                info
                for info in results
                if (
                    info.get("pv")
                    and info.get("score") is not None
                )
            ]

            if not valid_results:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Stockfish n’a renvoyé aucune "
                        "variante exploitable."
                    ),
                )

            best_score = valid_results[0].get(
                "score",
            )

            if best_score is None:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "L’évaluation du meilleur "
                        "coup est indisponible."
                    ),
                )

            (
                best_evaluation,
                best_evaluation_type,
            ) = extract_evaluation(
                best_score,
                board.turn,
            )

            top_moves: list[MoveAnalysis] = []

            for index, info in enumerate(
                valid_results,
                start=1,
            ):
                move_analysis = create_move_analysis(
                    board=board,
                    info=info,
                    rank=index,
                    requested_depth=payload.depth,
                    best_evaluation=best_evaluation,
                    best_evaluation_type=(
                        best_evaluation_type
                    ),
                )

                if move_analysis is not None:
                    top_moves.append(
                        move_analysis,
                    )

            if not top_moves:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Stockfish n’a renvoyé "
                        "aucun coup exploitable."
                    ),
                )

            best = top_moves[0]

            response = AnalysisResponse(
                best_move=best.move,
                best_move_san=best.move_san,
                best_move_details=best,
                principal_variation=(
                    best.principal_variation
                ),
                principal_variation_uci=(
                    best.principal_variation_uci
                ),
                evaluation=best.evaluation,
                evaluation_type=(
                    best.evaluation_type
                ),
                depth=best.depth,
                top_moves=top_moves,
            )
            cache_analysis(cache_key, response)
            return response

    except chess.engine.EngineTerminatedError as error:
        shutdown_stockfish_engine()
        raise HTTPException(
            status_code=500,
            detail=(
                "Stockfish s’est arrêté de manière "
                "inattendue."
            ),
        ) from error

    except chess.engine.EngineError as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Erreur du moteur Stockfish : "
                f"{error}"
            ),
        ) from error


@app.post(
    "/api/exercises/analyse-position",
    response_model=ExerciseAnalysisResponse,
)
def analyse_exercise_position(
    payload: ExerciseAnalysisRequest,
) -> ExerciseAnalysisResponse:
    """
    Analyse une position destinée à un exercice.

    Cette route réutilise le moteur d'analyse principal afin d'éviter
    de dupliquer la logique Stockfish. L'évaluation est exprimée en
    pions lorsqu'elle est numérique, ou dans `mate_in` lorsqu'un mat
    forcé est détecté.
    """
    analysis = analyse_position(
        AnalysisRequest(
            fen=payload.fen,
            depth=payload.depth,
            multipv=payload.multipv,
        )
    )

    moves: list[ExerciseEngineMove] = []

    for move in analysis.top_moves:
        if move.evaluation_type == "mate":
            evaluation: float | None = None
            mate_in: int | None = int(move.evaluation)
        else:
            evaluation = move.evaluation
            mate_in = None

        moves.append(
            ExerciseEngineMove(
                uci=move.move,
                san=move.move_san,
                evaluation=evaluation,
                mate_in=mate_in,
                principal_variation=move.principal_variation,
                principal_variation_uci=(
                    move.principal_variation_uci
                ),
            )
        )

    if not moves:
        raise HTTPException(
            status_code=500,
            detail=(
                "Stockfish n’a renvoyé aucun coup "
                "exploitable pour l’exercice."
            ),
        )

    return ExerciseAnalysisResponse(
        fen=payload.fen,
        best_move=analysis.best_move,
        best_move_san=analysis.best_move_san,
        moves=moves,
    )


@app.post(
    "/move-review",
    response_model=MoveReviewResponse,
)
def review_move(
    payload: MoveReviewRequest,
) -> MoveReviewResponse:
    if not STOCKFISH_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                f"Stockfish introuvable : "
                f"{STOCKFISH_PATH}"
            ),
        )

    try:
        board_before = chess.Board(
            payload.fen_before,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=(
                "Le FEN précédant le coup "
                "est invalide."
            ),
        ) from error

    if board_before.is_game_over():
        raise HTTPException(
            status_code=400,
            detail=(
                "La partie était déjà terminée "
                "avant ce coup."
            ),
        )

    try:
        played_move = chess.Move.from_uci(
            payload.played_move,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=(
                "Le coup joué n’est pas "
                "au format UCI."
            ),
        ) from error

    if played_move not in board_before.legal_moves:
        raise HTTPException(
            status_code=400,
            detail=(
                "Le coup joué n’est pas légal "
                "dans cette position."
            ),
        )

    mover_color = board_before.turn

    played_move_san = board_before.san(
        played_move,
    )
    played_piece = board_before.piece_at(
        played_move.from_square,
    )
    played_move_piece = PIECE_NAMES.get(
        played_piece.piece_type if played_piece else chess.PAWN,
        "pièce",
    )

    played_move_is_capture = (
        board_before.is_capture(
            played_move,
        )
    )

    played_move_is_castling = (
        board_before.is_castling(
            played_move,
        )
    )

    played_move_is_promotion = (
        played_move.promotion is not None
    )

    played_move_gives_check = move_gives_check(
        board_before,
        played_move,
    )

    board_after = board_before.copy()
    board_after.push(
        played_move,
    )

    try:
        with use_stockfish_engine() as engine:
            best_info = engine.analyse(
                board_before,
                chess.engine.Limit(
                    depth=payload.depth,
                ),
            )

            best_variation = best_info.get(
                "pv",
            )
            best_score = best_info.get(
                "score",
            )

            if (
                not best_variation
                or best_score is None
            ):
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Stockfish n’a pas renvoyé "
                        "de meilleur coup exploitable."
                    ),
                )

            best_move = best_variation[0]

            if best_move not in board_before.legal_moves:
                raise HTTPException(
                    status_code=500,
                    detail=(
                        "Le meilleur coup renvoyé "
                        "par Stockfish est invalide."
                    ),
                )

            best_move_san = board_before.san(
                best_move,
            )
            best_piece = board_before.piece_at(
                best_move.from_square,
            )
            best_move_piece = PIECE_NAMES.get(
                best_piece.piece_type if best_piece else chess.PAWN,
                "pièce",
            )

            (
                best_variation_san,
                best_variation_uci,
            ) = convert_variation(
                board_before,
                best_variation,
            )

            (
                evaluation_before,
                evaluation_before_type,
            ) = extract_evaluation(
                best_score,
                mover_color,
            )

            normalized_before = (
                extract_normalized_evaluation(
                    best_score,
                    mover_color,
                )
            )

            if board_after.is_game_over():
                (
                    evaluation_after,
                    evaluation_after_type,
                    normalized_after,
                ) = evaluate_terminal_position(
                    board_after,
                    mover_color,
                )
            else:
                after_info = engine.analyse(
                    board_after,
                    chess.engine.Limit(
                        depth=payload.depth,
                    ),
                )

                after_score = after_info.get(
                    "score",
                )

                if after_score is None:
                    raise HTTPException(
                        status_code=500,
                        detail=(
                            "Stockfish n’a pas pu "
                            "évaluer la position "
                            "après le coup."
                        ),
                    )

                (
                    evaluation_after,
                    evaluation_after_type,
                ) = extract_evaluation(
                    after_score,
                    mover_color,
                )

                normalized_after = (
                    extract_normalized_evaluation(
                        after_score,
                        mover_color,
                    )
                )

            evaluation_loss = round(
                max(
                    0.0,
                    normalized_before
                    - normalized_after,
                ),
                2,
            )

            is_best_move = (
                played_move == best_move
            )

            (
                classification,
                classification_label,
            ) = classify_move(
                evaluation_loss=(
                    evaluation_loss
                ),
                is_best_move=is_best_move,
            )

            explanation = (
                build_move_review_explanation(
                    played_move_san=(
                        played_move_san
                    ),
                    best_move_san=best_move_san,
                    classification=classification,
                    evaluation_loss=(
                        evaluation_loss
                    ),
                    is_best_move=is_best_move,
                    is_capture=(
                        played_move_is_capture
                    ),
                    gives_check=(
                        played_move_gives_check
                    ),
                    is_castling=(
                        played_move_is_castling
                    ),
                    is_promotion=(
                        played_move_is_promotion
                    ),
                )
            )

            return MoveReviewResponse(
                played_move=played_move.uci(),
                played_move_san=(
                    played_move_san
                ),
                played_move_piece=(
                    played_move_piece
                ),
                best_move=best_move.uci(),
                best_move_san=best_move_san,
                best_move_piece=(
                    best_move_piece
                ),
                is_best_move=is_best_move,
                evaluation_before=(
                    evaluation_before
                ),
                evaluation_before_type=(
                    evaluation_before_type
                ),
                evaluation_after=(
                    evaluation_after
                ),
                evaluation_after_type=(
                    evaluation_after_type
                ),
                evaluation_loss=(
                    evaluation_loss
                ),
                classification=(
                    classification
                ),
                classification_label=(
                    classification_label
                ),
                explanation=explanation,
                best_variation=(
                    best_variation_san
                ),
                best_variation_uci=(
                    best_variation_uci
                ),
                played_move_gives_check=(
                    played_move_gives_check
                ),
                played_move_is_capture=(
                    played_move_is_capture
                ),
                played_move_is_castling=(
                    played_move_is_castling
                ),
                played_move_is_promotion=(
                    played_move_is_promotion
                ),
            )

    except chess.engine.EngineTerminatedError as error:
        shutdown_stockfish_engine()
        raise HTTPException(
            status_code=500,
            detail=(
                "Stockfish s’est arrêté de manière "
                "inattendue."
            ),
        ) from error

    except chess.engine.EngineError as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Erreur du moteur Stockfish : "
                f"{error}"
            ),
        ) from error

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
        for word in (
            "variante",
            "suite",
            "après",
            "réponse",
            "montre",
        )
    ):
        return "variation"

    if any(
        word in normalized
        for word in (
            "plan",
            "objectif",
            "ensuite",
        )
    ):
        return "plan"

    if any(
        word in normalized
        for word in (
            "pourquoi pas",
            "compar",
            "autre coup",
            "mon coup",
        )
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
        tactical_text = (
            " Il termine immédiatement la partie par échec et mat."
        )
    elif move.gives_check:
        tactical_text = (
            " Il oblige aussi l’adversaire à répondre à l’échec."
        )
    elif move.is_capture and move.captured_piece:
        tactical_text = (
            f" Il capture également un {move.captured_piece} adverse."
        )

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

    title, answer = build_coach_answer(
        request,
        board,
    )

    highlights = list(
        dict.fromkeys(
            [
                request.best_move.from_square,
                request.best_move.to_square,
                *[
                    arrow.to_square
                    for arrow in build_control_arrows(
                        board,
                        request.best_move,
                    )
                    if arrow.kind == "control"
                ],
            ],
        ),
    )

    return CoachExplainResponse(
        title=title,
        answer=answer,
        highlights=highlights,
        arrows=build_control_arrows(
            board,
            request.best_move,
        ),
        variation=request.best_move.principal_variation[:8],
        suggested_questions=[
            "Pourquoi ce coup est-il meilleur ?",
            "Montre-moi la variante.",
            "Quel est mon plan ensuite ?",
            "Pourquoi pas un autre coup ?",
        ],
    )
