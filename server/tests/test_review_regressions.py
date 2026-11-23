"""Local regression coverage for the project review; no external services."""
import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models import (User, Role, Admin, FarmerProfile, BuyerProfile, FieldOfficer,
                        Category, Product, Order, OrderItem, Payment, PasswordResetToken)


@pytest.fixture
def setup():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
                      'SECRET_KEY': 'a'*40, 'JWT_SECRET_KEY': 'b'*40})
    with app.app_context():
        db.create_all()
        users = {}
        for name in ['farmer', 'buyer', 'admin', 'other', 'roleless']:
            role = None if name == 'roleless' else Role(role_name=name)
            user = User(full_name=name.title(), email=f'{name}@example.com', role=role)
            user.set_password('Original123!')
            db.session.add(user); db.session.flush(); users[name] = user
        farmer = FarmerProfile(user_id=users['farmer'].user_id, farm_name='Test Farm', location='Kiambu', verification_status='approved')
        buyer = BuyerProfile(user_id=users['buyer'].user_id, location='Nairobi', buyer_type='individual')
        admin = Admin(user_id=users['admin'].user_id)
        category = Category(category_name='Vegetables')
        db.session.add_all([farmer, buyer, admin, category]); db.session.flush()
        product = Product(farmer_id=farmer.farmer_id, category_id=category.category_id,
                          product_name='Tomatoes', price=Decimal('100'), quantity_available=Decimal('10'), unit='kg', status='available')
        db.session.add(product); db.session.commit()
        headers = {name: {'Authorization': 'Bearer ' + create_access_token(identity=str(user.user_id))} for name, user in users.items()}
        yield app.test_client(), users, headers, product
        db.session.remove(); db.drop_all()


def make_order(client, headers, product):
    response = client.post('/api/orders', headers=headers['buyer'], json={'items': [{'product_id': product.product_id, 'quantity': '1'}]})
    assert response.status_code == 201, response.json
    return response.json['data']['order_id']


def test_roleless_category_returns_forbidden(setup):
    client, _, headers, _ = setup
    assert client.post('/api/categories/', headers=headers['roleless'], json={'category_name': 'Other'}).status_code == 403


@pytest.mark.parametrize('password', ['a'*73, 'ü'*37])
def test_registration_rejects_oversize_password(setup, password):
    client, _, _, _ = setup
    response = client.post('/api/register', json={'full_name': 'New User', 'email': 'new@example.com', 'password': password})
    assert response.status_code == 400
    assert 'password' in response.json['error']['details']


def test_ordered_product_cannot_be_deleted_and_stock_can_be_archived(setup):
    client, _, headers, product = setup
    make_order(client, headers, product)
    response = client.delete(f'/api/products/{product.product_id}', headers=headers['farmer'])
    assert response.status_code == 409
    assert db.session.get(Product, product.product_id)
    response = client.put(f'/api/products/{product.product_id}', headers=headers['farmer'], json={
        'product_name': 'Tomatoes', 'category_id': product.category_id, 'price': '100',
        'quantity_available': '0', 'unit': 'kg', 'status': 'sold_out'})
    assert response.status_code == 200


def test_completed_order_accepts_review(setup):
    client, _, headers, product = setup
    order_id = make_order(client, headers, product)
    order = db.session.get(Order, order_id); order.order_status = 'completed'; db.session.commit()
    assert client.post('/api/reviews', headers=headers['buyer'], json={'order_id': order_id, 'rating': 5}).status_code == 201


def test_password_reset_revokes_sessions_and_all_reset_tokens(setup):
    client, users, headers, _ = setup
    user = users['buyer']
    for token in ['first', 'second']:
        db.session.add(PasswordResetToken(user_id=user.user_id, token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=datetime.now(timezone.utc)+timedelta(minutes=10)))
    db.session.commit()
    response = client.post('/api/reset-password', json={'token': 'first', 'new_password': 'Changed123!'})
    assert response.status_code == 200
    assert client.get('/api/profiles/me', headers=headers['buyer']).status_code == 401
    assert client.post('/api/reset-password', json={'token': 'second', 'new_password': 'ChangedAgain123!'}).status_code == 400
    response = client.post('/api/login', json={'email': user.email, 'password': 'Changed123!'})
    assert response.status_code == 200


def test_smtp_delivery_sends_reset_without_logging_token(setup, caplog):
    client, users, _, _ = setup
    from app.routes.auth import _send_reset_email
    client.application.config.update(MAIL_SERVER='smtp.example.com', MAIL_DEFAULT_SENDER='noreply@example.com')
    with patch('smtplib.SMTP') as transport:
        _send_reset_email(users['buyer'], 'secret-reset-token')
        smtp = transport.return_value.__enter__.return_value
        smtp.send_message.assert_called_once()
        assert 'secret-reset-token' in smtp.send_message.call_args.args[0].get_content()
    assert 'secret-reset-token' not in caplog.text


def test_portal_ownership_and_persisted_orders(setup):
    client, _, headers, product = setup
    order_id = make_order(client, headers, product)
    assert client.get('/api/admin/orders', headers=headers['buyer']).status_code == 403
    assert client.get('/api/orders', headers=headers['buyer']).json['data'][0]['order_id'] == order_id
    assert client.get('/api/admin/orders', headers=headers['admin']).json['data'][0]['order_id'] == order_id
    assert client.get(f'/api/orders/{order_id}', headers=headers['other']).status_code == 404


def test_payment_provider_is_required_and_webhook_cannot_spoof_success(setup):
    client, _, headers, product = setup
    order_id = make_order(client, headers, product)
    assert client.patch(f'/api/orders/{order_id}/status', headers=headers['farmer'], json={'status': 'confirmed'}).status_code == 200
    response = client.post('/api/payments', headers=headers['buyer'], json={'order_id': order_id, 'amount': '100', 'payment_method': 'paystack'})
    assert response.status_code == 201
    payment_id = response.json['data']['payment_id']
    client.application.config['PAYSTACK_SECRET_KEY'] = None
    assert client.post(f'/api/payments/{payment_id}/initiate', headers=headers['buyer'], json={}).status_code == 503
    assert client.post('/api/payments/paystack/webhook', json={'event': 'charge.success'}).status_code == 401
    assert db.session.get(Payment, payment_id).payment_status == 'pending'


def test_saved_products_and_verified_search(setup):
    client, _, headers, product = setup
    response = client.post('/api/saved-products', headers=headers['buyer'], json={'product_id': product.product_id})
    saved_id = response.json['data']['saved_product_id']
    assert client.get('/api/saved-products', headers=headers['buyer']).json['data'][0]['product']['product_name'] == 'Tomatoes'
    assert client.delete(f'/api/saved-products/{saved_id}', headers=headers['buyer']).status_code == 204
    response = client.get('/api/products/search?verified=true&minimum_quantity=1&sort=price-low')
    assert response.json['data'][0]['verification_status'] == 'approved'


def test_accept_offer_rejects_other_pending_offers(setup):
    from app.models import BuyerRequest, RequestResponse
    client, users, headers, product = setup
    other_farmer = FarmerProfile(user_id=users['other'].user_id, farm_name='Other Farm', location='Nakuru')
    db.session.add(other_farmer); db.session.flush()
    request = BuyerRequest(buyer_id=users['buyer'].buyer_profile.buyer_id, category_id=product.category_id, product_name='Tomatoes', quantity=10, unit='kg', location='Nairobi')
    db.session.add(request); db.session.flush()
    first = RequestResponse(request_id=request.request_id, farmer_id=product.farmer_id, offered_price=100, available_quantity=10)
    other = RequestResponse(request_id=request.request_id, farmer_id=other_farmer.farmer_id, offered_price=110, available_quantity=10)
    db.session.add_all([first, other]); db.session.commit()
    assert client.patch(f'/api/responses/{first.response_id}', headers=headers['buyer'], json={'status': 'accepted'}).status_code == 200
    db.session.refresh(other)
    assert other.status == 'rejected'
    assert client.patch(f'/api/responses/{other.response_id}', headers=headers['buyer'], json={'status': 'accepted'}).status_code == 409
