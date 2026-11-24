"""Structured profiles, tab sessions and private verification evidence.

Existing locations, hashes and evidence remain intact. No external calls/backfills.
"""
from alembic import op
import sqlalchemy as sa

revision = 'd45a7b1ec004'
down_revision = 'c34f6a0db003'
branch_labels = None
depends_on = None


def upgrade():
    for table in ['buyer_profiles', 'farmer_profiles']:
        with op.batch_alter_table(table) as batch:
            for name in ['county_code', 'subcounty_code', 'town']:
                batch.add_column(sa.Column(name, sa.Text()))
            if table == 'farmer_profiles':
                for name in ['ward_code', 'directions', 'landmark', 'land_tenure']:
                    batch.add_column(sa.Column(name, sa.Text()))
                batch.add_column(sa.Column('latitude', sa.Float()))
                batch.add_column(sa.Column('longitude', sa.Float()))
    with op.batch_alter_table('field_officers') as batch:
        batch.add_column(sa.Column('coverage', sa.JSON()))
    with op.batch_alter_table('farmer_verifications') as batch:
        batch.add_column(sa.Column('location_snapshot', sa.JSON()))
        batch.add_column(sa.Column('location_matches', sa.Boolean()))
        batch.add_column(sa.Column('officer_remarks', sa.Text()))
    op.create_table('auth_sessions',
        sa.Column('session_id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('tab_id', sa.String(100), nullable=False),
        sa.Column('refresh_hash', sa.String(64), nullable=False, unique=True),
        *[sa.Column(name, sa.DateTime(timezone=True), nullable=False) for name in ['created_at', 'last_activity_at', 'expires_at', 'verified_at']],
        sa.Column('revoked_at', sa.DateTime(timezone=True)), sa.Column('browser', sa.String(200)))
    op.create_index('ix_auth_sessions_user_id', 'auth_sessions', ['user_id'])
    op.create_table('used_refresh_tokens',
        sa.Column('token_hash', sa.String(64), primary_key=True),
        sa.Column('session_id', sa.String(64), sa.ForeignKey('auth_sessions.session_id'), nullable=False))
    op.create_table('media_assets',
        sa.Column('asset_id', sa.String(64), primary_key=True),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('verification_id', sa.Integer(), sa.ForeignKey('farmer_verifications.verification_id')),
        sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.product_id')),
        sa.Column('purpose', sa.Text(), nullable=False),
        sa.Column('public_id', sa.Text(), nullable=False, unique=True),
        sa.Column('cloudinary_asset_id', sa.Text()),
        *[sa.Column(name, sa.Text(), nullable=False) for name in ['resource_type', 'delivery_type', 'file_format', 'original_name']],
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('scan_status', sa.Text(), nullable=False), sa.Column('public_url', sa.Text()),
        sa.Column('page_order', sa.Integer(), nullable=False), sa.Column('deleted_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    for column in ['owner_id', 'verification_id', 'product_id']:
        op.create_index('ix_media_assets_'+column, 'media_assets', [column])


def downgrade():
    op.drop_table('media_assets')
    op.drop_table('used_refresh_tokens')
    op.drop_table('auth_sessions')
    with op.batch_alter_table('farmer_verifications') as batch:
        for name in ['location_snapshot', 'location_matches', 'officer_remarks']: batch.drop_column(name)
    with op.batch_alter_table('field_officers') as batch:
        batch.drop_column('coverage')
    for table in ['buyer_profiles', 'farmer_profiles']:
        with op.batch_alter_table(table) as batch:
            for name in ['county_code', 'subcounty_code', 'town']: batch.drop_column(name)
            if table == 'farmer_profiles':
                for name in ['ward_code', 'directions', 'landmark', 'land_tenure', 'latitude', 'longitude']: batch.drop_column(name)
