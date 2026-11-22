"""Allow matched status for buyer requests.

Revision ID: f4a9c2d81b60
Revises: e3be222b3e0a
"""

from alembic import op


revision = "f4a9c2d81b60"
down_revision = "e3be222b3e0a"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("buyer_requests") as batch_op:
        batch_op.drop_constraint(
            "check_buyer_request_status",
            type_="check",
        )

        batch_op.create_check_constraint(
            "check_buyer_request_status",
            "status IN ('open', 'matched', 'fulfilled', 'closed', 'cancelled')",
        )


def downgrade():
    with op.batch_alter_table("buyer_requests") as batch_op:
        batch_op.drop_constraint(
            "check_buyer_request_status",
            type_="check",
        )

        batch_op.create_check_constraint(
            "check_buyer_request_status",
            "status IN ('open', 'fulfilled', 'closed', 'cancelled')",
        )
