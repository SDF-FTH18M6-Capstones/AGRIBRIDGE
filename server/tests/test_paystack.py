"""Provider boundary tests use isolated databases and mock HTTP; never real charges."""
import hashlib
import hmac
import json
import time
from decimal import Decimal
from unittest.mock import patch
from urllib.error import URLError

import pytest
from app.extensions import db
from app.models import Order, Payment
from app.services import paystack
from app.services.worker import reconcile_pending
from tests.test_v1 import ctx, order, confirm, payment, verified_result


@pytest.fixture
def checkout(ctx):
    app, client, _, headers, _ = ctx
    app.config.update(PAYSTACK_SECRET_KEY='sk_test_private', PAYSTACK_WEBHOOK_SECRET='whsec_private',
                      PAYSTACK_CALLBACK_URL='http://localhost:5173/buyer/payments')
    created = order(ctx); confirm(ctx, created['order_id'])
    attempt = payment(ctx, created['order_id'])
    return app, client, headers, attempt


def initialized(checkout):
    _, client, headers, attempt = checkout
    def result(stored):
        # The reference is durable before the provider is called.
        assert db.session.get(Payment, stored.payment_id).provider_request_id == stored.provider_request_id
        return {'reference': stored.provider_request_id, 'authorization_url': 'https://checkout.paystack.com/test-access'}
    with patch('app.services.paystack.initiate', side_effect=result) as initiate:
        response = client.post(f'/api/payments/{attempt.payment_id}/initiate', headers=headers['buyer'], json={})
        assert response.status_code == 202, response.json
        initiate.assert_called_once()
    return response


def test_initialize_resume_and_ownership(checkout):
    _, client, headers, attempt = checkout
    initialized(checkout)
    path = f'/api/payments/{attempt.payment_id}/initiate'
    with patch('app.services.paystack.initiate') as initialize:
        assert client.post(path, headers=headers['buyer'], json={}).status_code == 200
        initialize.assert_not_called()
    assert client.post(path, headers=headers['outsider'], json={}).status_code == 404
    assert client.post(f'/api/payments/{attempt.payment_id}/reconcile', headers=headers['outsider']).status_code == 404
    assert client.patch(f'/api/orders/{attempt.order_id}/status', headers=headers['buyer'], json={'status':'cancelled'}).status_code == 409


def test_server_initialization_payload_uses_minor_units_and_stored_identity(checkout):
    _, _, _, attempt = checkout
    attempt.amount = Decimal('100.50'); attempt.provider_request_id = 'AB-server-reference'; db.session.commit()
    with patch('app.services.paystack.urlopen') as transport:
        transport.return_value.__enter__.return_value.read.return_value = json.dumps({'status':True,'data': {'reference':attempt.provider_request_id,'authorization_url':'https://checkout.paystack.com/access'}}).encode()
        paystack.initiate(attempt)
        req = transport.call_args.args[0]
        assert req.full_url == 'https://api.paystack.co/transaction/initialize'
        assert req.get_header('Authorization') == 'Bearer sk_test_private'
        assert req.get_header('User-agent') == 'AgriBridge/1.0'
        assert req.get_header('Accept') == 'application/json'
        body = json.loads(req.data)
        assert body['amount'] == '10050' and body['currency'] == 'KES'
        assert body['email'] == attempt.order.buyer.user.email
        assert body['reference'] == attempt.provider_request_id
        assert body['callback_url'] == f'http://localhost:5173/buyer/payments?payment={attempt.payment_id}'
        assert body['metadata'] == {'order_id':attempt.order_id,'payment_id':attempt.payment_id}


@pytest.mark.parametrize('url', ['http://checkout.paystack.com/a','https://evil.example/a','https://checkout.paystack.com.evil.example/a','https://checkout.paystack.com@evil.example/a'])
def test_untrusted_checkout_urls_rejected(checkout, url):
    _, client, headers, attempt = checkout
    with patch('app.services.paystack.initiate', side_effect=lambda p: {'reference':p.provider_request_id,'authorization_url':url}):
        assert client.post(f'/api/payments/{attempt.payment_id}/initiate', headers=headers['buyer'], json={}).status_code == 502
    assert attempt.payment_status == 'pending' and attempt.provider_request_id
    assert attempt.authorization_url is None


def test_timeout_keeps_reference_for_reconciliation_and_does_not_repeat_initialize(checkout):
    _, client, headers, attempt = checkout
    with patch('app.services.paystack.urlopen', side_effect=URLError('timeout')):
        assert client.post(f'/api/payments/{attempt.payment_id}/initiate', headers=headers['buyer'], json={}).status_code == 502
    reference = attempt.provider_request_id
    assert reference.startswith('AB-')
    with patch('app.services.paystack.initiate') as initiate:
        assert client.post(f'/api/payments/{attempt.payment_id}/initiate', headers=headers['buyer'], json={}).status_code == 409
        initiate.assert_not_called()
    with patch('app.services.paystack.query', return_value=verified_result(attempt)):
        response = client.post(f'/api/payments/{attempt.payment_id}/reconcile', headers=headers['buyer'])
        assert response.json['data']['payment_status'] == 'paid'
    assert attempt.transaction_reference == reference


@pytest.mark.parametrize('replacement', [
    {'amount':1}, {'amount':20000.0}, {'currency':'NGN'}, {'domain':'live'},
    {'reference':'AB-another-order'}, {'customer':{'email':'different@example.com'}},
    {'customer':None}, {'status':'success','reference':None},
])
def test_verify_mismatch_never_settles_or_releases_stock(checkout, replacement):
    _, client, headers, attempt = checkout
    initialized(checkout)
    with patch('app.services.paystack.query', return_value=verified_result(attempt, **replacement)):
        response = client.post(f'/api/payments/{attempt.payment_id}/reconcile', headers=headers['buyer'])
    assert response.status_code == 502
    assert db.session.get(Payment,attempt.payment_id).payment_status == 'pending'
    assert db.session.get(Order,attempt.order_id).order_status == 'confirmed'
    assert db.session.get(Order,attempt.order_id).stock_released_at is None


def test_pending_result_is_not_success_and_success_is_idempotent(checkout):
    _, client, headers, attempt = checkout
    initialized(checkout)
    path = f'/api/payments/{attempt.payment_id}/reconcile'
    with patch('app.services.paystack.query', return_value=verified_result(attempt, status='pending')):
        assert client.post(path,headers=headers['buyer']).json['data']['payment_status'] == 'pending'
    with patch('app.services.paystack.query', return_value=verified_result(attempt)) as query:
        assert client.post(path,headers=headers['buyer']).json['data']['payment_status'] == 'paid'
        assert client.post(path,headers=headers['buyer']).json['data']['payment_status'] == 'paid'
        query.assert_called_once()
    assert attempt.order.order_status == 'paid'
    history = client.get(f'/api/orders/{attempt.order_id}',headers=headers['buyer']).json['data']['history']
    assert [event['action'] for event in history].count('payment_verified') == 1


def test_webhook_raw_body_signatures_and_worker_verification(checkout):
    _, client, headers, attempt = checkout
    initialized(checkout)
    # Even a signed webhook's amount/status are not authoritative. Query Paystack.
    raw = json.dumps({'event':'charge.success','data':{'reference':attempt.provider_request_id,'amount':1}}).encode()
    signature = hmac.new(b'sk_test_private',raw,hashlib.sha512).hexdigest()
    url = '/api/payments/paystack/webhook'
    assert client.post(url,data=raw,content_type='application/json').status_code == 401
    assert client.post(url,data=raw+b' ',headers={'x-paystack-signature':signature},content_type='application/json').status_code == 401
    for _ in range(2):
        assert client.post(url,data=raw,headers={'x-paystack-signature':signature},content_type='application/json').status_code == 200
    assert attempt.payment_status == 'pending'
    with patch('app.services.paystack.query',return_value=verified_result(attempt)):
        assert reconcile_pending() == 1
        assert reconcile_pending() == 0
    assert attempt.payment_status == 'paid'
    assert client.post(f'/api/payments/{attempt.payment_id}/reconcile',headers=headers['buyer']).json['data']['payment_status'] == 'paid'


def test_modern_signature_rotation_replay_and_no_legacy_downgrade(checkout):
    _, client, _, _ = checkout
    raw = b'{"event":"ignored","data":{}}'
    stamp = str(int(time.time()))
    signature = hmac.new(b'whsec_private',stamp.encode()+b'.'+raw,hashlib.sha512).hexdigest()
    good = f't={stamp},v1=whk_old:{"0"*128},v1=whk_current:{signature}'
    url = '/api/payments/paystack/webhook'
    assert client.post(url,data=raw,headers={'paystack-signature':good},content_type='application/json').status_code == 200
    legacy = hmac.new(b'sk_test_private',raw,hashlib.sha512).hexdigest()
    for bad in [good.replace(stamp,str(int(stamp)-600)), good+',t='+stamp, f't={stamp},v1=whk_current:bad']:
        assert client.post(url,data=raw,headers={'paystack-signature':bad,'x-paystack-signature':legacy},content_type='application/json').status_code == 401


def test_live_key_is_blocked_before_any_http_request(checkout):
    app, client, headers, attempt = checkout
    app.config['PAYSTACK_SECRET_KEY'] = 'sk_live_private'
    with patch('app.services.paystack.urlopen') as transport:
        assert client.post(f'/api/payments/{attempt.payment_id}/initiate',headers=headers['buyer'],json={}).status_code == 503
        assert reconcile_pending() == 0
        transport.assert_not_called()
    assert attempt.provider_request_id is None


def test_legacy_unstarted_attempt_can_switch_but_started_attempt_cannot(checkout):
    _, client, headers, attempt = checkout
    attempt.payment_method = 'mpesa'; db.session.commit()
    initialized(checkout)
    assert attempt.payment_method == 'paystack'
    attempt.payment_method = 'mpesa'; attempt.provider_request_id = 'legacy-checkout'; attempt.authorization_url = None; db.session.commit()
    with patch('app.services.paystack.initiate') as initiate, patch('app.services.paystack.query') as query:
        assert client.post(f'/api/payments/{attempt.payment_id}/initiate',headers=headers['buyer'],json={}).status_code == 409
        assert client.post(f'/api/payments/{attempt.payment_id}/reconcile',headers=headers['buyer']).status_code == 409
        assert reconcile_pending() == 0
        initiate.assert_not_called(); query.assert_not_called()
    assert attempt.payment_method == 'mpesa' and attempt.provider_request_id == 'legacy-checkout'


def test_caller_cannot_inject_a_settlement_reference(ctx):
    _, client, _, headers, _ = ctx
    created = order(ctx); confirm(ctx, created['order_id'])
    response = client.post('/api/payments',headers=headers['buyer'],json={'order_id':created['order_id'],'amount':'200','payment_method':'paystack','transaction_reference':'forged'})
    assert response.status_code == 400 and Payment.query.count() == 0


def test_definite_provider_rejection_allows_another_attempt(checkout):
    _, client, headers, attempt = checkout
    from urllib.error import HTTPError
    with patch('app.services.paystack.urlopen',side_effect=HTTPError('https://api.paystack.co/transaction/initialize',400,'Bad Request',{},None)):
        response = client.post(f'/api/payments/{attempt.payment_id}/initiate',headers=headers['buyer'],json={})
    assert response.status_code == 502 and response.json['error']['code'] == 'PROVIDER_REJECTED'
    assert attempt.payment_status == 'failed'
    retry = client.post('/api/payments',headers=headers['buyer'],json={'order_id':attempt.order_id,'amount':'200','payment_method':'paystack'})
    assert retry.status_code == 201
    assert retry.json['data']['payment_id'] != attempt.payment_id


def test_reconciliation_query_uses_fixed_endpoint_and_not_client_reference(checkout):
    _, _, _, attempt = checkout
    attempt.provider_request_id = 'AB-server-reference'; db.session.commit()
    with patch('app.services.paystack.urlopen') as transport:
        transport.return_value.__enter__.return_value.read.return_value = json.dumps({'status':True,'data':verified_result(attempt)}).encode()
        assert paystack.query(attempt.provider_request_id)['reference'] == attempt.provider_request_id
        assert transport.call_args.args[0].full_url == 'https://api.paystack.co/transaction/verify/AB-server-reference'
        assert transport.call_args.args[0].get_header('User-agent') == 'AgriBridge/1.0'
        assert transport.call_args.args[0].get_header('Accept') == 'application/json'


def test_worker_rotates_unconfirmed_references_instead_of_starving_later_payments(checkout):
    _, _, _, attempt = checkout
    initialized(checkout)
    second = Payment(order_id=attempt.order_id,payment_method='paystack',amount=200,payment_status='pending',provider_request_id='AB-second')
    db.session.add(second); db.session.commit()
    with patch('app.services.paystack.query',side_effect=paystack.ProviderError('temporarily unavailable')) as query:
        assert reconcile_pending(limit=1) == 0
        assert reconcile_pending(limit=1) == 0
        assert [call.args[0] for call in query.call_args_list] == [attempt.provider_request_id,second.provider_request_id]


@pytest.mark.parametrize('status, explanation', [(401, 'API key'), (403, 'access restrictions')])
def test_key_and_access_rejections_are_distinguished_without_exposing_secrets(checkout, status, explanation):
    from io import BytesIO
    from urllib.error import HTTPError
    _, client, headers, attempt = checkout
    error = HTTPError('https://api.paystack.co/transaction/initialize', status, 'Rejected', {}, BytesIO(b'sk_test_private'))
    with patch('app.services.paystack.urlopen', side_effect=error):
        response = client.post(f'/api/payments/{attempt.payment_id}/initiate', headers=headers['buyer'], json={})
    assert response.status_code == 502
    assert explanation in response.json['error']['message']
    assert 'sk_test_private' not in response.get_data(as_text=True)
    assert attempt.payment_status == 'failed'
