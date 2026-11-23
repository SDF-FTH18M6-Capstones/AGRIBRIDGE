"""V1 acceptance coverage. All accounts, databases and provider results are test-only."""
from datetime import timedelta
from unittest.mock import patch
import pytest
from flask_jwt_extended import create_access_token
from app import create_app
from app.extensions import db
from app.models import (User, Role, Admin, FieldOfficer, FarmerProfile, BuyerProfile,
                        Product, Category, Order, Payment, Notification)
from app.services.commerce import now, expire_due_orders, settle_payment


@pytest.fixture
def ctx():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
                      'SECRET_KEY': 'x'*40, 'JWT_SECRET_KEY': 'y'*40, 'MAIL_SERVER': None})
    with app.app_context():
        db.create_all(); client = app.test_client(); users = {}
        for name in ['buyer', 'farmer', 'secondfarmer', 'admin', 'officer', 'outsider']:
            user = User(full_name=name.title(), email=name+'@example.com', password_hash='unused')
            db.session.add(user); db.session.flush(); users[name] = user
        role = Role(role_name='admin'); db.session.add(role); users['admin'].role = role
        db.session.add(Admin(user_id=users['admin'].user_id))
        db.session.add(FieldOfficer(user_id=users['officer'].user_id, staff_number='V1-1'))
        db.session.add(BuyerProfile(user_id=users['buyer'].user_id, location='Nairobi', buyer_type='individual'))
        category = Category(category_name='Vegetables'); db.session.add(category); db.session.flush()
        products = []
        for name in ['farmer', 'secondfarmer']:
            farmer = FarmerProfile(user_id=users[name].user_id, farm_name=name+' farm', location='Kiambu', verification_status='approved')
            db.session.add(farmer); db.session.flush()
            product = Product(farmer_id=farmer.farmer_id, category_id=category.category_id, product_name=name+' tomatoes', price=100, quantity_available=10, unit='kg', status='available')
            db.session.add(product); products.append(product)
        db.session.commit()
        headers = {name: {'Authorization': 'Bearer '+create_access_token(identity=str(user.user_id))} for name, user in users.items()}
        yield app, client, users, headers, products
        db.session.remove(); db.drop_all()


def order(ctx, **extra):
    _, client, _, headers, products = ctx
    r = client.post('/api/orders', headers=headers['buyer'], json={'items': [{'product_id': products[0].product_id, 'quantity': '2'}], **extra})
    assert r.status_code in (200, 201), r.json
    return r.json['data']


def confirm(ctx, order_id):
    _, client, _, headers, _ = ctx
    r = client.patch(f'/api/orders/{order_id}/status', headers=headers['farmer'], json={'status': 'confirmed'})
    assert r.status_code == 200, r.json
    return r.json['data']


def payment(ctx, order_id):
    _, client, _, headers, _ = ctx
    r = client.post('/api/payments', headers=headers['buyer'], json={'order_id': order_id, 'amount': '200', 'payment_method': 'paystack'})
    assert r.status_code == 201, r.json
    return db.session.get(Payment, r.json['data']['payment_id'])


def verified_result(attempt, **extra):
    return {'reference': attempt.provider_request_id, 'amount': int(attempt.amount * 100),
            'currency': 'KES', 'domain': 'test', 'status': 'success',
            'customer': {'email': attempt.order.buyer.user.email}, **extra}


def test_registration_is_general_with_automatic_session(ctx):
    _, client, _, _, _ = ctx
    r = client.post('/api/register', json={'full_name': 'New Person', 'email': 'new@example.com', 'password': 'Password123!', 'role': 'farmer'})
    assert r.status_code == 201
    data = r.json['data']
    assert data['user']['role'] is None
    assert not any(data['user']['capabilities'].values())
    assert client.get('/api/profiles/me', headers={'Authorization': 'Bearer '+data['access_token']}).status_code == 200


def test_dual_profiles_and_approval_gate(ctx):
    _, client, users, headers, _ = ctx
    r = client.put('/api/profiles/me', headers=headers['outsider'], json={'profile_type': 'buyer', 'buyer_type': 'individual', 'location': 'Nairobi'})
    assert r.status_code == 200 and r.json['user']['capabilities']['buyer']
    r = client.put('/api/profiles/me', headers=headers['outsider'], json={'profile_type': 'farmer', 'farm_name': 'New Farm', 'location': 'Nakuru'})
    assert r.status_code == 200
    assert r.json['user']['capabilities']['buyer'] and not r.json['user']['capabilities']['farmer']
    assert client.get('/api/dashboards/buyer', headers=headers['outsider']).status_code == 200
    assert client.get('/api/dashboards/farmer', headers=headers['outsider']).status_code == 403
    users['outsider'].farmer_profile.verification_status = 'approved'; db.session.commit()
    data = client.get('/api/profiles/me', headers=headers['outsider']).json['data']
    assert data['capabilities']['buyer'] and data['capabilities']['farmer']
    assert client.get('/api/dashboards/farmer', headers=headers['outsider']).status_code == 200


def test_unverified_publishing_and_public_search(ctx):
    _, client, users, headers, products = ctx
    users['farmer'].farmer_profile.verification_status = 'pending'; db.session.commit()
    assert client.post('/api/products', headers=headers['farmer'], json={'category_id': products[0].category_id, 'product_name': 'Carrots', 'price': '10', 'quantity_available': '5', 'unit': 'kg', 'status': 'available'}).status_code == 403
    assert products[0].product_id not in [p['product_id'] for p in client.get('/api/products/search').json['data']]


def test_confirmation_rejection_and_self_purchase(ctx):
    _, client, users, headers, products = ctx
    created = order(ctx); path = f'/api/orders/{created["order_id"]}/status'
    assert client.post('/api/payments', headers=headers['buyer'], json={'order_id': created['order_id'], 'amount': '200', 'payment_method': 'paystack'}).status_code == 409
    assert client.patch(path, headers=headers['buyer'], json={'status': 'confirmed'}).status_code == 403
    assert client.patch(path, headers=headers['farmer'], json={'status': 'rejected'}).status_code == 400
    assert client.patch(path, headers=headers['farmer'], json={'status': 'rejected', 'reason': 'Harvest not ready'}).status_code == 200
    assert db.session.get(Product, products[0].product_id).quantity_available == 10
    assert client.patch(path, headers=headers['farmer'], json={'status': 'confirmed'}).status_code == 409
    db.session.add(BuyerProfile(user_id=users['farmer'].user_id, location='Kiambu', buyer_type='individual')); db.session.commit()
    assert client.post('/api/orders', headers=headers['farmer'], json={'items': [{'product_id': products[0].product_id, 'quantity': '1'}]}).status_code == 403


def test_split_cart_atomicity_and_idempotency(ctx):
    _, client, _, headers, products = ctx
    payload = {'split_by_farmer': True, 'checkout_key': 'checkout-unique-123', 'items': [{'product_id': p.product_id, 'quantity': '2'} for p in products]}
    r = client.post('/api/orders', headers=headers['buyer'], json=payload)
    assert r.status_code == 201 and len(r.json['data']['orders']) == 2
    assert client.post('/api/orders', headers=headers['buyer'], json=payload).status_code == 200
    assert Order.query.count() == 2
    assert all(db.session.get(Product, p.product_id).quantity_available == 8 for p in products)
    payload['items'][1]['quantity'] = '3'
    assert client.post('/api/orders', headers=headers['buyer'], json=payload).status_code == 409
    payload['checkout_key'] = 'checkout-unique-456'; payload['items'][1]['quantity'] = '100'
    assert client.post('/api/orders', headers=headers['buyer'], json=payload).status_code == 409
    assert Order.query.count() == 2
    assert all(db.session.get(Product, p.product_id).quantity_available == 8 for p in products)


def test_immutable_snapshots_and_expiry(ctx):
    _, _, _, _, products = ctx
    created = order(ctx); stored = db.session.get(Order, created['order_id'])
    old_name = stored.items[0].product_name
    products[0].product_name = 'Edited'; products[0].price = 999; products[0].unit = 'bag'; db.session.commit()
    assert stored.items[0].product_name == old_name
    assert stored.items[0].unit == 'kg' and stored.items[0].unit_price == 100
    assert stored.confirmation_deadline is not None
    assert expire_due_orders(now()+timedelta(hours=13)) == 1
    assert expire_due_orders(now()+timedelta(hours=14)) == 0
    assert db.session.get(Product, products[0].product_id).quantity_available == 10
    assert db.session.get(Order, stored.order_id).order_status == 'expired'


def test_payment_deadlines_and_ambiguous_charge_reservation(ctx):
    _, client, _, headers, products = ctx
    created = order(ctx); confirm(ctx, created['order_id']); stored = db.session.get(Order, created['order_id'])
    stored.payment_deadline = now()-timedelta(minutes=1); db.session.commit()
    assert client.post('/api/payments', headers=headers['buyer'], json={'order_id': stored.order_id, 'amount': '200', 'payment_method': 'paystack'}).status_code == 409
    assert db.session.get(Product, products[0].product_id).quantity_available == 10
    created = order(ctx); confirm(ctx, created['order_id']); attempt = payment(ctx, created['order_id'])
    attempt.provider_request_id = 'awaiting:unknown'; db.session.commit()
    assert expire_due_orders(now()+timedelta(days=2)) == 0
    assert db.session.get(Product, products[0].product_id).quantity_available == 8
    assert client.patch(f'/api/orders/{created["order_id"]}/status', headers=headers['buyer'], json={'status': 'cancelled'}).status_code == 409


def test_payment_receipt_review_and_notification_ownership(ctx):
    _, client, _, headers, _ = ctx
    created = order(ctx); confirm(ctx, created['order_id']); attempt = payment(ctx, created['order_id'])
    attempt.provider_request_id = 'checkout-success'; db.session.commit()
    for _ in range(2): settle_payment(attempt, verified_result(attempt)); db.session.commit()
    assert db.session.get(Order, created['order_id']).order_status == 'paid'
    assert client.post('/api/reviews', headers=headers['buyer'], json={'order_id': created['order_id'], 'rating': 5}).status_code == 409
    path = f'/api/orders/{created["order_id"]}/status'
    assert client.patch(path, headers=headers['farmer'], json={'status': 'completed'}).status_code == 403
    assert client.patch(path, headers=headers['buyer'], json={'status': 'completed'}).status_code == 200
    assert client.post('/api/reviews', headers=headers['buyer'], json={'order_id': created['order_id'], 'rating': 5}).status_code == 201
    events = client.get(f'/api/orders/{created["order_id"]}', headers=headers['buyer']).json['data']['history']
    assert [event['action'] for event in events].count('payment_verified') == 1
    assert events[-1]['action'] == 'receipt_confirmed'
    notes = client.get('/api/notifications', headers=headers['buyer']).json['data']; assert len(notes) == 4
    assert client.patch(f'/api/notifications/{notes[0]["notification_id"]}', headers=headers['outsider']).status_code == 404
    assert client.patch(f'/api/notifications/{notes[0]["notification_id"]}', headers=headers['buyer']).status_code == 200


def test_manual_refund_requires_external_confirmation_and_admin(ctx):
    _, client, _, headers, products = ctx
    created = order(ctx); confirm(ctx, created['order_id']); attempt = payment(ctx, created['order_id'])
    attempt.provider_request_id = 'checkout-refund'; db.session.commit(); settle_payment(attempt, verified_result(attempt)); db.session.commit()
    path = f'/api/orders/{created["order_id"]}/issues'
    r = client.post(path, headers=headers['buyer'], json={'issue_type': 'refund', 'reason': 'Please cancel this purchase.'})
    assert r.status_code == 201
    assert client.post(path, headers=headers['buyer'], json={'issue_type': 'refund', 'reason': 'Duplicate request'}).status_code == 409
    path = f'/api/admin/order-issues/{r.json["data"]["issue_id"]}'
    payload = {'decision': 'refund_verified', 'note': 'Checked merchant refund transaction.', 'refund_reference': 'REFUND-1', 'refund_verified': True, 'restock_confirmed': True}
    assert client.patch(path, headers=headers['buyer'], json=payload).status_code == 403
    assert client.patch(path, headers=headers['admin'], json={**payload, 'refund_verified': False}).status_code == 400
    assert client.patch(path, headers=headers['admin'], json=payload).status_code == 200
    assert db.session.get(Payment, attempt.payment_id).payment_status == 'refunded'
    assert db.session.get(Product, products[0].product_id).quantity_available == 10
    assert client.patch(path, headers=headers['admin'], json=payload).status_code == 409
    assert client.get('/api/order-issues', headers=headers['outsider']).json['data'] == []


def test_settings_suspension_and_worker_command(ctx):
    app, client, _, headers, products = ctx
    payload = {'confirmation_hours': 6, 'payment_hours': 1}
    assert client.put('/api/admin/settings', headers=headers['buyer'], json=payload).status_code == 403
    assert client.put('/api/admin/settings', headers=headers['admin'], json=payload).status_code == 200
    created = order(ctx)
    deadline = db.session.get(Order, created['order_id']).confirmation_deadline.replace(tzinfo=now().tzinfo)
    assert 5.99 < (deadline-now()).total_seconds()/3600 <= 6
    result = app.test_cli_runner().invoke(args=['v1-worker', '--once']); assert result.exit_code == 0, result.output
    assert client.patch(f'/api/admin/farmers/{products[0].farmer_id}/suspend', headers=headers['admin'], json={'reason': 'Verification needs review.'}).status_code == 200
    assert not client.get('/api/profiles/me', headers=headers['farmer']).json['data']['capabilities']['farmer']
    assert client.get('/api/orders?view=farmer', headers=headers['farmer']).json['data'][0]['order_id'] == created['order_id']
    assert client.get('/api/admin/audit', headers=headers['buyer']).status_code == 403


def test_email_outbox_sends_once(ctx):
    app, _, users, _, _ = ctx
    from app.services.worker import deliver_emails
    app.config.update(MAIL_SERVER='smtp.test', MAIL_DEFAULT_SENDER='test@example.com')
    db.session.add(Notification(user_id=users['buyer'].user_id, title='Test', message='Test order', link='/buyer/orders')); db.session.commit()
    with patch('smtplib.SMTP') as smtp:
        assert deliver_emails() == 1
        assert deliver_emails() == 0
        smtp.return_value.__enter__.return_value.send_message.assert_called_once()


def test_incomplete_provider_acknowledgement_keeps_reservation(ctx):
    app, client, _, headers, products = ctx
    created = order(ctx); confirm(ctx, created['order_id']); attempt = payment(ctx, created['order_id'])
    app.config['PAYSTACK_SECRET_KEY'] = 'sk_test_private'
    with patch('app.services.paystack.initiate', return_value={}):
        response = client.post(f'/api/payments/{attempt.payment_id}/initiate', headers=headers['buyer'], json={})
    assert response.status_code == 502
    db.session.refresh(attempt)
    assert attempt.payment_status == 'pending' and attempt.provider_request_id.startswith('AB-')
    assert expire_due_orders(now()+timedelta(days=1)) == 0
    assert db.session.get(Product,products[0].product_id).quantity_available == 8


def test_fractional_paystack_total_is_supported(ctx):
    _, client, _, headers, products = ctx
    products[0].price = '100.50'; db.session.commit()
    response = client.post('/api/orders', headers=headers['buyer'], json={'items':[{'product_id':products[0].product_id,'quantity':'1'}]})
    assert response.status_code == 201
    assert response.json['data']['total_amount'] == '100.50'
    assert db.session.get(Product,products[0].product_id).quantity_available == 9


def test_paystack_minimum_rejected_before_reserving_stock(ctx):
    _, client, _, headers, products = ctx
    products[0].price = '2.50'; db.session.commit()
    response = client.post('/api/orders', headers=headers['buyer'], json={'items':[{'product_id':products[0].product_id,'quantity':'1'}]})
    assert response.status_code == 400
    assert response.json['error']['code'] == 'PAYSTACK_MINIMUM_AMOUNT'
    assert products[0].quantity_available == 10 and Order.query.count() == 0


def test_admin_reconciles_only_saved_reference(ctx):
    app, client, _, headers, _ = ctx
    created = order(ctx); confirm(ctx, created['order_id']); attempt = payment(ctx, created['order_id'])
    attempt.provider_request_id = 'AB-persisted-reference'; db.session.commit()
    app.config['PAYSTACK_SECRET_KEY'] = 'sk_test_private'
    path = f'/api/admin/payments/{attempt.payment_id}/reconcile'
    assert client.post(path, headers=headers['buyer']).status_code == 403
    assert client.post(path, headers=headers['admin'], json={'reference': 'attacker-reference'}).status_code == 400
    with patch('app.services.paystack.query', return_value=verified_result(attempt)) as query:
        assert client.post(path, headers=headers['admin']).status_code == 200
        assert client.post(path, headers=headers['admin']).status_code == 200
        query.assert_called_once_with('AB-persisted-reference')
    assert db.session.get(Order,created['order_id']).order_status == 'paid'


def test_payment_availability_is_private_and_has_no_side_effects(ctx):
    app, client, _, headers, _ = ctx
    app.config['PAYSTACK_SECRET_KEY'] = None
    assert client.get('/api/payments/availability').status_code == 401
    response = client.get('/api/payments/availability', headers=headers['buyer'])
    assert response.status_code == 200
    assert response.json['data']['available'] is False
    assert response.json['data']['mode'] == 'test'
    assert Payment.query.count() == 0
    app.config['PAYSTACK_SECRET_KEY'] = 'sk_test_private-credential'
    response = client.get('/api/payments/availability', headers=headers['buyer'])
    assert response.json['data']['available'] is True
    assert 'private-credential' not in response.get_data(as_text=True)
    assert Payment.query.count() == 0
    app.config['PAYSTACK_CALLBACK_URL'] = '/relative-url'
    assert client.get('/api/payments/availability', headers=headers['buyer']).json['data']['available'] is False


def test_payment_availability_rejects_live_key(ctx):
    app, client, _, headers, _ = ctx
    app.config['PAYSTACK_SECRET_KEY'] = 'sk_live_private'
    assert client.get('/api/payments/availability', headers=headers['buyer']).json['data']['available'] is False
