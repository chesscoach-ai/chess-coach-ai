"""Estime le cout synchrone d'une analyse de partie, sans creer de job async."""

import json
import random
import sys
from pathlib import Path
from time import perf_counter

import chess

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from stockfish_runtime.config import (  # noqa: E402
    StockfishRuntimeConfig,
    default_stockfish_path,
)
from stockfish_runtime.engine_pool import EnginePool  # noqa: E402
from stockfish_runtime.service import (  # noqa: E402
    PositionAnalysisQuery,
    StockfishAnalysisService,
)


def representative_positions(count: int) -> list[str]:
    randomizer = random.Random(42)
    board = chess.Board()
    positions: list[str] = []
    while len(positions) < count:
        legal_moves = list(board.legal_moves)
        if not legal_moves:
            board = chess.Board()
            legal_moves = list(board.legal_moves)
        board.push(randomizer.choice(legal_moves))
        positions.append(board.fen())
    return positions


def measure(count: int) -> dict[str, float | int]:
    config = StockfishRuntimeConfig(
        path=default_stockfish_path(),
        pool_size=1,
        max_queue_size=2,
        threads=1,
        hash_mb=32,
    )
    pool = EnginePool(config)
    service = StockfishAnalysisService(pool, cache_limit=max(128, count))
    positions = representative_positions(count)
    started = perf_counter()
    for fen in positions:
        service.analyse(PositionAnalysisQuery(fen, depth=10, multipv=1))
    cold_seconds = perf_counter() - started
    started = perf_counter()
    for fen in positions:
        service.analyse(PositionAnalysisQuery(fen, depth=10, multipv=1))
    cached_seconds = perf_counter() - started
    snapshot = pool.metrics.snapshot()
    pool.shutdown()
    return {
        "positions": count,
        "engine_calls": count,
        "cold_seconds": round(cold_seconds, 3),
        "cached_seconds": round(cached_seconds, 3),
        "cache_hits": snapshot.cache_hits,
        "cache_misses": snapshot.cache_misses,
    }


if __name__ == "__main__":
    print(json.dumps([measure(size) for size in (20, 40, 60)], indent=2))
