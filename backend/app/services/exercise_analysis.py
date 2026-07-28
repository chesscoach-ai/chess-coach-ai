from __future__ import annotations

import os
from pathlib import Path

import chess
import chess.engine

from app.models.exercise_analysis import (
    EngineMove,
    ExerciseAnalysisResponse,
)


def get_stockfish_path() -> str:
    configured_path = os.getenv("STOCKFISH_PATH")

    if configured_path:
        return configured_path

    default_path = Path("stockfish")

    return str(default_path)


def score_to_values(
    score: chess.engine.PovScore,
    turn: chess.Color,
) -> tuple[float | None, int | None]:
    pov_score = score.pov(turn)

    mate = pov_score.mate()

    if mate is not None:
        return None, mate

    centipawns = pov_score.score()

    if centipawns is None:
        return None, None

    return centipawns / 100, None


def analyse_position(
    fen: str,
    depth: int = 16,
    multipv: int = 3,
) -> ExerciseAnalysisResponse:
    try:
        board = chess.Board(fen)
    except ValueError as error:
        raise ValueError(
            "La position FEN fournie est invalide."
        ) from error

    if not board.is_valid():
        raise ValueError(
            "La position FEN ne représente pas une position valide."
        )

    engine_path = get_stockfish_path()

    try:
        engine = chess.engine.SimpleEngine.popen_uci(
            engine_path,
            timeout=20,
        )
    except Exception as error:
        raise RuntimeError(
            f"Impossible de démarrer Stockfish depuis : {engine_path}"
        ) from error

    try:
        analysis = engine.analyse(
            board,
            chess.engine.Limit(depth=depth),
            multipv=multipv,
        )
    finally:
        engine.quit()

    if isinstance(analysis, dict):
        analysis_lines = [analysis]
    else:
        analysis_lines = analysis

    engine_moves: list[EngineMove] = []

    for line in analysis_lines:
        principal_variation = line.get("pv", [])

        if not principal_variation:
            continue

        first_move = principal_variation[0]

        evaluation, mate_in = score_to_values(
            line["score"],
            board.turn,
        )

        variation_board = board.copy()
        variation_san: list[str] = []

        for move in principal_variation:
            variation_san.append(
                variation_board.san(move)
            )
            variation_board.push(move)

        engine_moves.append(
            EngineMove(
                uci=first_move.uci(),
                san=board.san(first_move),
                evaluation=evaluation,
                mate_in=mate_in,
                principal_variation=variation_san,
            )
        )

    if not engine_moves:
        raise RuntimeError(
            "Stockfish n’a renvoyé aucun coup exploitable."
        )

    return ExerciseAnalysisResponse(
        fen=fen,
        best_move=engine_moves[0].uci,
        moves=engine_moves,
    )