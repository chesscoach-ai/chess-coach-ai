"""Lecture non sensible de l'état Alembic pour le diagnostic DEV."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import os
from pathlib import Path
from typing import Any, Callable

from alembic.config import Config
from alembic.script import ScriptDirectory


@dataclass(frozen=True, slots=True)
class MigrationStatus:
    database_url_detected: bool
    backend: str
    status: str
    current_version: str | None
    head_version: str
    cache_table_present: bool | None
    detail: str | None = None

    def as_dict(self) -> dict[str, str | bool | None]:
        return asdict(self)


def migration_head() -> str:
    backend_directory = Path(__file__).resolve().parent.parent
    config = Config(str(backend_directory / "alembic.ini"))
    return ScriptDirectory.from_config(config).get_current_head()


def read_migration_status(
    database_url: str | None = None,
    *,
    connect_factory: Callable[[str], Any] | None = None,
) -> MigrationStatus:
    selected_url = (
        database_url
        if database_url is not None
        else os.getenv("DATABASE_URL", "").strip()
    )
    head = migration_head()
    if not selected_url:
        return MigrationStatus(
            database_url_detected=False,
            backend="sqlite-local",
            status="not_required",
            current_version=None,
            head_version=head,
            cache_table_present=None,
            detail="Le développement local ne nécessite pas PostgreSQL.",
        )

    if connect_factory is None:
        import psycopg

        connect_factory = psycopg.connect

    try:
        with connect_factory(selected_url) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT to_regclass('public.alembic_version')"
                )
                version_table = cursor.fetchone()[0]
                current = None
                if version_table:
                    cursor.execute("SELECT version_num FROM alembic_version")
                    row = cursor.fetchone()
                    current = row[0] if row else None
                cursor.execute(
                    "SELECT to_regclass('public.stockfish_analysis_cache')"
                )
                cache_table = cursor.fetchone()[0]
        return MigrationStatus(
            database_url_detected=True,
            backend="postgresql",
            status="up_to_date" if current == head else "pending",
            current_version=current,
            head_version=head,
            cache_table_present=bool(cache_table),
            detail=None,
        )
    except Exception as error:
        return MigrationStatus(
            database_url_detected=True,
            backend="postgresql",
            status="unavailable",
            current_version=None,
            head_version=head,
            cache_table_present=None,
            detail=type(error).__name__,
        )
