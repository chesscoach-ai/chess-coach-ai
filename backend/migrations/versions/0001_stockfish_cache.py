"""Adopte le cache Stockfish créé pendant la phase 0.6.

Revision ID: 0001_stockfish_cache
Revises: None
"""

from alembic import op


revision = "0001_stockfish_cache"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS adopte sans perte une table 0.6 déjà présente.
    op.execute(
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
            facts JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL,
            last_accessed_at TIMESTAMPTZ NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            hit_count BIGINT NOT NULL DEFAULT 0
        )
        """
    )
    op.execute(
        """CREATE INDEX IF NOT EXISTS idx_stockfish_cache_expiry
        ON stockfish_analysis_cache (expires_at)"""
    )
    op.execute(
        """CREATE INDEX IF NOT EXISTS idx_stockfish_cache_access
        ON stockfish_analysis_cache (last_accessed_at)"""
    )


def downgrade() -> None:
    # Baseline d'adoption volontairement non destructive : Alembic revient à
    # la révision précédente, mais les analyses existantes sont conservées.
    pass
