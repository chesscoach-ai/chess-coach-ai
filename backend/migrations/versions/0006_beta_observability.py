"""Ajoute l'observabilité minimale de la bêta privée.

Revision ID: 0006_beta_observability
Revises: 0005_nox_missions
"""
from alembic import op

revision = "0006_beta_observability"
down_revision = "0005_nox_missions"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS beta_events (
            id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL, event_name TEXT NOT NULL,
            page TEXT NOT NULL, platform TEXT NOT NULL, app_version TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_beta_events_visitor_created ON beta_events (visitor_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_beta_events_name_created ON beta_events (event_name, created_at)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS beta_feedback (
            id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL, liked TEXT NOT NULL,
            friction TEXT NOT NULL, nox_helped BOOLEAN, rating SMALLINT NOT NULL,
            comment TEXT NOT NULL, page TEXT NOT NULL, platform TEXT NOT NULL,
            app_version TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS beta_bug_reports (
            id TEXT PRIMARY KEY, visitor_id TEXT NOT NULL, comment TEXT NOT NULL,
            page TEXT NOT NULL, platform TEXT NOT NULL, browser TEXT NOT NULL,
            app_version TEXT NOT NULL, app_state TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

def downgrade() -> None:
    # Les retours de bêta ne sont jamais supprimés implicitement.
    pass
