import os
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock, patch

import chess
import chess.engine

from stockfish_runtime.config import StockfishRuntimeConfig, default_stockfish_path
from stockfish_runtime.engine_manager import EngineManager
from stockfish_runtime.errors import (
    AnalysisTimeoutError,
    EngineCrashedError,
    InvalidPositionError,
    QueueTimeoutError,
)
from stockfish_runtime.move_review import MoveReviewQuery, MoveReviewService
from stockfish_runtime.service import (
    PositionAnalysisQuery,
    StockfishAnalysisService,
)
from tests.reference_positions import CAPTURE_POSITION, INITIAL_POSITION


class FakeEngine:
    def __init__(self, analyse) -> None:
        self._analyse = analyse
        self.timeout = 10.0
        self.configure_calls: list[dict[str, int]] = []
        self.quit_calls = 0

    def configure(self, options: dict[str, int]) -> None:
        self.configure_calls.append(options)

    def analyse(self, *args, **kwargs):
        return self._analyse(*args, **kwargs)

    def quit(self) -> None:
        self.quit_calls += 1


def legal_initial_result(*_args, **_kwargs):
    return {
        "pv": [chess.Move.from_uci("e2e4")],
        "score": chess.engine.PovScore(chess.engine.Cp(20), chess.WHITE),
        "depth": 6,
    }


class RuntimeReliabilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = TemporaryDirectory()
        self.binary = Path(self.directory.name) / "stockfish"
        self.binary.touch()

    def tearDown(self) -> None:
        self.directory.cleanup()

    def manager(
        self,
        engines: list[FakeEngine],
        *,
        queue_timeout: float = 0.1,
        analysis_timeout: float = 0.2,
        total_timeout: float = 0.4,
        retries: int = 1,
    ) -> tuple[EngineManager, Mock]:
        config = StockfishRuntimeConfig(
            path=self.binary,
            queue_timeout_seconds=queue_timeout,
            analysis_timeout_seconds=analysis_timeout,
            total_timeout_seconds=total_timeout,
            max_retries=retries,
            slow_operation_seconds=5.0,
        )
        factory = Mock(side_effect=engines)
        return (
            EngineManager(
                self.binary,
                config=config,
                engine_factory=factory,
            ),
            factory,
        )

    def query(self) -> PositionAnalysisQuery:
        return PositionAnalysisQuery(INITIAL_POSITION, depth=6, multipv=1)

    def test_runtime_timeouts_and_retry_are_configurable(self) -> None:
        with patch.dict(
            os.environ,
            {
                "STOCKFISH_PATH": str(self.binary),
                "STOCKFISH_QUEUE_TIMEOUT": "1.25",
                "STOCKFISH_ANALYSIS_TIMEOUT": "4.5",
                "STOCKFISH_TOTAL_TIMEOUT": "5.0",
                "STOCKFISH_MAX_RETRIES": "9",
            },
        ):
            config = StockfishRuntimeConfig.from_env()

        self.assertEqual(config.queue_timeout_seconds, 1.25)
        self.assertEqual(config.analysis_timeout_seconds, 4.5)
        self.assertEqual(config.total_timeout_seconds, 5.0)
        self.assertEqual(config.max_retries, 1)

    def test_explicit_stockfish_path_has_priority(self) -> None:
        with patch.dict(os.environ, {"STOCKFISH_PATH": str(self.binary)}):
            with patch("stockfish_runtime.config.shutil.which") as which:
                self.assertEqual(default_stockfish_path(), self.binary)
        which.assert_not_called()

    def test_system_stockfish_is_discovered_without_hardcoded_linux_path(self) -> None:
        system_binary = Path(self.directory.name) / "system-stockfish"
        with patch.dict(os.environ, {}, clear=True):
            with patch("stockfish_runtime.config.Path.is_file", return_value=False):
                with patch(
                    "stockfish_runtime.config.shutil.which",
                    return_value=str(system_binary),
                ):
                    self.assertEqual(default_stockfish_path(), system_binary)

    def test_queue_timeout_is_bounded_and_measured(self) -> None:
        manager, _ = self.manager(
            [FakeEngine(legal_initial_result)],
            queue_timeout=0.01,
        )
        service = StockfishAnalysisService(manager)
        locked = threading.Event()
        release = threading.Event()

        def hold_engine_lock() -> None:
            with manager.lock:
                locked.set()
                release.wait(timeout=1)

        holder = threading.Thread(target=hold_engine_lock)
        holder.start()
        locked.wait(timeout=1)
        try:
            with self.assertRaises(QueueTimeoutError):
                service.analyse(self.query())
        finally:
            release.set()
            holder.join(timeout=1)

        metrics = manager.metrics.snapshot()
        self.assertEqual(metrics.queue_timeouts, 1)
        self.assertEqual(metrics.timeouts, 1)
        self.assertGreater(metrics.queue_wait_duration_ms, 0)

    def test_analysis_timeout_is_bounded_and_measured(self) -> None:
        def slow_result(*_args, **_kwargs):
            time.sleep(0.02)
            return legal_initial_result()

        manager, _ = self.manager(
            [FakeEngine(slow_result)],
            analysis_timeout=0.005,
            total_timeout=0.05,
        )
        service = StockfishAnalysisService(manager)

        with self.assertRaises(AnalysisTimeoutError):
            service.analyse(self.query())

        metrics = manager.metrics.snapshot()
        self.assertEqual(metrics.analysis_timeouts, 1)
        self.assertEqual(metrics.timeouts, 1)
        self.assertEqual(metrics.retries, 0)
        self.assertEqual(manager.state, "timeout")

    def test_crash_restarts_once_and_retry_succeeds(self) -> None:
        def crash(*_args, **_kwargs):
            raise chess.engine.EngineTerminatedError("crashed")

        manager, factory = self.manager(
            [FakeEngine(crash), FakeEngine(legal_initial_result)]
        )
        service = StockfishAnalysisService(manager)

        facts = service.analyse(self.query())

        self.assertEqual(facts.proposals[0].uci, "e2e4")
        self.assertEqual(factory.call_count, 2)
        metrics = manager.metrics.snapshot()
        self.assertEqual(metrics.engine_crashes, 1)
        self.assertEqual(metrics.retries, 1)
        self.assertEqual(metrics.restarts, 1)

    def test_crash_retry_failure_has_no_loop(self) -> None:
        def crash(*_args, **_kwargs):
            raise chess.engine.EngineTerminatedError("crashed")

        manager, factory = self.manager(
            [FakeEngine(crash), FakeEngine(crash)]
        )
        service = StockfishAnalysisService(manager)

        with self.assertRaises(EngineCrashedError):
            service.analyse(self.query())

        self.assertEqual(factory.call_count, 2)
        metrics = manager.metrics.snapshot()
        self.assertEqual(metrics.engine_crashes, 2)
        self.assertEqual(metrics.retries, 1)
        self.assertEqual(metrics.failures, 1)

    def test_crash_does_not_retry_after_total_budget_is_consumed(self) -> None:
        def slow_crash(*_args, **_kwargs):
            time.sleep(0.02)
            raise chess.engine.EngineTerminatedError("late crash")

        manager, factory = self.manager(
            [FakeEngine(slow_crash), FakeEngine(legal_initial_result)],
            analysis_timeout=0.05,
            total_timeout=0.005,
        )
        service = StockfishAnalysisService(manager)

        with self.assertRaises(EngineCrashedError):
            service.analyse(self.query())

        self.assertEqual(factory.call_count, 1)
        self.assertEqual(manager.metrics.snapshot().retries, 0)

    def test_invalid_fen_never_retries_or_starts_engine(self) -> None:
        manager, factory = self.manager([FakeEngine(legal_initial_result)])
        service = StockfishAnalysisService(manager)

        with self.assertRaises(InvalidPositionError):
            service.analyse(PositionAnalysisQuery("invalid", 6, 1))

        self.assertEqual(factory.call_count, 0)
        self.assertEqual(manager.metrics.snapshot().retries, 0)

    def test_cache_hit_does_not_wait_for_or_call_engine(self) -> None:
        engine = FakeEngine(legal_initial_result)
        manager, _ = self.manager([engine])
        service = StockfishAnalysisService(manager)
        first = service.analyse(self.query())
        first_wait = manager.metrics.snapshot().queue_wait_duration_ms
        locked = threading.Event()
        release = threading.Event()

        def hold_engine_lock() -> None:
            with manager.lock:
                locked.set()
                release.wait(timeout=1)

        holder = threading.Thread(target=hold_engine_lock)
        holder.start()
        locked.wait(timeout=1)
        try:
            started = time.perf_counter()
            second = service.analyse(self.query())
            elapsed = time.perf_counter() - started
        finally:
            release.set()
            holder.join(timeout=1)

        self.assertEqual(first, second.model_copy(update={"metadata": first.metadata}))
        self.assertLess(elapsed, 0.05)
        metrics = manager.metrics.snapshot()
        self.assertEqual(metrics.cache_hits, 1)
        self.assertEqual(metrics.cache_misses, 1)
        self.assertEqual(metrics.queue_wait_duration_ms, first_wait)

    def test_four_concurrent_requests_measure_wait_without_timeout(self) -> None:
        def slow_result(*_args, **_kwargs):
            time.sleep(0.015)
            return legal_initial_result()

        engine = FakeEngine(slow_result)
        manager, _ = self.manager(
            [engine],
            queue_timeout=0.3,
            analysis_timeout=0.1,
            total_timeout=0.4,
        )
        service = StockfishAnalysisService(manager)

        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(lambda _: service.analyse(self.query()), range(4)))

        self.assertEqual(len(results), 4)
        metrics = manager.metrics.snapshot()
        self.assertEqual(metrics.timeouts, 0)
        self.assertGreaterEqual(metrics.max_waiting_requests, 1)
        self.assertGreater(metrics.queue_wait_duration_ms, 0)
        self.assertGreater(metrics.engine_execution_duration_ms, 0)
        self.assertGreater(metrics.total_request_duration_ms, 0)

    def test_move_review_uses_the_same_analysis_timeout(self) -> None:
        def slow_result(*_args, **_kwargs):
            time.sleep(0.02)
            return legal_initial_result()

        manager, _ = self.manager(
            [FakeEngine(slow_result)],
            analysis_timeout=0.005,
            total_timeout=0.05,
        )
        service = MoveReviewService(manager)

        with self.assertRaises(AnalysisTimeoutError):
            service.review(MoveReviewQuery(CAPTURE_POSITION, "e4d5", 6))

    def test_move_review_uses_the_same_crash_retry(self) -> None:
        def crash(*_args, **_kwargs):
            raise chess.engine.EngineTerminatedError("crashed")

        call_count = 0

        def review_results(board, *_args, **_kwargs):
            nonlocal call_count
            call_count += 1
            score = chess.engine.PovScore(chess.engine.Cp(20), board.turn)
            if call_count == 1:
                move = chess.Move.from_uci("e4d5")
                return {"pv": [move], "score": score, "depth": 6}
            return {"score": score, "depth": 6}

        manager, factory = self.manager(
            [FakeEngine(crash), FakeEngine(review_results)]
        )
        service = MoveReviewService(manager)

        result = service.review(MoveReviewQuery(CAPTURE_POSITION, "e4d5", 6))

        self.assertEqual(result.played_move_san, "exd5")
        self.assertEqual(factory.call_count, 2)
        self.assertEqual(manager.metrics.snapshot().retries, 1)


if __name__ == "__main__":
    unittest.main()
