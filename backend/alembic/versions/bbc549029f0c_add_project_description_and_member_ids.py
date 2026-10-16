"""add project description and member ids

Revision ID: bbc549029f0c
Revises: 6f1d4cafe0f8
Create Date: 2026-10-16 04:44:45.406342

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbc549029f0c'
down_revision: Union[str, Sequence[str], None] = '6f1d4cafe0f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    op.drop_column("projects", "member_ids")
    op.drop_column("projects", "description")
