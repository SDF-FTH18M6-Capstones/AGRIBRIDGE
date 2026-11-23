"""Verify that local development can use the real migration chain."""
from app import create_app
from app.extensions import db
from app.models import User, Role


def test_sqlite_migrations_and_defaults(tmp_path):
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': f'sqlite:///{tmp_path / "migration.sqlite"}',
                      'SECRET_KEY': 'test-secret', 'JWT_SECRET_KEY': 'a'*32})
    runner = app.test_cli_runner()
    result = runner.invoke(args=['db', 'upgrade'])
    assert result.exit_code == 0, result.output
    with app.app_context():
        role = Role(role_name='buyer')
        user = User(full_name='Migration User', email='migration@example.com', password_hash='test-only', role=role)
        db.session.add(user); db.session.commit()
        assert user.created_at
        assert user.auth_version == 0
        user_id = user.user_id
    result = runner.invoke(args=['db', 'downgrade', 'f4a9c2d81b60'])
    assert result.exit_code == 0, result.output
    result = runner.invoke(args=['db', 'upgrade'])
    assert result.exit_code == 0, result.output
    with app.app_context():
        assert db.session.get(User, user_id).email == 'migration@example.com'


def test_upgrade_preserves_legacy_order_and_snapshots(tmp_path):
    from sqlalchemy import text
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': f'sqlite:///{tmp_path / "legacy.sqlite"}',
                      'SECRET_KEY': 'test-secret', 'JWT_SECRET_KEY': 'a'*32})
    runner = app.test_cli_runner()
    result = runner.invoke(args=['db', 'upgrade', 'a12d4e8b9001'])
    assert result.exit_code == 0, result.output
    with app.app_context():
        commands = [
            "INSERT INTO users (user_id,full_name,email,password_hash) VALUES (1,'Buyer','buyer@example.com','test'),(2,'Farmer','farmer@example.com','test')",
            "INSERT INTO buyer_profiles (buyer_id,user_id,buyer_type,location) VALUES (1,1,'individual','Nairobi')",
            "INSERT INTO farmer_profiles (farmer_id,user_id,farm_name,location,verification_status) VALUES (1,2,'Farm','Kiambu','approved')",
            "INSERT INTO categories (category_id,category_name) VALUES (1,'Vegetables')",
            "INSERT INTO products (product_id,farmer_id,category_id,product_name,price,quantity_available,unit) VALUES (1,1,1,'Legacy tomatoes',100,9,'kg')",
            "INSERT INTO orders (order_id,buyer_id,farmer_id,total_amount,order_status) VALUES (1,1,1,100,'delivered'),(2,1,1,100,'pending')",
            "INSERT INTO order_items (order_id,product_id,quantity,unit_price,subtotal) VALUES (1,1,1,100,100),(2,1,1,100,100)",
            "INSERT INTO payments (order_id,payment_method,amount,payment_status) VALUES (2,'mpesa',100,'paid')",
        ]
        for command in commands:
            db.session.execute(text(command))
        db.session.commit()
    result = runner.invoke(args=['db', 'upgrade'])
    assert result.exit_code == 0, result.output
    from app.models import Order
    with app.app_context():
        unpaid = db.session.get(Order, 1)
        assert unpaid.order_status == 'confirmed' and unpaid.payment_deadline
        assert unpaid.items[0].product_name == 'Legacy tomatoes'
        assert unpaid.items[0].unit == 'kg' and unpaid.items[0].unit_price == 100
        assert db.session.get(Order, 2).order_status == 'paid'
        legacy_payment = db.session.get(Order, 2).payments[0]
        assert legacy_payment.payment_method == 'mpesa'
        assert legacy_payment.authorization_url is None
