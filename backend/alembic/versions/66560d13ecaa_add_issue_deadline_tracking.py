"""add issue deadline tracking

Revision ID: 66560d13ecaa
Revises: 053ea50057e5
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "66560d13ecaa"
down_revision: Union[str, Sequence[str], None] = "053ea50057e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add created_at as nullable first so existing issues can be backfilled.
    op.add_column(
        "issues",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Existing issues receive the current database timestamp.
    op.execute("UPDATE issues SET created_at = now() WHERE created_at IS NULL")

    # Require a timestamp for all issues and default new issues to now().
    op.alter_column(
        "issues",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )

    op.add_column(
        "issues",
        sa.Column("estimated_duration_days", sa.Integer(), nullable=True),
    )
    op.add_column(
        "issues",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("issues", "completed_at")
    op.drop_column("issues", "estimated_duration_days")
    op.drop_column("issues", "created_at")
