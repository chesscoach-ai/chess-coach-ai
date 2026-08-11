"""Baseline locale reproductible du runtime Stockfish serialise.

Depuis ``backend`` :
    .venv/Scripts/python.exe scripts/stockfish_load_baseline.py
"""

import json
import os
import statistics
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from time import perf_counter

import chess


sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from stockfish_runtime.engine_manager import default_engine_manager  # noqa: E402
from stockfish_runtime.config import default_runtime_config  # noqa: E402
from stockfish_runtime.errors import StockfishRuntimeError  # noqa: E402
from stockfish_runtime.service import (  # noqa: E402
    PositionAnalysisQuery,
    StockfishAnalysisService,
)


MOVE_LINES = (
    (),
    ("e4",),
    ("d4",),
    ("Nf3",),
    ("c4",),
    ("e4", "e5"),
    ("d4", "d5"),
    ("Nf3", "Nf6"),
    ("c4", "e5"),
    ("e4", "c5"),
)
BASELINE_MULTIPV = min(
    5,
    max(1, int(os.getenv("STOCKFISH_BASELINE_MULTIPV", "3"))),
)


def positions() -> tuple[str, ...]:
    result: list[str] = []
    for moves in MOVE_LINES:
        board = chess.Board()
        for san in moves:
            board.push_san(san)
        result.append(board.fen())
    return tuple(result)


def run_one(service: StockfishAnalysisService, fen: str) -> dict[str, object]:
    started = perf_counter()
    try:
        service.analyse(
            PositionAnalysisQuery(
                fen,
                depth=default_runtime_config.default_depth,
                multipv=BASELINE_MULTIPV,
            )
        )
        error = None
    except StockfishRuntimeError as exc:
        error = type(exc).__name__
    return {
        "latency_ms": (perf_counter() - started) * 1000,
        "error": error,
    }


def run_batch(concurrency: int) -> dict[str, object]:
    service = StockfishAnalysisService(default_engine_manager)
    service.clear_cache()
    default_engine_manager.metrics.reset()
    fens = positions()[:concurrency]
    with ThreadPoolExecutor(max_workers=concurrency) as pool:
        futures = [pool.submit(run_one, service, fen) for fen in fens]
        results = [future.result() for future in as_completed(futures)]

    latencies = [float(result["latency_ms"]) for result in results]
    errors = [result["error"] for result in results if result["error"]]
    metrics = default_engine_manager.metrics.snapshot()
    return {
        "concurrency": concurrency,
        "depth": default_runtime_config.default_depth,
        "multipv": BASELINE_MULTIPV,
        "median_latency_ms": round(statistics.median(latencies), 3),
        "max_latency_ms": round(max(latencies), 3),
        "queue_wait_duration_ms_total": round(
            metrics.queue_wait_duration_ms,
            3,
        ),
        "engine_execution_duration_ms_total": round(
            metrics.engine_execution_duration_ms,
            3,
        ),
        "timeouts": metrics.timeouts,
        "errors": errors,
    }


def main() -> None:
    with default_engine_manager.session():
        pass
    print(json.dumps([run_batch(size) for size in (1, 4, 10)], indent=2))
    default_engine_manager.shutdown()


if __name__ == "__main__":
    main()
