"""Cycle de vie, file d'attente et etats du processus Stockfish."""

import json
import logging
import threading
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Literal

import chess.engine

from .config import StockfishRuntimeConfig, default_runtime_config
from .errors import (
    AnalysisFailedError,
    EngineUnavailableError,
    QueueTimeoutError,
)
from .metrics import RuntimeMetrics


RuntimeState = Literal[
    "queued",
    "starting",
    "calculating",
    "ready",
    "timeout",
    "engine_crashed",
    "unavailable",
    "failed",
]
EngineFactory = Callable[[str], chess.engine.SimpleEngine]
logger = logging.getLogger("stockfish.runtime")


def _runtime_log(event: str, *, level: int = logging.INFO, **fields: object) -> None:
    logger.log(level, json.dumps({"event": event, **fields}, sort_keys=True))


@dataclass(frozen=True, slots=True)
class EngineLease:
    engine: chess.engine.SimpleEngine
    queue_wait_ms: float
    owner: "EngineManager"


class EngineManager:
    """Possede l'unique processus et un verrou global borne et mesure."""

    def __init__(
        self,
        path: Path,
        *,
        hash_mb: int = 64,
        threads: int = 1,
        engine_factory: EngineFactory = chess.engine.SimpleEngine.popen_uci,
        config: StockfishRuntimeConfig | None = None,
        metrics: RuntimeMetrics | None = None,
    ) -> None:
        self.config = config or StockfishRuntimeConfig(
            path=path,
            hash_mb=hash_mb,
            threads=threads,
        )
        self.path = path
        self.hash_mb = hash_mb if config is None else self.config.hash_mb
        self.threads = threads if config is None else self.config.threads
        self.lock = threading.RLock()
        self.metrics = metrics or RuntimeMetrics()
        self._engine_factory = engine_factory
        self._engine: chess.engine.SimpleEngine | None = None
        self._state: RuntimeState = (
            "ready" if self.path.exists() else "unavailable"
        )
        self._ever_started = False

    @property
    def state(self) -> RuntimeState:
        if not self.path.exists():
            return "unavailable"
        return self._state

    @property
    def engine(self) -> chess.engine.SimpleEngine | None:
        return self._engine

    def ensure_available(self) -> None:
        if not self.path.exists():
            self._state = "unavailable"
            raise EngineUnavailableError(self.path)

    def get_engine(self) -> chess.engine.SimpleEngine:
        with self.lock:
            return self._get_engine_locked()

    def _get_engine_locked(self) -> chess.engine.SimpleEngine:
        self.ensure_available()
        if self._engine is not None:
            return self._engine

        self._state = "starting"
        is_restart = self._ever_started
        try:
            engine = self._engine_factory(str(self.path))
            engine.configure({"Hash": self.hash_mb, "Threads": self.threads})
            if hasattr(engine, "timeout"):
                engine.timeout = self.config.protocol_timeout_grace_seconds
        except (chess.engine.EngineError, OSError) as error:
            self._state = "failed"
            self.metrics.increment("failures")
            _runtime_log(
                "engine_start_failed",
                level=logging.ERROR,
                error_type=type(error).__name__,
            )
            raise AnalysisFailedError("engine_start_failed") from error

        self._engine = engine
        self._ever_started = True
        self.metrics.increment("engine_starts")
        if is_restart:
            self.metrics.increment("restarts")
        self._state = "ready"
        _runtime_log("engine_restart" if is_restart else "engine_start")
        return engine

    @contextmanager
    def lease(self, queue_timeout: float | None = None) -> Iterator[EngineLease]:
        timeout = (
            self.config.queue_timeout_seconds
            if queue_timeout is None
            else max(0.0, queue_timeout)
        )
        wait_started = perf_counter()
        acquired = self.lock.acquire(blocking=False)
        was_waiting = not acquired
        if was_waiting:
            self.metrics.waiting_started()
            if self._state != "calculating":
                self._state = "queued"
            acquired = self.lock.acquire(timeout=timeout)
            self.metrics.waiting_finished()

        queue_wait_ms = (perf_counter() - wait_started) * 1000
        self.metrics.observe("queue_wait_duration_ms", queue_wait_ms)
        if not acquired:
            self._state = "timeout"
            self.metrics.increment("timeouts")
            self.metrics.increment("queue_timeouts")
            _runtime_log(
                "queue_timeout",
                level=logging.WARNING,
                queue_wait_ms=round(queue_wait_ms, 3),
            )
            raise QueueTimeoutError("queue_timeout")

        try:
            engine = self._get_engine_locked()
            self._state = "calculating"
            try:
                yield EngineLease(
                    engine=engine,
                    queue_wait_ms=queue_wait_ms,
                    owner=self,
                )
            except chess.engine.EngineTerminatedError:
                self._state = "engine_crashed"
                self.metrics.increment("engine_crashes")
                _runtime_log("engine_crash", level=logging.ERROR)
                self._shutdown_locked(log_event=False)
                raise
            else:
                self._state = "ready"
        finally:
            if self._state == "calculating":
                self._state = "ready"
            self.lock.release()

    @contextmanager
    def session(
        self,
        queue_timeout: float | None = None,
    ) -> Iterator[chess.engine.SimpleEngine]:
        """Compatibilite pour les appels de cycle de vie et la route sante."""

        with self.lease(queue_timeout) as lease:
            yield lease.engine

    def invalidate(self, state: RuntimeState = "failed") -> None:
        with self.lock:
            self._state = state
            self._shutdown_locked(log_event=False)

    def shutdown(self) -> None:
        with self.lock:
            self._shutdown_locked(log_event=True)

    def _shutdown_locked(self, *, log_event: bool) -> None:
        engine = self._engine
        self._engine = None
        if engine is None:
            if self.path.exists() and self._state not in {
                "timeout",
                "engine_crashed",
                "failed",
            }:
                self._state = "ready"
            return
        try:
            engine.quit()
        except (chess.engine.EngineError, OSError):
            pass
        if log_event:
            _runtime_log("engine_stop")
        if self._state not in {"timeout", "engine_crashed", "failed"}:
            self._state = "ready"


default_engine_manager = EngineManager(
    default_runtime_config.path,
    config=default_runtime_config,
)
