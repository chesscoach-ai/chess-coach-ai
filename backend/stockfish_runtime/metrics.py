"""Instrumentation interne legere et exportable du runtime."""

import threading
from dataclasses import asdict, dataclass
from time import perf_counter


@dataclass(frozen=True, slots=True)
class RuntimeMetricsSnapshot:
    total_analyses: int
    cache_hits: int
    l1_cache_hits: int
    l2_cache_hits: int
    cache_misses: int
    l2_cache_reads: int
    l2_cache_writes: int
    l2_read_failures: int
    l2_write_failures: int
    l2_invalid_payloads: int
    l2_cleanup_count: int
    l2_cache_evictions: int
    l2_read_duration_ms: float
    l2_write_duration_ms: float
    waiting_requests: int
    max_waiting_requests: int
    queue_wait_duration_ms: float
    engine_execution_duration_ms: float
    total_request_duration_ms: float
    timeouts: int
    queue_timeouts: int
    analysis_timeouts: int
    engine_crashes: int
    engine_starts: int
    restarts: int
    retries: int
    failures: int
    pool_size: int
    engines_busy: int
    engines_idle: int
    max_engines_busy: int
    queue_size: int
    queue_rejected: int
    acquisition_duration_ms: float
    measurement_window_seconds: float
    analyses_per_second: float

    def as_dict(self) -> dict[str, int | float]:
        return asdict(self)


class RuntimeMetrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._started_at = perf_counter()
            self._values: dict[str, int | float] = {
                "total_analyses": 0,
                "cache_hits": 0,
                "l1_cache_hits": 0,
                "l2_cache_hits": 0,
                "cache_misses": 0,
                "l2_cache_reads": 0,
                "l2_cache_writes": 0,
                "l2_read_failures": 0,
                "l2_write_failures": 0,
                "l2_invalid_payloads": 0,
                "l2_cleanup_count": 0,
                "l2_cache_evictions": 0,
                "l2_read_duration_ms": 0.0,
                "l2_write_duration_ms": 0.0,
                "waiting_requests": 0,
                "max_waiting_requests": 0,
                "queue_wait_duration_ms": 0.0,
                "engine_execution_duration_ms": 0.0,
                "total_request_duration_ms": 0.0,
                "timeouts": 0,
                "queue_timeouts": 0,
                "analysis_timeouts": 0,
                "engine_crashes": 0,
                "engine_starts": 0,
                "restarts": 0,
                "retries": 0,
                "failures": 0,
                "pool_size": 1,
                "engines_busy": 0,
                "engines_idle": 1,
                "max_engines_busy": 0,
                "queue_size": 0,
                "queue_rejected": 0,
                "acquisition_duration_ms": 0.0,
            }

    def increment(self, name: str, amount: int = 1) -> None:
        with self._lock:
            self._values[name] = int(self._values[name]) + amount

    def observe(self, name: str, duration_ms: float) -> None:
        with self._lock:
            self._values[name] = float(self._values[name]) + max(
                0.0,
                duration_ms,
            )

    def set_value(self, name: str, value: int | float) -> None:
        with self._lock:
            self._values[name] = value

    def engine_acquired(self) -> None:
        with self._lock:
            busy = int(self._values["engines_busy"]) + 1
            self._values["engines_busy"] = busy
            self._values["engines_idle"] = max(
                0,
                int(self._values["pool_size"]) - busy,
            )
            self._values["max_engines_busy"] = max(
                int(self._values["max_engines_busy"]),
                busy,
            )

    def engine_released(self) -> None:
        with self._lock:
            busy = max(0, int(self._values["engines_busy"]) - 1)
            self._values["engines_busy"] = busy
            self._values["engines_idle"] = max(
                0,
                int(self._values["pool_size"]) - busy,
            )

    def waiting_started(self) -> None:
        with self._lock:
            waiting = int(self._values["waiting_requests"]) + 1
            self._values["waiting_requests"] = waiting
            self._values["max_waiting_requests"] = max(
                int(self._values["max_waiting_requests"]),
                waiting,
            )

    def waiting_finished(self) -> None:
        with self._lock:
            self._values["waiting_requests"] = max(
                0,
                int(self._values["waiting_requests"]) - 1,
            )

    def snapshot(self) -> RuntimeMetricsSnapshot:
        with self._lock:
            window = max(0.000001, perf_counter() - self._started_at)
            return RuntimeMetricsSnapshot(
                **self._values,
                measurement_window_seconds=window,
                analyses_per_second=(
                    int(self._values["total_analyses"]) / window
                ),
            )
