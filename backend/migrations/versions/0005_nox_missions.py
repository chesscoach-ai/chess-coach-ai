"""Ajoute les missions pédagogiques personnalisées de Nox.

Revision ID: 0005_nox_missions
Revises: 0004_nox_progression
"""
from alembic import op

revision = "0005_nox_missions"
down_revision = "0004_nox_progression"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS nox_missions (
            id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            mission JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_nox_missions_user_updated ON nox_missions (user_id, updated_at)")

def downgrade() -> None:
    # Les résultats pédagogiques ne sont jamais supprimés implicitement.
    pass
