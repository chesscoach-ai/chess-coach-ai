"""Adopte les tables critiques identité, abonnement et bilans.

Revision ID: 0002_core_identity_billing
Revises: 0001_stockfish_cache
"""

from alembic import op


revision = "0002_core_identity_billing"
down_revision = "0001_stockfish_cache"
branch_labels = None
depends_on = None


def upgrade() -> None:
    statements = (
        """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            email VARCHAR(320) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS billing_subscriptions (
            user_id TEXT PRIMARY KEY,
            customer_id TEXT UNIQUE NOT NULL,
            subscription_id TEXT UNIQUE NOT NULL,
            status VARCHAR(30) NOT NULL,
            current_period_end TIMESTAMPTZ,
            cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS analysis_trial_claims (
            user_hash TEXT PRIMARY KEY,
            started_at TIMESTAMPTZ NOT NULL,
            ends_at TIMESTAMPTZ NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS game_review_usage (
            user_id TEXT PRIMARY KEY,
            game_ids JSONB NOT NULL DEFAULT '[]',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
    )
    for statement in statements:
        op.execute(statement)


def downgrade() -> None:
    # Même stratégie que la baseline 0001 : aucune donnée produit n'est
    # supprimée par un rollback d'adoption.
    pass
