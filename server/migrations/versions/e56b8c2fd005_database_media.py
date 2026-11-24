"""Store new uploads in PostgreSQL; preserve existing provider metadata."""
from alembic import op
import sqlalchemy as sa

revision = 'e56b8c2fd005'
down_revision = 'd45a7b1ec004'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('media_assets') as batch:
        batch.add_column(sa.Column('storage_backend',sa.Text(),nullable=False,server_default='cloudinary'))
    op.create_table('media_contents',
        sa.Column('asset_id',sa.String(64),sa.ForeignKey('media_assets.asset_id'),primary_key=True),
        sa.Column('data',sa.LargeBinary(),nullable=False))


def downgrade():
    # A downgrade must not silently erase uploaded documents.
    connection=op.get_bind()
    if connection.execute(sa.text('SELECT COUNT(*) FROM media_contents')).scalar():
        raise RuntimeError('Export database file contents before downgrading media storage.')
    op.drop_table('media_contents')
    with op.batch_alter_table('media_assets') as batch:
        batch.drop_column('storage_backend')
