"""Cache SQLite local des réponses Nox, indexé sans donnée personnelle."""

from datetime import UTC, datetime, timedelta
import hashlib
import json
import sqlite3
import threading

from .config import NoxAiConfig
from .models import NoxContext, NoxResponse


def make_nox_cache_key(
    context: NoxContext,
    *,
    model: str,
    prompt_version: str,
) -> str:
    canonical = json.dumps(
        {
            "context": context.model_dump(mode="json"),
            "model": model,
            "prompt_version": prompt_version,
        },
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class NoxResponseCache:
    def get(self, key: str) -> NoxResponse | None:
        raise NotImplementedError

    def set(self, key: str, response: NoxResponse) -> None:
        raise NotImplementedError

    def status(self) -> dict[str, str | int | bool]:
        raise NotImplementedError

    def close(self) -> None:
        return None


class MemoryNoxResponseCache(NoxResponseCache):
    def __init__(self) -> None:
        self.values: dict[str, NoxResponse] = {}

    def get(self, key: str) -> NoxResponse | None:
        return self.values.get(key)

    def set(self, key: str, response: NoxResponse) -> None:
        self.values[key] = response

    def status(self) -> dict[str, str | int | bool]:
        return {"backend": "memory", "available": True, "entries": len(self.values)}


class SQLiteNoxResponseCache(NoxResponseCache):
    def __init__(self, config: NoxAiConfig) -> None:
        self.config = config
        config.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._connection = sqlite3.connect(
            config.cache_path, check_same_thread=False, timeout=5
        )
        with self._lock:
            self._connection.execute("PRAGMA journal_mode=WAL")
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS nox_response_cache (
                    cache_key TEXT PRIMARY KEY,
                    response_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL
                )
                """
            )
            self._connection.commit()

    def get(self, key: str) -> NoxResponse | None:
        now = datetime.now(UTC)
        with self._lock:
            row = self._connection.execute(
                "SELECT response_json, expires_at FROM nox_response_cache WHERE cache_key = ?",
                (key,),
            ).fetchone()
            if row is None:
                return None
            if datetime.fromisoformat(row[1]) <= now:
                self._connection.execute(
                    "DELETE FROM nox_response_cache WHERE cache_key = ?", (key,)
                )
                self._connection.commit()
                return None
            try:
                return NoxResponse.model_validate_json(row[0])
            except ValueError:
                self._connection.execute(
                    "DELETE FROM nox_response_cache WHERE cache_key = ?", (key,)
                )
                self._connection.commit()
                return None

    def set(self, key: str, response: NoxResponse) -> None:
        now = datetime.now(UTC)
        expires_at = now + timedelta(days=self.config.cache_ttl_days)
        with self._lock:
            self._connection.execute(
                """
                INSERT INTO nox_response_cache (
                    cache_key, response_json, created_at, expires_at
                ) VALUES (?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    response_json = excluded.response_json,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at
                """,
                (key, response.model_dump_json(), now.isoformat(), expires_at.isoformat()),
            )
            self._connection.execute(
                """
                DELETE FROM nox_response_cache WHERE cache_key IN (
                    SELECT cache_key FROM nox_response_cache
                    ORDER BY created_at ASC
                    LIMIT MAX(0, (SELECT COUNT(*) FROM nox_response_cache) - ?)
                )
                """,
                (self.config.cache_max_entries,),
            )
            self._connection.commit()

    def status(self) -> dict[str, str | int | bool]:
        with self._lock:
            count = self._connection.execute(
                "SELECT COUNT(*) FROM nox_response_cache"
            ).fetchone()[0]
        return {"backend": "sqlite", "available": True, "entries": count}

    def close(self) -> None:
        with self._lock:
            self._connection.close()
