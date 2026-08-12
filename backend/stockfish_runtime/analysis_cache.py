"""Cache L2 durable et optionnel des faits Stockfish.

Le cache ne contient que des ``ChessFacts`` sérialisés et aucune donnée
utilisateur. Toute erreur L2 est destinée à être absorbée par le service :
Stockfish reste la source de vérité et le cache n'est qu'une optimisation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import threading
from time import perf_counter
from typing import Any, Callable

import chess

from analysis_contract.facts import CHESS_FACTS_SCHEMA_VERSION


DEFAULT_TTL_DAYS = 30
DEFAULT_MAX_ENTRIES = 5_000
DEFAULT_TOUCH_INTERVAL_SECONDS = 3_600
DEFAULT_CLEANUP_EVERY_WRITES = 100


def _positive_int(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if value > 0 else default


@dataclass(frozen=True, slots=True)
class AnalysisCacheConfig:
    namespace_version: str
    engine_version: str
    analysis_profile_version: str
    ttl_days: int
    max_entries: int
    touch_interval_seconds: int
    cleanup_every_writes: int
    sqlite_path: Path
    database_url: str | None

    @classmethod
    def from_env(cls) -> "AnalysisCacheConfig":
        backend_directory = Path(__file__).resolve().parent.parent
        configured_path = os.getenv("ANALYSIS_CACHE_SQLITE_PATH", "").strip()
        return cls(
            namespace_version=(
                os.getenv("CACHE_NAMESPACE_VERSION", "1").strip() or "1"
            ),
            engine_version=(
                os.getenv("STOCKFISH_CACHE_ENGINE_VERSION", "17").strip()
                or "17"
            ),
            analysis_profile_version=(
                os.getenv("STOCKFISH_ANALYSIS_PROFILE_VERSION", "standard-v1")
                .strip()
                or "standard-v1"
            ),
            ttl_days=_positive_int(
                "ANALYSIS_CACHE_TTL_DAYS",
                DEFAULT_TTL_DAYS,
            ),
            max_entries=_positive_int(
                "ANALYSIS_CACHE_MAX_ENTRIES",
                DEFAULT_MAX_ENTRIES,
            ),
            touch_interval_seconds=_positive_int(
                "ANALYSIS_CACHE_TOUCH_INTERVAL_SECONDS",
                DEFAULT_TOUCH_INTERVAL_SECONDS,
            ),
            cleanup_every_writes=_positive_int(
                "ANALYSIS_CACHE_CLEANUP_EVERY_WRITES",
                DEFAULT_CLEANUP_EVERY_WRITES,
            ),
            sqlite_path=(
                Path(configured_path)
                if configured_path
                else backend_directory
                / ".data"
                / "stockfish-analysis-cache.sqlite3"
            ),
            database_url=os.getenv("DATABASE_URL", "").strip() or None,
        )


@dataclass(frozen=True, slots=True)
class AnalysisCacheIdentity:
    schema_version: str
    fen: str
    depth: int
    multipv: int
    engine_version: str
    analysis_profile_version: str
    namespace_version: str

    def cache_key(self) -> str:
        canonical = json.dumps(
            asdict(self),
            ensure_ascii=True,
            separators=(",", ":"),
            sort_keys=True,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def normalize_fen(fen: str) -> str:
    """Retourne une FEN canonique à six champs, en conservant l'en passant."""

    return chess.Board(fen).fen(en_passant="fen")


def make_cache_identity(
    fen: str,
    depth: int,
    multipv: int,
    config: AnalysisCacheConfig,
) -> AnalysisCacheIdentity:
    return AnalysisCacheIdentity(
        schema_version=CHESS_FACTS_SCHEMA_VERSION,
        fen=normalize_fen(fen),
        depth=depth,
        multipv=multipv,
        engine_version=config.engine_version,
        analysis_profile_version=config.analysis_profile_version,
        namespace_version=config.namespace_version,
    )


@dataclass(frozen=True, slots=True)
class AnalysisCacheEntry:
    identity: AnalysisCacheIdentity
    facts: dict[str, Any]
    created_at: datetime
    last_accessed_at: datetime
    expires_at: datetime
    hit_count: int = 0

    @property
    def cache_key(self) -> str:
        return self.identity.cache_key()


@dataclass(frozen=True, slots=True)
class CacheCleanupResult:
    expired: int = 0
    evicted: int = 0

    @property
    def deleted(self) -> int:
        return self.expired + self.evicted


@dataclass(frozen=True, slots=True)
class AnalysisCacheStatus:
    backend: str
    available: bool
    entries: int = 0
    ttl_days: int = DEFAULT_TTL_DAYS
    max_entries: int = DEFAULT_MAX_ENTRIES
    detail: str | None = None

    def as_dict(self) -> dict[str, str | bool | int | None]:
        return asdict(self)


class AnalysisCacheBackend(ABC):
    """Contrat minimal partagé par SQLite et PostgreSQL."""

    @abstractmethod
    def get(self, cache_key: str) -> AnalysisCacheEntry | None:
        raise NotImplementedError

    @abstractmethod
    def set(self, entry: AnalysisCacheEntry) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete(self, cache_key: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def cleanup(self) -> CacheCleanupResult:
        raise NotImplementedError

    @abstractmethod
    def status(self) -> AnalysisCacheStatus:
        raise NotImplementedError

    def clear(self) -> None:
        """Aide réservée aux tests et opérations de développement."""

    def close(self) -> None:
        """Libère les ressources éventuelles du backend."""


class NullAnalysisCacheBackend(AnalysisCacheBackend):
    def __init__(self, detail: str = "disabled") -> None:
        self.detail = detail

    def get(self, cache_key: str) -> AnalysisCacheEntry | None:
        return None

    def set(self, entry: AnalysisCacheEntry) -> None:
        return None

    def delete(self, cache_key: str) -> None:
        return None

    def cleanup(self) -> CacheCleanupResult:
        return CacheCleanupResult()

    def status(self) -> AnalysisCacheStatus:
        return AnalysisCacheStatus(
            backend="none",
            available=False,
            detail=self.detail,
        )


def _dt(value: str | datetime) -> datetime:
    parsed = datetime.fromisoformat(value) if isinstance(value, str) else value
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def new_cache_entry(
    identity: AnalysisCacheIdentity,
    facts: dict[str, Any],
    ttl_days: int,
    *,
    now: datetime | None = None,
) -> AnalysisCacheEntry:
    current = now or datetime.now(UTC)
    return AnalysisCacheEntry(
        identity=identity,
        facts=facts,
        created_at=current,
        last_accessed_at=current,
        expires_at=current + timedelta(days=ttl_days),
    )


class SQLiteAnalysisCacheBackend(AnalysisCacheBackend):
    def __init__(self, config: AnalysisCacheConfig) -> None:
        self.config = config
        self.path = config.sqlite_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._connection = sqlite3.connect(
            self.path,
            check_same_thread=False,
            timeout=5,
        )
        self._connection.row_factory = sqlite3.Row
        with self._lock:
            self._connection.execute("PRAGMA journal_mode=WAL")
            self._connection.execute("PRAGMA busy_timeout=5000")
            self._create_schema()

    def _create_schema(self) -> None:
        self._connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS stockfish_analysis_cache (
                cache_key TEXT PRIMARY KEY,
                schema_version TEXT NOT NULL,
                fen TEXT NOT NULL,
                depth INTEGER NOT NULL,
                multipv INTEGER NOT NULL,
                engine_profile TEXT NOT NULL,
                engine_version TEXT NOT NULL,
                namespace_version TEXT NOT NULL,
                facts TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_accessed_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                hit_count INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_stockfish_cache_expiry
                ON stockfish_analysis_cache (expires_at);
            CREATE INDEX IF NOT EXISTS idx_stockfish_cache_access
                ON stockfish_analysis_cache (last_accessed_at);
            """
        )
        self._connection.commit()

    def get(self, cache_key: str) -> AnalysisCacheEntry | None:
        now = datetime.now(UTC)
        with self._lock:
            row = self._connection.execute(
                "SELECT * FROM stockfish_analysis_cache WHERE cache_key = ?",
                (cache_key,),
            ).fetchone()
            if row is None:
                return None
            if _dt(row["expires_at"]) <= now:
                self.delete(cache_key)
                return None
            last_accessed = _dt(row["last_accessed_at"])
            if (
                now - last_accessed
            ).total_seconds() >= self.config.touch_interval_seconds:
                self._connection.execute(
                    """
                    UPDATE stockfish_analysis_cache
                    SET last_accessed_at = ?, hit_count = hit_count + 1
                    WHERE cache_key = ?
                    """,
                    (now.isoformat(), cache_key),
                )
                self._connection.commit()
                last_accessed = now
            return self._entry_from_row(row, last_accessed)

    @staticmethod
    def _entry_from_row(
        row: sqlite3.Row,
        last_accessed: datetime,
    ) -> AnalysisCacheEntry:
        return AnalysisCacheEntry(
            identity=AnalysisCacheIdentity(
                schema_version=row["schema_version"],
                fen=row["fen"],
                depth=row["depth"],
                multipv=row["multipv"],
                engine_version=row["engine_version"],
                analysis_profile_version=row["engine_profile"],
                namespace_version=row["namespace_version"],
            ),
            facts=json.loads(row["facts"]),
            created_at=_dt(row["created_at"]),
            last_accessed_at=last_accessed,
            expires_at=_dt(row["expires_at"]),
            hit_count=row["hit_count"],
        )

    def set(self, entry: AnalysisCacheEntry) -> None:
        with self._lock:
            self._connection.execute(
                """
                INSERT INTO stockfish_analysis_cache (
                    cache_key, schema_version, fen, depth, multipv,
                    engine_profile, engine_version, namespace_version, facts,
                    created_at, last_accessed_at, expires_at, hit_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    facts = excluded.facts,
                    created_at = excluded.created_at,
                    last_accessed_at = excluded.last_accessed_at,
                    expires_at = excluded.expires_at,
                    hit_count = 0
                """,
                (
                    entry.cache_key,
                    entry.identity.schema_version,
                    entry.identity.fen,
                    entry.identity.depth,
                    entry.identity.multipv,
                    entry.identity.analysis_profile_version,
                    entry.identity.engine_version,
                    entry.identity.namespace_version,
                    json.dumps(entry.facts, ensure_ascii=False),
                    entry.created_at.isoformat(),
                    entry.last_accessed_at.isoformat(),
                    entry.expires_at.isoformat(),
                    entry.hit_count,
                ),
            )
            self._connection.commit()

    def delete(self, cache_key: str) -> None:
        with self._lock:
            self._connection.execute(
                "DELETE FROM stockfish_analysis_cache WHERE cache_key = ?",
                (cache_key,),
            )
            self._connection.commit()

    def cleanup(self) -> CacheCleanupResult:
        now = datetime.now(UTC).isoformat()
        with self._lock:
            expired = self._connection.execute(
                "DELETE FROM stockfish_analysis_cache WHERE expires_at <= ?",
                (now,),
            ).rowcount
            count = self._connection.execute(
                "SELECT COUNT(*) FROM stockfish_analysis_cache"
            ).fetchone()[0]
            excess = max(0, count - self.config.max_entries)
            evicted = 0
            if excess:
                evicted = self._connection.execute(
                    """
                    DELETE FROM stockfish_analysis_cache
                    WHERE cache_key IN (
                        SELECT cache_key FROM stockfish_analysis_cache
                        ORDER BY last_accessed_at ASC LIMIT ?
                    )
                    """,
                    (excess,),
                ).rowcount
            self._connection.commit()
        return CacheCleanupResult(expired=expired, evicted=evicted)

    def status(self) -> AnalysisCacheStatus:
        started = perf_counter()
        with self._lock:
            entries = self._connection.execute(
                "SELECT COUNT(*) FROM stockfish_analysis_cache"
            ).fetchone()[0]
        return AnalysisCacheStatus(
            backend="sqlite",
            available=True,
            entries=entries,
            ttl_days=self.config.ttl_days,
            max_entries=self.config.max_entries,
            detail=f"{self.path} ({(perf_counter() - started) * 1000:.1f} ms)",
        )

    def clear(self) -> None:
        with self._lock:
            self._connection.execute("DELETE FROM stockfish_analysis_cache")
            self._connection.commit()

    def close(self) -> None:
        with self._lock:
            self._connection.close()


class PostgreSQLAnalysisCacheBackend(AnalysisCacheBackend):
    """Backend PostgreSQL synchrone, dont le schéma est géré par Alembic."""

    def __init__(
        self,
        config: AnalysisCacheConfig,
        connect_factory: Callable[[str], Any] | None = None,
    ) -> None:
        self.config = config
        if not config.database_url:
            raise ValueError("DATABASE_URL is required for PostgreSQL cache")
        if connect_factory is None:
            import psycopg

            connect_factory = psycopg.connect
        self._connect_factory = connect_factory

    def _connect(self):
        return self._connect_factory(self.config.database_url or "")

    def get(self, cache_key: str) -> AnalysisCacheEntry | None:
        now = datetime.now(UTC)
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """SELECT schema_version, fen, depth, multipv,
                engine_profile, engine_version, namespace_version, facts,
                created_at, last_accessed_at, expires_at, hit_count
                FROM stockfish_analysis_cache
                WHERE cache_key = %s AND expires_at > %s""",
                (cache_key, now),
            )
            row = cursor.fetchone()
            if row is None:
                return None
            last_accessed = _dt(row[9])
            if (
                now - last_accessed
            ).total_seconds() >= self.config.touch_interval_seconds:
                cursor.execute(
                    """UPDATE stockfish_analysis_cache
                    SET last_accessed_at = %s, hit_count = hit_count + 1
                    WHERE cache_key = %s""",
                    (now, cache_key),
                )
                last_accessed = now
            facts = row[7]
            if isinstance(facts, str):
                facts = json.loads(facts)
            return AnalysisCacheEntry(
                identity=AnalysisCacheIdentity(
                    schema_version=row[0],
                    fen=row[1],
                    depth=row[2],
                    multipv=row[3],
                    analysis_profile_version=row[4],
                    engine_version=row[5],
                    namespace_version=row[6],
                ),
                facts=facts,
                created_at=_dt(row[8]),
                last_accessed_at=last_accessed,
                expires_at=_dt(row[10]),
                hit_count=row[11],
            )

    def set(self, entry: AnalysisCacheEntry) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO stockfish_analysis_cache (
                    cache_key, schema_version, fen, depth, multipv,
                    engine_profile, engine_version, namespace_version, facts,
                    created_at, last_accessed_at, expires_at, hit_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                    %s::jsonb, %s, %s, %s, %s)
                ON CONFLICT(cache_key) DO UPDATE SET
                    facts = EXCLUDED.facts,
                    created_at = EXCLUDED.created_at,
                    last_accessed_at = EXCLUDED.last_accessed_at,
                    expires_at = EXCLUDED.expires_at,
                    hit_count = 0
                """,
                (
                    entry.cache_key,
                    entry.identity.schema_version,
                    entry.identity.fen,
                    entry.identity.depth,
                    entry.identity.multipv,
                    entry.identity.analysis_profile_version,
                    entry.identity.engine_version,
                    entry.identity.namespace_version,
                    json.dumps(entry.facts, ensure_ascii=False),
                    entry.created_at,
                    entry.last_accessed_at,
                    entry.expires_at,
                    entry.hit_count,
                ),
            )

    def delete(self, cache_key: str) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM stockfish_analysis_cache WHERE cache_key = %s",
                (cache_key,),
            )

    def cleanup(self) -> CacheCleanupResult:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM stockfish_analysis_cache WHERE expires_at <= %s",
                (datetime.now(UTC),),
            )
            expired = cursor.rowcount
            cursor.execute("SELECT COUNT(*) FROM stockfish_analysis_cache")
            excess = max(0, cursor.fetchone()[0] - self.config.max_entries)
            evicted = 0
            if excess:
                cursor.execute(
                    """DELETE FROM stockfish_analysis_cache
                    WHERE cache_key IN (
                        SELECT cache_key FROM stockfish_analysis_cache
                        ORDER BY last_accessed_at ASC LIMIT %s
                    )""",
                    (excess,),
                )
                evicted = cursor.rowcount
        return CacheCleanupResult(expired=expired, evicted=evicted)

    def status(self) -> AnalysisCacheStatus:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM stockfish_analysis_cache")
            entries = cursor.fetchone()[0]
        return AnalysisCacheStatus(
            backend="postgresql",
            available=True,
            entries=entries,
            ttl_days=self.config.ttl_days,
            max_entries=self.config.max_entries,
            detail="DATABASE_URL",
        )

    def clear(self) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute("DELETE FROM stockfish_analysis_cache")


def create_analysis_cache_backend(
    config: AnalysisCacheConfig | None = None,
) -> AnalysisCacheBackend:
    selected = config or AnalysisCacheConfig.from_env()
    if selected.database_url:
        return PostgreSQLAnalysisCacheBackend(selected)
    return SQLiteAnalysisCacheBackend(selected)
