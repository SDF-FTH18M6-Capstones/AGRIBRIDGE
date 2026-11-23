"""Paystack hosted checkout. V1 deliberately accepts test keys/results only."""
import hashlib
import hmac
import json
import re
import time
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

from flask import current_app


class ProviderError(Exception):
    pass


class ProviderRejected(ProviderError):
    """The initialization was definitively rejected, rather than timed out."""


def configured():
    key = current_app.config.get('PAYSTACK_SECRET_KEY') or ''
    callback = urlsplit(current_app.config.get('PAYSTACK_CALLBACK_URL') or '')
    return key.startswith('sk_test_') and len(key) > 8 and callback.scheme in {'http', 'https'} and bool(callback.netloc) and not callback.fragment and not callback.username


def minor_units(amount):
    value = Decimal(amount) * 100
    if not value.is_finite() or value != value.to_integral_value() or value < 300:
        raise ProviderError('Paystack requires a minimum of KSh 3.00 and at most two decimal places.')
    return int(value)


def checkout_url_allowed(url):
    if not isinstance(url, str):
        return False
    parsed = urlsplit(url)
    return parsed.scheme == 'https' and parsed.netloc == 'checkout.paystack.com' and bool(parsed.path.strip('/'))


def _json_request(endpoint, payload=None):
    if not configured():
        raise ProviderError('Configure a Paystack test secret key and callback URL. Live payments are disabled in V1.')
    req = Request('https://api.paystack.co' + endpoint,
                  data=json.dumps(payload).encode() if payload is not None else None,
                  # Paystack can reject urllib's default Python user agent with 403.
                  headers={'Content-Type': 'application/json', 'Accept': 'application/json',
                           'User-Agent': 'AgriBridge/1.0',
                           'Authorization': 'Bearer ' + current_app.config['PAYSTACK_SECRET_KEY']})
    try:
        with urlopen(req, timeout=15) as response:
            result = json.load(response)
    except HTTPError as error:
        if payload is not None and error.code in {400, 401, 403, 422}:
            if error.code == 401:
                raise ProviderRejected('Paystack did not accept the API key. Check the backend test secret key and restart the API and worker.') from error
            if error.code == 403:
                raise ProviderRejected('Paystack refused this API request (HTTP 403). Check API key permissions and server access restrictions.') from error
            raise ProviderRejected('Paystack rejected checkout initialization. Ask the administrator to check the test key and KES merchant configuration.') from error
        raise ProviderError('Paystack could not confirm this request. Check its status before starting another payment.') from error
    except (URLError, TimeoutError, ValueError, OSError) as error:
        # Never expose credentials/provider response bodies or treat a timeout as failure.
        raise ProviderError('Paystack could not confirm this request. Check its status before starting another payment.') from error
    if payload is not None and isinstance(result, dict) and result.get('status') is False:
        raise ProviderRejected('Paystack rejected checkout initialization. Check merchant configuration before trying again.')
    if not isinstance(result, dict) or result.get('status') is not True or not isinstance(result.get('data'), dict):
        raise ProviderError('Paystack returned an unconfirmed result. Check its status before retrying.')
    return result['data']


def initiate(payment):
    callback = urlsplit(current_app.config['PAYSTACK_CALLBACK_URL'])
    query = dict(parse_qsl(callback.query)); query['payment'] = str(payment.payment_id)
    callback = urlunsplit(callback._replace(query=urlencode(query)))
    data = _json_request('/transaction/initialize', {
        'email': payment.order.buyer.user.email,
        'amount': str(minor_units(payment.amount)), 'currency': 'KES',
        'reference': payment.provider_request_id, 'callback_url': callback,
        'metadata': {'order_id': payment.order_id, 'payment_id': payment.payment_id},
    })
    if data.get('reference') != payment.provider_request_id or not checkout_url_allowed(data.get('authorization_url')):
        raise ProviderError('Paystack did not return a matching checkout. Check payment status before retrying.')
    return data


def query(reference):
    return _json_request('/transaction/verify/' + quote(reference, safe=''))


def validate_result(payment, result):
    """Bind verified data to this attempt before any status or stock mutation."""
    customer = result.get('customer') if isinstance(result, dict) else None
    if (not isinstance(result, dict) or payment.payment_method != 'paystack'
            or not payment.provider_request_id or result.get('reference') != payment.provider_request_id
            or result.get('domain') != 'test' or result.get('currency') != 'KES'
            or type(result.get('amount')) is not int or result['amount'] != minor_units(payment.amount)
            or not isinstance(customer, dict) or not isinstance(customer.get('email'), str)
            or customer['email'].casefold() != payment.order.buyer.user.email.casefold()):
        raise ProviderError('Paystack verification did not match the order. Contact support for reconciliation.')


def valid_webhook(raw_body, headers):
    if not configured():
        return False
    modern = headers.get('paystack-signature')
    if modern is not None:
        secret = current_app.config.get('PAYSTACK_WEBHOOK_SECRET') or ''
        if not secret.startswith('whsec_'):
            return False
        timestamps, signatures = [], []
        for part in modern.split(','):
            key, _, value = part.strip().partition('=')
            if key == 't': timestamps.append(value)
            if key == 'v1':
                kid, _, signature = value.partition(':')
                if kid.startswith('whk_'): signatures.append(signature)
        if len(timestamps) != 1 or not re.fullmatch(r'[0-9]{1,12}', timestamps[0]):
            return False
        if abs(time.time() - int(timestamps[0])) > 300:
            return False
        expected = hmac.new(secret.encode(), timestamps[0].encode() + b'.' + raw_body, hashlib.sha512).hexdigest()
        return any(re.fullmatch(r'[0-9a-f]{128}', signature) and hmac.compare_digest(expected, signature) for signature in signatures)
    # Merchants still using Paystack's legacy signature scheme.
    signature = headers.get('x-paystack-signature', '')
    expected = hmac.new(current_app.config['PAYSTACK_SECRET_KEY'].encode(), raw_body, hashlib.sha512).hexdigest()
    return bool(re.fullmatch(r'[0-9a-f]{128}', signature) and hmac.compare_digest(expected, signature))
