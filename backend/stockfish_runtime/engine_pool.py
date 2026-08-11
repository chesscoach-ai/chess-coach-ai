"""Petit pool configurable de processus Stockfish avec admission bornee."""

import queue
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from time import perf_counter

from .config import StockfishRuntimeConfig, default_runtime_config
from .engine_manager import (
    EngineLease,
    EngineManager,
    RuntimeState,
    default_engine_manager,
)
from .errors import EngineUnavailableError, QueueTimeoutError, ServiceBusyError
from .metrics import RuntimeMetrics


class EnginePool:
    def __init__(
        self,
        config: StockfishRuntimeConfig,
        *,
        managers: list[EngineManager] | None = None,
        metrics: RuntimeMetrics | None = None,
    ) -> None:
        self.config = config
        self.path = config.path
        self.metrics = metrics or RuntimeMetrics()
        self.managers = managers or [
            EngineManager(config.path, config=config, metrics=self.metrics)
            for _ in range(config.pool_size)
        ]
        if not self.managers:
            raise ValueError("EnginePool requires at least one manager")
        self.pool_size = len(self.managers)
        self._idle: queue.Queue[EngineManager] = queue.Queue(self.pool_size)
        for manager in self.managers:
            manager.metrics = self.metrics
            self._idle.put_nowait(manager)
        self._admission = threading.BoundedSemaphore(
            self.pool_size + config.max_queue_size
        )
        self._configure_gauges()

    def _configure_gauges(self) -> None:
        self.metrics.set_value("pool_size", self.pool_size)
        self.metrics.set_value("engines_idle", self._idle.qsize())

    @property
    def state(self) -> RuntimeState:
        states = [manager.state for manager in self.managers]
        if all(state == "unavailable" for state in states):
            return "unavailable"
        if any(state == "calculating" for state in states):
            return "calculating"
        if any(state == "starting" for state in states):
            return "starting"
        if any(state == "engine_crashed" for state in states):
            return "engine_crashed"
        return "ready"

    @property
    def readiness(self) -> RuntimeState:
        """Retourne la readiness sans demarrer ni solliciter un moteur."""

        if not self.path.is_file():
            return "unavailable"
        states = [manager.state for manager in self.managers]
        if any(
            state in {"unavailable", "failed", "engine_crashed"}
            for state in states
        ):
            return "unavailable"
        if all(manager.engine is not None for manager in self.managers):
            return "ready"
        return "starting"

    def warmup(self) -> None:
        """Demarre chaque processus une fois, hors des endpoints de sante."""

        self.ensure_available()
        for manager in self.managers:
            manager.get_engine()

    def ensure_available(self) -> None:
        if not self.path.exists():
            raise EngineUnavailableError(self.path)

    @contextmanager
    def lease(self, queue_timeout: float | None = None) -> Iterator[EngineLease]:
        self.ensure_available()
        self._configure_gauges()
        if not self._admission.acquire(blocking=False):
            self.metrics.increment("queue_rejected")
            raise ServiceBusyError("capacity_exceeded")

        timeout = (
            self.config.queue_timeout_seconds
            if queue_timeout is None
            else max(0.0, queue_timeout)
        )
        started = perf_counter()
        waiting = self._idle.empty()
        if waiting:
            self.metrics.waiting_started()
            self.metrics.increment("queue_size")
        manager: EngineManager | None = None
        try:
            try:
                manager = self._idle.get(timeout=timeout)
            except queue.Empty as error:
                waited_ms = (perf_counter() - started) * 1000
                self.metrics.increment("timeouts")
                self.metrics.increment("queue_timeouts")
                raise QueueTimeoutError("queue_timeout") from error
            finally:
                if waiting:
                    self.metrics.waiting_finished()
                    self.metrics.increment("queue_size", -1)

            acquisition_ms = (perf_counter() - started) * 1000
            self.metrics.observe("queue_wait_duration_ms", acquisition_ms)
            self.metrics.observe("acquisition_duration_ms", acquisition_ms)
            self.metrics.engine_acquired()
            with manager.lease(0.0) as lease:
                yield EngineLease(
                    engine=lease.engine,
                    queue_wait_ms=acquisition_ms,
                    owner=manager,
                )
        finally:
            if manager is not None:
                self._idle.put_nowait(manager)
                self.metrics.engine_released()
            self._admission.release()
            self._configure_gauges()

    @contextmanager
    def session(self, queue_timeout: float | None = None):
        with self.lease(queue_timeout) as lease:
            yield lease.engine

    def shutdown(self) -> None:
        for manager in self.managers:
            manager.shutdown()


default_engine_pool = EnginePool(
    default_runtime_config,
    managers=[
        default_engine_manager,
        *[
            EngineManager(
                default_runtime_config.path,
                config=default_runtime_config,
                metrics=default_engine_manager.metrics,
            )
            for _ in range(default_runtime_config.pool_size - 1)
        ],
    ],
    metrics=default_engine_manager.metrics,
)
