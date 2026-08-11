import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import Mock

import chess
import chess.engine

from stockfish_runtime.config import StockfishRuntimeConfig
from stockfish_runtime.engine_manager import EngineManager
from stockfish_runtime.engine_pool import EnginePool
from stockfish_runtime.errors import ServiceBusyError
from stockfish_runtime.metrics import RuntimeMetrics
from stockfish_runtime.service import PositionAnalysisQuery, StockfishAnalysisService
from tests.reference_positions import INITIAL_POSITION


class PoolEngine:
    def __init__(self, analyse) -> None:
        self._analyse = analyse
        self.timeout = 1.0
        self.quit_calls = 0

    def configure(self, _options) -> None:
        pass

    def analyse(self, *args, **kwargs):
        return self._analyse(*args, **kwargs)

    def quit(self) -> None:
        self.quit_calls += 1


def result(*_args, **_kwargs):
    return {
        "pv": [chess.Move.from_uci("e2e4")],
        "score": chess.engine.PovScore(chess.engine.Cp(20), chess.WHITE),
        "depth": 6,
    }


class EnginePoolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = TemporaryDirectory()
        self.path = Path(self.directory.name) / "stockfish"
        self.path.touch()

    def tearDown(self) -> None:
        self.directory.cleanup()

    def build_pool(
        self,
        engines: list[PoolEngine],
        *,
        max_queue: int = 2,
        queue_timeout: float = 0.2,
    ) -> tuple[EnginePool, list[Mock]]:
        metrics = RuntimeMetrics()
        config = StockfishRuntimeConfig(
            path=self.path,
            pool_size=len(engines),
            max_queue_size=max_queue,
            queue_timeout_seconds=queue_timeout,
            analysis_timeout_seconds=0.5,
            total_timeout_seconds=1.0,
        )
        factories = [Mock(return_value=engine) for engine in engines]
        managers = [
            EngineManager(
                self.path,
                config=config,
                metrics=metrics,
                engine_factory=factory,
            )
            for factory in factories
        ]
        return EnginePool(config, managers=managers, metrics=metrics), factories

    def test_pool_size_one_and_two(self) -> None:
        for size in (1, 2):
            with self.subTest(size=size):
                pool, _ = self.build_pool([PoolEngine(result) for _ in range(size)])
                self.assertEqual(pool.pool_size, size)
                self.assertEqual(pool.metrics.snapshot().pool_size, size)
                self.assertEqual(pool.metrics.snapshot().engines_idle, size)

    def test_acquisition_and_release_restore_idle_capacity(self) -> None:
        pool, _ = self.build_pool([PoolEngine(result), PoolEngine(result)])
        with pool.lease() as lease:
            self.assertIsNotNone(lease.engine)
            self.assertEqual(pool.metrics.snapshot().engines_busy, 1)
        snapshot = pool.metrics.snapshot()
        self.assertEqual(snapshot.engines_busy, 0)
        self.assertEqual(snapshot.engines_idle, 2)

    def test_two_analyses_really_run_in_parallel(self) -> None:
        barrier = threading.Barrier(2)
        active = 0
        max_active = 0
        active_lock = threading.Lock()

        def parallel_result(*_args, **_kwargs):
            nonlocal active, max_active
            with active_lock:
                active += 1
                max_active = max(max_active, active)
            barrier.wait(timeout=1)
            time.sleep(0.02)
            with active_lock:
                active -= 1
            return result()

        pool, _ = self.build_pool(
            [PoolEngine(parallel_result), PoolEngine(parallel_result)]
        )
        service = StockfishAnalysisService(pool)
        query = PositionAnalysisQuery(INITIAL_POSITION, 6, 1)
        with ThreadPoolExecutor(max_workers=2) as executor:
            responses = list(executor.map(lambda _: service.analyse(query), range(2)))

        self.assertEqual(len(responses), 2)
        self.assertEqual(max_active, 2)
        self.assertEqual(pool.metrics.snapshot().max_engines_busy, 2)

    def test_crashed_engine_is_replaced_without_destroying_pool(self) -> None:
        def crash(*_args, **_kwargs):
            raise chess.engine.EngineTerminatedError("crashed")

        recovered = PoolEngine(result)
        metrics = RuntimeMetrics()
        config = StockfishRuntimeConfig(
            path=self.path,
            pool_size=1,
            max_queue_size=1,
            queue_timeout_seconds=0.1,
            analysis_timeout_seconds=0.2,
            total_timeout_seconds=0.5,
        )
        factory = Mock(side_effect=[PoolEngine(crash), recovered])
        manager = EngineManager(
            self.path,
            config=config,
            metrics=metrics,
            engine_factory=factory,
        )
        pool = EnginePool(config, managers=[manager], metrics=metrics)
        service = StockfishAnalysisService(pool)

        facts = service.analyse(PositionAnalysisQuery(INITIAL_POSITION, 6, 1))

        self.assertEqual(facts.proposals[0].uci, "e2e4")
        self.assertEqual(factory.call_count, 2)
        self.assertEqual(pool.metrics.snapshot().restarts, 1)
        self.assertEqual(pool.metrics.snapshot().engines_idle, 1)

    def test_saturated_admission_is_rejected_immediately(self) -> None:
        pool, _ = self.build_pool(
            [PoolEngine(result)],
            max_queue=1,
            queue_timeout=0.5,
        )
        active = pool.lease()
        active.__enter__()
        waiter_started = threading.Event()
        waiter_release = threading.Event()

        def wait_for_engine() -> None:
            waiter_started.set()
            with pool.lease():
                waiter_release.wait(timeout=1)

        waiter = threading.Thread(target=wait_for_engine)
        waiter.start()
        waiter_started.wait(timeout=1)
        time.sleep(0.02)
        try:
            with self.assertRaises(ServiceBusyError):
                with pool.lease():
                    pass
        finally:
            active.__exit__(None, None, None)
            waiter_release.set()
            waiter.join(timeout=1)

        self.assertEqual(pool.metrics.snapshot().queue_rejected, 1)
        self.assertEqual(pool.metrics.snapshot().engines_idle, 1)

    def test_exception_never_loses_an_engine_and_shutdown_closes_all(self) -> None:
        engines = [PoolEngine(result), PoolEngine(result)]
        pool, _ = self.build_pool(engines)
        with self.assertRaises(ValueError):
            with pool.lease():
                raise ValueError("consumer failed")
        self.assertEqual(pool.metrics.snapshot().engines_idle, 2)

        with pool.lease():
            pass
        with pool.lease():
            pass
        pool.shutdown()
        self.assertTrue(all(engine.quit_calls == 1 for engine in engines))

    def test_cache_is_shared_independently_of_selected_engine(self) -> None:
        calls = 0

        def counted(*_args, **_kwargs):
            nonlocal calls
            calls += 1
            return result()

        pool, _ = self.build_pool([PoolEngine(counted), PoolEngine(counted)])
        service = StockfishAnalysisService(pool)
        query = PositionAnalysisQuery(INITIAL_POSITION, 6, 1)
        service.analyse(query)
        service.analyse(query)

        self.assertEqual(calls, 1)
        snapshot = pool.metrics.snapshot()
        self.assertEqual(snapshot.cache_hits, 1)
        self.assertEqual(snapshot.cache_misses, 1)


if __name__ == "__main__":
    unittest.main()
