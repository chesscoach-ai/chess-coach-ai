"""Benchmark prudent d'une instance Render deja deployee.

Variables requises :
    STOCKFISH_BENCHMARK_URL=https://...onrender.com
    BACKEND_API_SECRET=...
"""

import json
import math
import os
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import perf_counter
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = os.environ.get("STOCKFISH_BENCHMARK_URL", "").rstrip("/")
API_SECRET = os.environ.get("BACKEND_API_SECRET", "")
TIMEOUT_SECONDS = 30


def request_json(
    path: str,
    *,
    payload: dict[str, object] | None = None,
) -> tuple[int, dict[str, object], float]:
    headers = {"Accept": "application/json"}
    data = None
    if API_SECRET:
        headers["X-Backend-Api-Secret"] = API_SECRET
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    request = Request(
        f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method="POST" if payload is not None else "GET",
    )
    started = perf_counter()
    try:
        with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            body = json.loads(response.read().decode("utf-8"))
            return response.status, body, (perf_counter() - started) * 1000
    except HTTPError as error:
        body = json.loads(error.read().decode("utf-8"))
        return error.code, body, (perf_counter() - started) * 1000
    except URLError as error:
        return 0, {"error": str(error.reason)}, (perf_counter() - started) * 1000


def unique_fen(index: int) -> str:
    return f"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - {index} {index + 1}"


def percentile(values: list[float], percentile_value: float) -> float:
    index = max(0, math.ceil(len(values) * percentile_value) - 1)
    return sorted(values)[index]


def metric_delta(
    before: dict[str, object],
    after: dict[str, object],
    name: str,
) -> float:
    return float(after.get(name, 0)) - float(before.get(name, 0))


def run_analysis(index: int) -> dict[str, object]:
    status, body, latency_ms = request_json(
        "/analysis",
        payload={"fen": unique_fen(index), "depth": 15, "multipv": 3},
    )
    return {
        "status": status,
        "latency_ms": latency_ms,
        "error": None if status == 200 else body,
    }


def run_batch(concurrency: int, offset: int) -> dict[str, object]:
    _, metrics_before, _ = request_json("/runtime/metrics")
    started = perf_counter()
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(run_analysis, offset + index)
            for index in range(concurrency)
        ]
        results = [future.result() for future in as_completed(futures)]
    wall_seconds = perf_counter() - started
    _, metrics_after, _ = request_json("/runtime/metrics")
    latencies = [float(result["latency_ms"]) for result in results]
    successes = sum(result["status"] == 200 for result in results)
    return {
        "concurrency": concurrency,
        "median_ms": round(statistics.median(latencies), 3),
        "p95_ms": round(percentile(latencies, 0.95), 3),
        "maximum_ms": round(max(latencies), 3),
        "throughput_per_second": round(successes / wall_seconds, 3),
        "queue_wait_ms_total": round(
            metric_delta(metrics_before, metrics_after, "queue_wait_duration_ms"),
            3,
        ),
        "engine_duration_ms_total": round(
            metric_delta(
                metrics_before,
                metrics_after,
                "engine_execution_duration_ms",
            ),
            3,
        ),
        "timeouts": int(metric_delta(metrics_before, metrics_after, "timeouts")),
        "crashes": int(
            metric_delta(metrics_before, metrics_after, "engine_crashes")
        ),
        "rejected": int(
            metric_delta(metrics_before, metrics_after, "queue_rejected")
        ),
        "statuses": [result["status"] for result in results],
        "errors": [result["error"] for result in results if result["error"]],
    }


def main() -> None:
    if not BASE_URL:
        raise SystemExit("STOCKFISH_BENCHMARK_URL est requis.")
    health_status, health, health_ms = request_json("/health")
    ready_status, ready, ready_ms = request_json("/ready")
    cold_analysis = run_analysis(100)
    result = {
        "cold_start": {
            "health_status": health_status,
            "health_ms": round(health_ms, 3),
            "health": health,
            "ready_status": ready_status,
            "ready_ms": round(ready_ms, 3),
            "ready": ready,
            "first_analysis": cold_analysis,
        },
        "batches": [
            run_batch(1, 200),
            run_batch(4, 300),
            run_batch(10, 400),
        ],
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
