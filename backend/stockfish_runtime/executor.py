"""Execution bornee et retry controle communs aux services Stockfish."""

import logging
from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter
from typing import Generic, TypeVar

import chess.engine

from .engine_manager import EngineManager, _runtime_log
from .errors import (
    AnalysisFailedError,
    AnalysisTimeoutError,
    EngineCrashedError,
    QueueTimeoutError,
)


T = TypeVar("T")


class AnalysisBudget:
    """Budget monotone partage par tous les appels d'une operation."""

    def __init__(self, deadline: float) -> None:
        self.deadline = deadline
        self.engine_execution_ms = 0.0

    def remaining_seconds(self) -> float:
        remaining = self.deadline - perf_counter()
        if remaining <= 0:
            raise AnalysisTimeoutError("analysis_timeout")
        return remaining

    def run(self, operation: Callable[[float], T]) -> T:
        remaining = self.remaining_seconds()
        started = perf_counter()
        try:
            result = operation(remaining)
        finally:
            self.engine_execution_ms += (perf_counter() - started) * 1000
        if perf_counter() > self.deadline:
            raise AnalysisTimeoutError("analysis_timeout")
        return result


@dataclass(frozen=True, slots=True)
class RuntimeExecution(Generic[T]):
    value: T
    queue_wait_ms: float
    engine_execution_ms: float
    total_duration_ms: float
    attempts: int


RuntimeOperation = Callable[[chess.engine.SimpleEngine, AnalysisBudget], T]


class RuntimeExecutor:
    def __init__(self, manager: EngineManager) -> None:
        self.manager = manager

    def execute(self, operation: RuntimeOperation[T]) -> RuntimeExecution[T]:
        config = self.manager.config
        request_started = perf_counter()
        total_deadline = request_started + config.total_timeout_seconds
        queue_wait_ms = 0.0
        engine_execution_ms = 0.0

        for attempt in range(config.max_retries + 1):
            remaining_total = total_deadline - perf_counter()
            if remaining_total <= 0:
                self._record_analysis_timeout(request_started)
                raise AnalysisTimeoutError("total_timeout")

            try:
                with self.manager.lease(
                    min(config.queue_timeout_seconds, remaining_total)
                ) as lease:
                    queue_wait_ms += lease.queue_wait_ms
                    remaining_total = total_deadline - perf_counter()
                    if remaining_total <= 0:
                        raise AnalysisTimeoutError("total_timeout")
                    budget = AnalysisBudget(
                        perf_counter()
                        + min(config.analysis_timeout_seconds, remaining_total)
                    )
                    try:
                        value = operation(lease.engine, budget)
                    finally:
                        engine_execution_ms += budget.engine_execution_ms
                        self.manager.metrics.observe(
                            "engine_execution_duration_ms",
                            budget.engine_execution_ms,
                        )

                total_duration_ms = (perf_counter() - request_started) * 1000
                self.manager.metrics.observe(
                    "total_request_duration_ms",
                    total_duration_ms,
                )
                if total_duration_ms >= config.slow_operation_seconds * 1000:
                    _runtime_log(
                        "slow_operation",
                        level=logging.WARNING,
                        total_duration_ms=round(total_duration_ms, 3),
                        queue_wait_ms=round(queue_wait_ms, 3),
                        engine_execution_ms=round(engine_execution_ms, 3),
                    )
                return RuntimeExecution(
                    value=value,
                    queue_wait_ms=queue_wait_ms,
                    engine_execution_ms=engine_execution_ms,
                    total_duration_ms=total_duration_ms,
                    attempts=attempt + 1,
                )
            except QueueTimeoutError:
                self.manager.metrics.increment("failures")
                self.manager.metrics.observe(
                    "total_request_duration_ms",
                    (perf_counter() - request_started) * 1000,
                )
                raise
            except (AnalysisTimeoutError, TimeoutError) as error:
                lease.owner.invalidate("timeout")
                self._record_analysis_timeout(request_started)
                raise AnalysisTimeoutError("analysis_timeout") from error
            except chess.engine.EngineTerminatedError as error:
                if (
                    attempt < config.max_retries
                    and perf_counter() < total_deadline
                ):
                    self.manager.metrics.increment("retries")
                    _runtime_log("engine_retry", attempt=attempt + 1)
                    continue
                self.manager.metrics.increment("failures")
                self.manager.metrics.observe(
                    "total_request_duration_ms",
                    (perf_counter() - request_started) * 1000,
                )
                raise EngineCrashedError("engine_recovery_failed") from error
            except chess.engine.EngineError as error:
                self.manager.metrics.increment("failures")
                self.manager.metrics.observe(
                    "total_request_duration_ms",
                    (perf_counter() - request_started) * 1000,
                )
                raise AnalysisFailedError(str(error)) from error
            except AnalysisFailedError:
                self.manager.metrics.observe(
                    "total_request_duration_ms",
                    (perf_counter() - request_started) * 1000,
                )
                raise

        raise EngineCrashedError("engine_recovery_failed")

    def _record_analysis_timeout(self, request_started: float) -> None:
        self.manager.metrics.increment("timeouts")
        self.manager.metrics.increment("analysis_timeouts")
        self.manager.metrics.increment("failures")
        total_duration_ms = (perf_counter() - request_started) * 1000
        self.manager.metrics.observe(
            "total_request_duration_ms",
            total_duration_ms,
        )
        _runtime_log(
            "analysis_timeout",
            level=logging.WARNING,
            total_duration_ms=round(total_duration_ms, 3),
        )
