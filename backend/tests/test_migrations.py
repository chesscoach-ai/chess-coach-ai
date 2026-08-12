import os
from contextlib import closing
import inspect
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine

from database.migrations import migration_head, read_migration_status
from stockfish_runtime.analysis_cache import PostgreSQLAnalysisCacheBackend


BACKEND_DIRECTORY = Path(__file__).resolve().parent.parent


class AlembicMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = TemporaryDirectory()
        self.database_path = Path(self.directory.name) / "migration.sqlite3"
        self.url = f"sqlite:///{self.database_path.as_posix()}"
        self.config = Config(str(BACKEND_DIRECTORY / "alembic.ini"))
        self.config.set_main_option("sqlalchemy.url", self.url)

    def tearDown(self) -> None:
        self.directory.cleanup()

    def current_revision(self) -> str | None:
        engine = create_engine(self.url)
        try:
            with engine.connect() as connection:
                return MigrationContext.configure(connection).get_current_revision()
        finally:
            engine.dispose()

    def table_names(self) -> set[str]:
        with closing(sqlite3.connect(self.database_path)) as connection:
            return {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }

    def test_empty_database_upgrades_to_head_with_critical_tables(self) -> None:
        command.upgrade(self.config, "head")

        self.assertEqual(self.current_revision(), migration_head())
        self.assertTrue(
            {
                "alembic_version",
                "stockfish_analysis_cache",
                "users",
                "billing_subscriptions",
                "analysis_trial_claims",
                "game_review_usage",
            }.issubset(self.table_names())
        )
        with closing(sqlite3.connect(self.database_path)) as connection:
            index_rows = list(
                connection.execute("PRAGMA index_list('stockfish_analysis_cache')")
            )
            indexes = {row[1] for row in index_rows}
            user_indexes = list(connection.execute("PRAGMA index_list('users')"))
        self.assertIn("idx_stockfish_cache_expiry", indexes)
        self.assertIn("idx_stockfish_cache_access", indexes)
        self.assertTrue(any(row[2] == 1 for row in user_indexes))

    def test_existing_phase_06_cache_and_data_are_adopted(self) -> None:
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.executescript(
                """
                CREATE TABLE stockfish_analysis_cache (
                    cache_key TEXT PRIMARY KEY,
                    schema_version TEXT NOT NULL,
                    fen TEXT NOT NULL,
                    depth INTEGER NOT NULL,
                    multipv INTEGER NOT NULL,
                    engine_profile TEXT NOT NULL,
                    engine_version TEXT NOT NULL,
                    namespace_version TEXT NOT NULL,
                    facts JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    last_accessed_at TIMESTAMPTZ NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    hit_count BIGINT NOT NULL DEFAULT 0
                );
                INSERT INTO stockfish_analysis_cache VALUES (
                    'kept', '1.0', 'fen', 12, 3, 'standard-v1', '17', '1',
                    '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                    '2099-01-01T00:00:00+00:00', 4
                );
                CREATE TABLE users (
                    id UUID PRIMARY KEY,
                    name VARCHAR(80) NOT NULL,
                    email VARCHAR(320) UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO users (id, name, email, password_hash) VALUES (
                    '00000000-0000-0000-0000-000000000002',
                    'Existing', 'existing@example.test', 'hash'
                );
                """
            )

        command.upgrade(self.config, "head")

        with closing(sqlite3.connect(self.database_path)) as connection:
            row = connection.execute(
                "SELECT cache_key, hit_count FROM stockfish_analysis_cache"
            ).fetchone()
            user_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        self.assertEqual(row, ("kept", 4))
        self.assertEqual(user_count, 1)
        self.assertEqual(self.current_revision(), migration_head())

    def test_upgrade_is_idempotent_and_preserves_user_data(self) -> None:
        command.upgrade(self.config, "head")
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.execute(
                """INSERT INTO users (id, name, email, password_hash)
                VALUES (?, ?, ?, ?)""",
                (
                    "00000000-0000-0000-0000-000000000001",
                    "Ada",
                    "ada@example.test",
                    "hash",
                ),
            )
            connection.commit()

        command.upgrade(self.config, "head")

        with closing(sqlite3.connect(self.database_path)) as connection:
            count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        self.assertEqual(count, 1)
        self.assertEqual(self.current_revision(), migration_head())

    def test_baseline_rollback_is_non_destructive_and_reapplicable(self) -> None:
        command.upgrade(self.config, "head")
        with closing(sqlite3.connect(self.database_path)) as connection:
            connection.execute(
                """INSERT INTO analysis_trial_claims
                (user_hash, started_at, ends_at) VALUES ('kept', 'a', 'b')"""
            )
            connection.commit()

        command.downgrade(self.config, "base")

        self.assertIn("analysis_trial_claims", self.table_names())
        with closing(sqlite3.connect(self.database_path)) as connection:
            count = connection.execute(
                "SELECT COUNT(*) FROM analysis_trial_claims"
            ).fetchone()[0]
        self.assertEqual(count, 1)
        command.upgrade(self.config, "head")
        self.assertEqual(self.current_revision(), migration_head())

    def test_missing_database_url_has_clear_error(self) -> None:
        config = Config(str(BACKEND_DIRECTORY / "alembic.ini"))
        with patch.dict(os.environ, {}, clear=True), self.assertRaisesRegex(
            Exception,
            "DATABASE_URL",
        ):
            command.current(config)

    def test_adopted_modules_no_longer_create_tables_implicitly(self) -> None:
        self.assertNotIn(
            "CREATE TABLE",
            inspect.getsource(PostgreSQLAnalysisCacheBackend),
        )
        adopted_sources = (
            BACKEND_DIRECTORY.parent / "frontend" / "lib" / "auth" / "userStore.ts",
            BACKEND_DIRECTORY.parent
            / "frontend"
            / "lib"
            / "billing"
            / "subscriptionStore.ts",
            BACKEND_DIRECTORY.parent
            / "frontend"
            / "lib"
            / "billing"
            / "gameReviewStore.ts",
        )
        for source in adopted_sources:
            with self.subTest(source=source.name):
                self.assertNotIn("CREATE TABLE", source.read_text(encoding="utf-8"))


class FakeStatusCursor:
    def __init__(self, values) -> None:
        self.values = iter(values)

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, _query) -> None:
        pass

    def fetchone(self):
        return (next(self.values),)


class FakeStatusConnection:
    def __init__(self, values) -> None:
        self.values = values

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return FakeStatusCursor(self.values)


class MigrationStatusTests(unittest.TestCase):
    def test_local_mode_does_not_require_postgresql(self) -> None:
        status = read_migration_status("")
        self.assertFalse(status.database_url_detected)
        self.assertEqual(status.status, "not_required")

    def test_postgresql_status_reports_current_head_and_cache(self) -> None:
        head = migration_head()
        status = read_migration_status(
            "postgresql://masked",
            connect_factory=lambda _url: FakeStatusConnection(
                ["alembic_version", head, "stockfish_analysis_cache"]
            ),
        )
        self.assertEqual(status.status, "up_to_date")
        self.assertEqual(status.current_version, head)
        self.assertTrue(status.cache_table_present)


if __name__ == "__main__":
    unittest.main()
