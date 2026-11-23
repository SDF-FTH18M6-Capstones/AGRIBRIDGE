"""Persist resumable Paystack checkout URLs; retain historical provider records."""
from alembic import op
import sqlalchemy as sa

revision = 'c34f6a0db003'
down_revision = 'b23e5f9ca002'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('payments') as batch:
        batch.add_column(sa.Column('authorization_url', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('payments') as batch:
        batch.drop_column('authorization_url')
