"""Ajoute la mémoire pédagogique structurée de Nox.

Revision ID: 0003_nox_pedagogical_memory
Revises: 0002_core_identity_billing
"""

from alembic import op


revision = "0003_nox_pedagogical_memory"
down_revision = "0002_core_identity_billing"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS nox_profiles (
            user_id TEXT PRIMARY KEY,
            profile JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS nox_learning_events (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            event_type VARCHAR(40) NOT NULL,
            concept_id VARCHAR(60) NOT NULL,
            outcome VARCHAR(20) NOT NULL,
            source_id VARCHAR(160) NOT NULL,
            occurred_at TIMESTAMPTZ NOT NULL,
            UNIQUE (user_id, source_id)
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_nox_learning_events_user_occurred
        ON nox_learning_events (user_id, occurred_at)
        """
    )


def downgrade() -> None:
    # La mémoire pédagogique appartient à l’utilisateur : un rollback
    # applicatif ne doit pas la supprimer implicitement.
    pass

