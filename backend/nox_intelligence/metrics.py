"""Métriques agrégées Nox AI sans stocker les contenus utilisateur."""

from collections import deque
from dataclasses import asdict, dataclass
import threading

from .config import NoxAiConfig


@dataclass(frozen=True, slots=True)
class NoxMetricsSnapshot:
    requests_total: int
    deterministic_responses: int
    ai_requests: int
    ai_success: int
    ai_failures: int
    fallbacks: int
    cache_hits: int
    validation_failures: int
    input_tokens: int
    output_tokens: int
    total_latency_ms: float
    average_latency_ms: float
    estimated_cost: float
    recent_errors: tuple[str, ...]

    def as_dict(self) -> dict[str, int | float | tuple[str, ...]]:
        return asdict(self)


class NoxMetrics:
    def __init__(self, config: NoxAiConfig) -> None:
        self.config = config
        self._lock = threading.Lock()
        self.reset()

    def reset(self) -> None:
        with self._lock:
            self._values = {
                "requests_total": 0,
                "deterministic_responses": 0,
                "ai_requests": 0,
                "ai_success": 0,
                "ai_failures": 0,
                "fallbacks": 0,
                "cache_hits": 0,
                "validation_failures": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "total_latency_ms": 0.0,
            }
            self._recent_errors: deque[str] = deque(maxlen=8)

    def increment(self, name: str, amount: int = 1) -> None:
        with self._lock:
            self._values[name] = int(self._values[name]) + amount

    def record_ai_success(
        self, *, latency_ms: float, input_tokens: int, output_tokens: int
    ) -> None:
        with self._lock:
            self._values["ai_success"] += 1
            self._values["total_latency_ms"] += max(0.0, latency_ms)
            self._values["input_tokens"] += max(0, input_tokens)
            self._values["output_tokens"] += max(0, output_tokens)

    def record_error(self, category: str) -> None:
        with self._lock:
            self._values["ai_failures"] += 1
            self._recent_errors.append(category[:80])

    def snapshot(self) -> NoxMetricsSnapshot:
        with self._lock:
            ai_success = int(self._values["ai_success"])
            input_tokens = int(self._values["input_tokens"])
            output_tokens = int(self._values["output_tokens"])
            estimated_cost = (
                input_tokens * self.config.input_cost_per_million
                + output_tokens * self.config.output_cost_per_million
            ) / 1_000_000
            return NoxMetricsSnapshot(
                **self._values,
                average_latency_ms=(
                    float(self._values["total_latency_ms"]) / ai_success
                    if ai_success
                    else 0.0
                ),
                estimated_cost=round(estimated_cost, 8),
                recent_errors=tuple(self._recent_errors),
            )
