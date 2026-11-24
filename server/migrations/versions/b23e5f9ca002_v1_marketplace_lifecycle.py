"""V1 deadlines, immutable line details, notifications and resolution history."""
from datetime import datetime, timedelta, timezone
from alembic import op
import sqlalchemy as sa

revision = 'b23e5f9ca002'
down_revision = 'a12d4e8b9001'
branch_labels = None
depends_on = None
OLD = "'pending','confirmed','shipped','delivered','completed','cancelled'"


def upgrade():
    with op.batch_alter_table('orders') as batch:
        for name in ['confirmation_deadline', 'payment_deadline', 'confirmed_at', 'completed_at', 'stock_released_at']:
            batch.add_column(sa.Column(name, sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column('checkout_key', sa.String(64), nullable=True))
        batch.add_column(sa.Column('checkout_fingerprint', sa.String(64), nullable=True))
        batch.create_unique_constraint('uq_order_checkout_farmer', ['buyer_id', 'farmer_id', 'checkout_key'])
        batch.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
        batch.drop_constraint('check_order_status', type_='check')
        batch.create_check_constraint('check_order_status', f"order_status IN ({OLD},'paid','rejected','expired')")
        batch.create_index('ix_orders_confirmation_deadline', ['confirmation_deadline'])
        batch.create_index('ix_orders_payment_deadline', ['payment_deadline'])
    with op.batch_alter_table('order_items') as batch:
        batch.add_column(sa.Column('product_name', sa.Text(), nullable=True))
        batch.add_column(sa.Column('unit', sa.Text(), nullable=True))
    bind = op.get_bind()
    bind.execute(sa.text("UPDATE order_items SET product_name = (SELECT product_name FROM products WHERE products.product_id = order_items.product_id), unit = (SELECT unit FROM products WHERE products.product_id = order_items.product_id)"))
    with op.batch_alter_table('order_items') as batch:
        batch.alter_column('product_name', existing_type=sa.Text(), nullable=False)
        batch.alter_column('unit', existing_type=sa.Text(), nullable=False)
    instant = datetime.now(timezone.utc)
    orders = sa.table('orders', sa.column('order_status', sa.Text()), sa.column('confirmation_deadline', sa.DateTime(timezone=True)), sa.column('payment_deadline', sa.DateTime(timezone=True)))
    bind.execute(orders.update().where(orders.c.order_status == 'pending').values(confirmation_deadline=instant+timedelta(hours=12)))
    bind.execute(orders.update().where(orders.c.order_status == 'confirmed').values(payment_deadline=instant+timedelta(hours=2)))
    bind.execute(sa.text("UPDATE orders SET order_status='paid' WHERE order_status IN ('pending','confirmed','shipped','delivered') AND EXISTS (SELECT 1 FROM payments WHERE payments.order_id=orders.order_id AND payment_status='paid')"))
    # Legacy fulfilment states are outside V1; unpaid legacy orders remain payable.
    bind.execute(orders.update().where(orders.c.order_status.in_(['shipped', 'delivered']))
                 .values(order_status='confirmed', payment_deadline=instant+timedelta(hours=2)))
    op.create_table('marketplace_settings', sa.Column('settings_id', sa.Integer(), primary_key=True), sa.Column('confirmation_hours', sa.Integer(), nullable=False), sa.Column('payment_hours', sa.Integer(), nullable=False))
    op.create_table('audit_events', sa.Column('event_id', sa.Integer(), primary_key=True), sa.Column('actor_id', sa.Integer(), sa.ForeignKey('users.user_id')), sa.Column('entity_type', sa.Text(), nullable=False), sa.Column('entity_id', sa.Integer(), nullable=False), sa.Column('action', sa.Text(), nullable=False), sa.Column('details', sa.JSON(), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.create_index('ix_audit_events_entity_id', 'audit_events', ['entity_id'])
    op.create_table('notifications', sa.Column('notification_id', sa.Integer(), primary_key=True), sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False), sa.Column('title', sa.Text(), nullable=False), sa.Column('message', sa.Text(), nullable=False), sa.Column('link', sa.Text(), nullable=False), sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), sa.Column('read_at', sa.DateTime(timezone=True)), sa.Column('email_status', sa.Text(), nullable=False), sa.Column('email_attempts', sa.Integer(), nullable=False), sa.Column('email_retry_at', sa.DateTime(timezone=True)))
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_table('order_issues', sa.Column('issue_id', sa.Integer(), primary_key=True), sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.order_id'), nullable=False), sa.Column('requested_by', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False), sa.Column('issue_type', sa.Text(), nullable=False), sa.Column('reason', sa.Text(), nullable=False), sa.Column('status', sa.Text(), nullable=False), sa.Column('resolution_note', sa.Text()), sa.Column('refund_reference', sa.Text(), unique=True), sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.user_id')), sa.Column('reviewed_at', sa.DateTime(timezone=True)), sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()), sa.CheckConstraint("status IN ('open','resolved','rejected')", name='check_order_issue_status'), sa.CheckConstraint("issue_type IN ('cancellation','refund','payment')", name='check_order_issue_type'))
    op.create_index('ix_order_issues_order_id', 'order_issues', ['order_id'])


def downgrade():
    for table in ['order_issues', 'notifications', 'audit_events', 'marketplace_settings']:
        op.drop_table(table)
    op.get_bind().execute(sa.text("UPDATE orders SET order_status=CASE WHEN order_status='paid' THEN 'confirmed' ELSE 'cancelled' END WHERE order_status IN ('paid','rejected','expired')"))
    with op.batch_alter_table('orders') as batch:
        batch.drop_constraint('check_order_status', type_='check')
        batch.create_check_constraint('check_order_status', f'order_status IN ({OLD})')
        batch.drop_constraint('uq_order_checkout_farmer', type_='unique')
        batch.drop_column('checkout_key')
        batch.drop_column('checkout_fingerprint')
        batch.drop_index('ix_orders_confirmation_deadline')
        batch.drop_index('ix_orders_payment_deadline')
        for name in ['confirmation_deadline', 'payment_deadline', 'confirmed_at', 'completed_at', 'stock_released_at', 'rejection_reason']:
            batch.drop_column(name)
    with op.batch_alter_table('order_items') as batch:
        batch.drop_column('product_name')
        batch.drop_column('unit')
