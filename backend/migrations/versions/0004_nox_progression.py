"""Conserve uniquement le plus haut rang atteint par Nox et ses évolutions.

Revision ID: 0004_nox_progression
Revises: 0003_nox_pedagogical_memory
"""

from alembic import op


revision = "0004_nox_progression"
down_revision = "0003_nox_pedagogical_memory"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS nox_progression (
            user_id TEXT PRIMARY KEY,
            highest_rank VARCHAR(40) NOT NULL DEFAULT 'squire',
            last_rank_change TIMESTAMPTZ,
            milestones JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )


def downgrade() -> None:
    # Les rangs acquis ne sont jamais supprimés par un rollback applicatif.
    pass
