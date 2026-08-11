"""Compare les petits pools Stockfish sans dependance de monitoring externe."""

import json
import math
import os
import statistics
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from time import perf_counter

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from stockfish_runtime.config import (  # noqa: E402
    StockfishRuntimeConfig,
    default_stockfish_path,
)
from stockfish_runtime.engine_pool import EnginePool  # noqa: E402
from stockfish_runtime.errors import StockfishRuntimeError  # noqa: E402
from stockfish_runtime.service import (  # noqa: E402
    PositionAnalysisQuery,
    StockfishAnalysisService,
)
from scripts.stockfish_load_baseline import positions  # noqa: E402


def stockfish_resources() -> tuple[float, int]:
    if os.name != "nt":
        return 0.0, 0
    command = (
        "$p=Get-Process stockfish -ErrorAction SilentlyContinue; "
        "@{cpu=(($p|Measure-Object CPU -Sum).Sum); "
        "ram=(($p|Measure-Object WorkingSet64 -Sum).Sum)}|ConvertTo-Json -Compress"
    )
    output = subprocess.check_output(
        ["powershell", "-NoProfile", "-Command", command],
        text=True,
    )
    payload = json.loads(output)
    return float(payload.get("cpu") or 0), int(payload.get("ram") or 0)


def percentile(values: list[float], percentile_value: float) -> float:
    index = max(0, math.ceil(len(values) * percentile_value) - 1)
    return sorted(values)[index]


def benchmark(pool_size: int, threads: int, concurrency: int) -> dict[str, object]:
    config = StockfishRuntimeConfig(
        path=default_stockfish_path(),
        pool_size=pool_size,
        max_queue_size=10,
        queue_timeout_seconds=5.0,
        analysis_timeout_seconds=10.0,
        total_timeout_seconds=15.0,
        threads=threads,
        hash_mb=32,
    )
    pool = EnginePool(config)
    service = StockfishAnalysisService(pool)
    with pool.session():
        pass
    cpu_before, _ = stockfish_resources()
    started = perf_counter()

    def run(fen: str) -> tuple[float, str | None]:
        request_started = perf_counter()
        try:
            service.analyse(PositionAnalysisQuery(fen, 15, 3))
            error = None
        except StockfishRuntimeError as exc:
            error = type(exc).__name__
        return (perf_counter() - request_started) * 1000, error

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(run, fen)
            for fen in positions()[:concurrency]
        ]
        results = [future.result() for future in as_completed(futures)]
    wall_seconds = perf_counter() - started
    cpu_after, ram_bytes = stockfish_resources()
    pool.shutdown()
    latencies = [latency for latency, _ in results]
    errors = [error for _, error in results if error]
    snapshot = pool.metrics.snapshot()
    successful = len(results) - len(errors)
    return {
        "pool_size": pool_size,
        "threads_per_engine": threads,
        "hash_mb_per_engine": 32,
        "concurrency": concurrency,
        "median_ms": round(statistics.median(latencies), 3),
        "p95_ms": round(percentile(latencies, 0.95), 3),
        "max_ms": round(max(latencies), 3),
        "throughput_per_second": round(successful / wall_seconds, 3),
        "queue_wait_ms_total": round(snapshot.queue_wait_duration_ms, 3),
        "timeouts": snapshot.timeouts,
        "rejected": snapshot.queue_rejected,
        "cpu_seconds": round(max(0.0, cpu_after - cpu_before), 3),
        "stockfish_ram_mb": round(ram_bytes / 1024 / 1024, 2),
        "errors": errors,
    }


def main() -> None:
    combinations = ((1, 1), (1, 2), (2, 1), (2, 2))
    results = [
        benchmark(pool_size, threads, concurrency)
        for pool_size, threads in combinations
        for concurrency in (1, 4, 10)
    ]
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
