import dataclasses
from datetime import UTC, datetime, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
import threading
import unittest

from analysis_contract.builders import build_chess_facts_from_proposals
from analysis_contract.facts import (
    EvaluationFacts,
    MoveFacts,
    PrincipalVariationFacts,
)
from stockfish_runtime.analysis_cache import (
    AnalysisCacheBackend,
    AnalysisCacheConfig,
    AnalysisCacheStatus,
    CacheCleanupResult,
    PostgreSQLAnalysisCacheBackend,
    SQLiteAnalysisCacheBackend,
    make_cache_identity,
    new_cache_entry,
)
from stockfish_runtime.executor import RuntimeExecution
from stockfish_runtime.metrics import RuntimeMetrics
from stockfish_runtime.service import (
    PositionAnalysisQuery,
    StockfishAnalysisService,
    make_analysis_cache_key,
)
from tests.reference_positions import INITIAL_POSITION


def cache_config(path: Path, **changes) -> AnalysisCacheConfig:
    values = {
        "namespace_version": "1",
        "engine_version": "17",
        "analysis_profile_version": "standard-v1",
        "ttl_days": 30,
        "max_entries": 5_000,
        "touch_interval_seconds": 3_600,
        "cleanup_every_writes": 100,
        "sqlite_path": path,
        "database_url": None,
    }
    values.update(changes)
    return AnalysisCacheConfig(**values)


def sample_facts():
    evaluation = EvaluationFacts(
        value=0.2,
        type="centipawn",
        perspective="white",
    )
    proposal = MoveFacts(
        rank=1,
        uci="e2e4",
        san="e4",
        piece_type="pion",
        piece_color="white",
        from_square="e2",
        to_square="e4",
        is_capture=False,
        gives_check=False,
        gives_checkmate=False,
        is_castling=False,
        is_promotion=False,
        evaluation=evaluation,
        depth=8,
        principal_variation=PrincipalVariationFacts(
            san=("e4",),
            uci=("e2e4",),
        ),
    )
    return build_chess_facts_from_proposals(
        fen=INITIAL_POSITION,
        requested_depth=8,
        requested_multipv=1,
        proposals=(proposal,),
        calculation_time_ms=12,
    )


class FakeManager:
    def __init__(self) -> None:
        self.metrics = RuntimeMetrics()
        self.ensure_calls = 0

    def ensure_available(self) -> None:
        self.ensure_calls += 1


class StaticExecutor:
    def __init__(self, facts) -> None:
        self.facts = facts
        self.calls = 0

    def execute(self, _operation):
        self.calls += 1
        return RuntimeExecution(
            value=self.facts,
            queue_wait_ms=0,
            engine_execution_ms=12,
            total_duration_ms=12,
            attempts=1,
        )


class FailingBackend(AnalysisCacheBackend):
    def get(self, cache_key):
        raise OSError("offline")

    def set(self, entry):
        raise OSError("offline")

    def delete(self, cache_key):
        raise OSError("offline")

    def cleanup(self):
        raise OSError("offline")

    def status(self):
        return AnalysisCacheStatus("test", False)


class AnalysisCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = TemporaryDirectory()
        self.path = Path(self.directory.name) / "analysis.sqlite3"
        self.config = cache_config(self.path)
        self.query = PositionAnalysisQuery(INITIAL_POSITION, 8, 1)
        self.facts = sample_facts()

    def tearDown(self) -> None:
        self.directory.cleanup()

    def build_service(self, backend, executor=None):
        manager = FakeManager()
        selected_executor = executor or StaticExecutor(self.facts)
        return (
            StockfishAnalysisService(
                manager,
                cache_backend=backend,
                cache_config=self.config,
                executor=selected_executor,
            ),
            manager,
            selected_executor,
        )

    def test_cold_write_then_l1_hit(self) -> None:
        backend = SQLiteAnalysisCacheBackend(self.config)
        service, manager, executor = self.build_service(backend)

        first = service.analyse(self.query)
        second = service.analyse(self.query)

        self.assertEqual(first.metadata.cache_status, "miss")
        self.assertEqual(second.metadata.cache_status, "hit")
        self.assertEqual(executor.calls, 1)
        self.assertEqual(manager.metrics.snapshot().l1_cache_hits, 1)
        self.assertEqual(backend.status().entries, 1)
        backend.close()

    def test_restart_reads_l2_without_stockfish_pool(self) -> None:
        backend = SQLiteAnalysisCacheBackend(self.config)
        writer, _, _ = self.build_service(backend)
        writer.analyse(self.query)
        backend.close()

        restarted = SQLiteAnalysisCacheBackend(self.config)
        service, manager, executor = self.build_service(restarted)
        result = service.analyse(self.query)

        self.assertEqual(result.metadata.cache_status, "hit")
        self.assertEqual(executor.calls, 0)
        self.assertEqual(manager.ensure_calls, 0)
        self.assertEqual(manager.metrics.snapshot().l2_cache_hits, 1)
        restarted.close()

    def test_invalid_payload_is_deleted_and_recomputed(self) -> None:
        backend = SQLiteAnalysisCacheBackend(self.config)
        identity = make_cache_identity(
            self.query.fen,
            self.query.depth,
            self.query.multipv,
            self.config,
        )
        backend.set(new_cache_entry(identity, {"invalid": True}, 30))
        service, manager, executor = self.build_service(backend)

        result = service.analyse(self.query)

        self.assertEqual(result.metadata.cache_status, "miss")
        self.assertEqual(executor.calls, 1)
        self.assertEqual(manager.metrics.snapshot().l2_invalid_payloads, 1)
        backend.close()

    def test_expired_entry_is_not_returned(self) -> None:
        backend = SQLiteAnalysisCacheBackend(self.config)
        identity = make_cache_identity(INITIAL_POSITION, 8, 1, self.config)
        entry = new_cache_entry(identity, self.facts.model_dump(mode="json"), 30)
        entry = dataclasses.replace(
            entry,
            expires_at=datetime.now(UTC) - timedelta(seconds=1),
        )
        backend.set(entry)

        self.assertIsNone(backend.get(entry.cache_key))
        self.assertEqual(backend.status().entries, 0)
        backend.close()

    def test_namespace_and_profile_are_part_of_deterministic_key(self) -> None:
        same = make_analysis_cache_key(
            "  " + INITIAL_POSITION + "  ",
            8,
            1,
            self.config,
        )
        canonical = make_analysis_cache_key(INITIAL_POSITION, 8, 1, self.config)
        other_namespace = make_analysis_cache_key(
            INITIAL_POSITION,
            8,
            1,
            dataclasses.replace(self.config, namespace_version="2"),
        )
        other_profile = make_analysis_cache_key(
            INITIAL_POSITION,
            8,
            1,
            dataclasses.replace(self.config, analysis_profile_version="v2"),
        )
        other_engine = make_analysis_cache_key(
            INITIAL_POSITION,
            8,
            1,
            dataclasses.replace(self.config, engine_version="18"),
        )

        self.assertEqual(same, canonical)
        self.assertNotEqual(canonical, other_namespace)
        self.assertNotEqual(canonical, other_profile)
        self.assertNotEqual(canonical, other_engine)

    def test_cleanup_evicts_least_recent_entries(self) -> None:
        config = dataclasses.replace(self.config, max_entries=2)
        backend = SQLiteAnalysisCacheBackend(config)
        for depth in (6, 7, 8):
            identity = make_cache_identity(INITIAL_POSITION, depth, 1, config)
            backend.set(
                new_cache_entry(
                    identity,
                    self.facts.model_dump(mode="json"),
                    30,
                    now=datetime.now(UTC) + timedelta(seconds=depth),
                )
            )

        cleanup = backend.cleanup()

        self.assertEqual(cleanup.evicted, 1)
        self.assertEqual(backend.status().entries, 2)
        backend.close()

    def test_l2_unavailable_never_blocks_stockfish_result(self) -> None:
        service, manager, executor = self.build_service(FailingBackend())

        result = service.analyse(self.query)

        self.assertEqual(result.proposals[0].uci, "e2e4")
        self.assertEqual(executor.calls, 1)
        snapshot = manager.metrics.snapshot()
        self.assertEqual(snapshot.l2_read_failures, 1)
        self.assertEqual(snapshot.l2_write_failures, 1)

    def test_sqlite_accepts_concurrent_reads_and_writes(self) -> None:
        backend = SQLiteAnalysisCacheBackend(self.config)
        failures = []

        def write_and_read(depth: int) -> None:
            try:
                identity = make_cache_identity(INITIAL_POSITION, depth, 1, self.config)
                entry = new_cache_entry(
                    identity,
                    self.facts.model_dump(mode="json"),
                    30,
                )
                backend.set(entry)
                self.assertIsNotNone(backend.get(entry.cache_key))
            except Exception as error:
                failures.append(error)

        threads = [
            threading.Thread(target=write_and_read, args=(depth,))
            for depth in range(6, 16)
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(failures, [])
        self.assertEqual(backend.status().entries, 10)
        backend.close()


class FakeCursor:
    def __init__(self, statements) -> None:
        self.statements = statements
        self.rowcount = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, statement, parameters=None):
        self.statements.append((statement, parameters))


class FakeConnection:
    def __init__(self, statements) -> None:
        self.statements = statements

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return FakeCursor(self.statements)


class PostgreSQLCacheContractTests(unittest.TestCase):
    def test_postgresql_backend_never_creates_schema_implicitly(self) -> None:
        statements = []
        with TemporaryDirectory() as directory:
            config = cache_config(
                Path(directory) / "unused.sqlite3",
                database_url="postgresql://test",
            )
            backend = PostgreSQLAnalysisCacheBackend(
                config,
                connect_factory=lambda _url: FakeConnection(statements),
            )
            self.assertEqual(statements, [])
            identity = make_cache_identity(INITIAL_POSITION, 8, 1, config)
            backend.set(
                new_cache_entry(
                    identity,
                    sample_facts().model_dump(mode="json"),
                    30,
                )
            )

        sql = " ".join(statement for statement, _ in statements)
        self.assertIn("stockfish_analysis_cache", sql)
        self.assertIn("ON CONFLICT(cache_key)", sql)
        self.assertNotIn("CREATE TABLE", sql)


if __name__ == "__main__":
    unittest.main()
