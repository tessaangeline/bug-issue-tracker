"""add missing project columns

Revision ID: 053ea50057e5
Revises: bbc549029f0c
Create Date: 2026-10-16 05:05:52.269312

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '053ea50057e5'
down_revision: Union[str, Sequence[str], None] = 'bbc549029f0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing columns to the projects table."""
    op.add_column(
        "projects",
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column(
            "member_ids",
            sa.ARRAY(sa.Integer()),
            nullable=False,
            server_default=sa.text("'{}'::integer[]"),
        ),
    )


def downgrade() -> None:
    """Remove the columns added by this migration."""
    op.drop_column("projects", "member_ids")
    op.drop_column("projects", "description")
