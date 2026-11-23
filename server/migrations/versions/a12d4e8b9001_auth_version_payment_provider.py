"""Track account token versions and provider payment requests."""
from alembic import op
import sqlalchemy as sa

revision = "a12d4e8b9001"
down_revision = "f4a9c2d81b60"
branch_labels = None
depends_on = None


def upgrade():
    # Earlier SQLite migrations emitted PostgreSQL's now() as a literal default.
    # Repair existing migrated local databases as well as fresh installations.
    if op.get_bind().dialect.name == "sqlite":
        inspector = sa.inspect(op.get_bind())
        for table in inspector.get_table_names():
            columns = [column for column in inspector.get_columns(table)
                       if "now()" in str(column.get("default", "")).lower()]
            if columns:
                with op.batch_alter_table(table) as batch:
                    for column in columns:
                        batch.alter_column(column["name"], existing_type=column["type"],
                                           server_default=sa.func.now())
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("auth_version", sa.Integer(), server_default="0", nullable=False))
    with op.batch_alter_table("payments") as batch:
        batch.add_column(sa.Column("provider_request_id", sa.Text(), nullable=True))
        batch.create_unique_constraint("uq_payment_provider_request", ["provider_request_id"])


def downgrade():
    with op.batch_alter_table("payments") as batch:
        batch.drop_constraint("uq_payment_provider_request", type_="unique")
        batch.drop_column("provider_request_id")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("auth_version")
