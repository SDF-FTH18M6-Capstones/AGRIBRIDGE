"""Allow users to register before selecting a role."""
from alembic import op
import sqlalchemy as sa

revision = "d42e8b71c903"
down_revision = "c91f2a6b7d30"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.alter_column("role_id", existing_type=sa.Integer(), nullable=True)


def downgrade():
    with op.batch_alter_table("users") as batch:
        batch.alter_column("role_id", existing_type=sa.Integer(), nullable=False)
