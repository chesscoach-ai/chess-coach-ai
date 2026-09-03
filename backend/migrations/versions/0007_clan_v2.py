"""Versionne le socle social minimal de Clan V2.

Revision ID: 0007_clan_v2
Revises: 0006_beta_observability
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_clan_v2"
down_revision = "0006_beta_observability"
branch_labels = None
depends_on = None


def _columns(table: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if table not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table)}


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS community_profiles (
            player_id TEXT PRIMARY KEY,
            avatar_id VARCHAR(40) NOT NULL DEFAULT 'iron-squire',
            share_progress BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    if "share_progress" not in _columns("community_profiles"):
        op.add_column(
            "community_profiles",
            sa.Column("share_progress", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    op.execute("""
        CREATE TABLE IF NOT EXISTS community_friendships (
            player_a TEXT NOT NULL,
            player_b TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (player_a, player_b),
            CHECK (player_a < player_b)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS community_clans (
            id UUID PRIMARY KEY,
            name VARCHAR(60) NOT NULL,
            tag VARCHAR(8) UNIQUE NOT NULL,
            owner_id TEXT NOT NULL,
            invite_code VARCHAR(16),
            invite_rotated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    if "invite_code" not in _columns("community_clans"):
        op.add_column("community_clans", sa.Column("invite_code", sa.String(16), nullable=True))
    if "invite_rotated_at" not in _columns("community_clans"):
        op.add_column(
            "community_clans",
            sa.Column("invite_rotated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.execute("UPDATE community_clans SET invite_rotated_at = CURRENT_TIMESTAMP WHERE invite_rotated_at IS NULL")
        if op.get_bind().dialect.name == "postgresql":
            op.alter_column("community_clans", "invite_rotated_at", nullable=False, server_default=sa.func.current_timestamp())
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_community_clans_invite_code ON community_clans (invite_code)")
    op.execute("""
        CREATE TABLE IF NOT EXISTS community_clan_members (
            clan_id UUID NOT NULL REFERENCES community_clans(id) ON DELETE CASCADE,
            player_id TEXT UNIQUE NOT NULL,
            joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (clan_id, player_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_community_clan_members_clan ON community_clan_members (clan_id, joined_at)")


def downgrade() -> None:
    # Les liens sociaux et préférences de confidentialité ne sont jamais supprimés implicitement.
    pass
