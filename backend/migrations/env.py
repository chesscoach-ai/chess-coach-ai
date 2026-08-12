"""Configuration Alembic centralisée pour la base produit PostgreSQL."""

from logging.config import fileConfig
import os

from alembic import context
from sqlalchemy import engine_from_config, pool


config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def database_url() -> str:
    configured = os.getenv("DATABASE_URL", "").strip()
    fallback = config.get_main_option("sqlalchemy.url").strip()
    selected = configured or fallback
    if not selected:
        raise RuntimeError(
            "DATABASE_URL est absente. Aucune migration PostgreSQL n'a été exécutée."
        )
    if selected.startswith("postgres://"):
        selected = "postgresql+psycopg://" + selected.removeprefix("postgres://")
    elif selected.startswith("postgresql://"):
        selected = "postgresql+psycopg://" + selected.removeprefix("postgresql://")
    return selected


def run_migrations_offline() -> None:
    context.configure(
        url=database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = database_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
