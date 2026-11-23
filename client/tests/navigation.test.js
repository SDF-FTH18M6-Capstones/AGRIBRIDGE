import test from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../src/features/v1/format.js';

test('preserves cart and profile onboarding intent within the app', () => {
  assert.equal(safeNext('/cart?product=12&quantity=2'), '/cart?product=12&quantity=2');
  assert.equal(safeNext('/profile?setup=buyer&next=%2Fcart'), '/profile?setup=buyer&next=%2Fcart');
  assert.equal(safeNext('/farmer/products/new'), '/farmer/products/new');
  assert.equal(safeNext('/admin/verification'), '/admin/verification');
});

test('rejects external, malformed and unrelated return destinations', () => {
  for (const value of [null, {}, 'https://evil.example/cart', '//evil.example/cart', '/\\evil.example', '/cart\nLocation:evil', '/cart-extra', '/unrelated']) {
    assert.equal(safeNext(value), null, String(value));
  }
});

test('normalizes relative segments before checking the allowed destination', () => {
  assert.equal(safeNext('/cart/../../unrelated'), null);
  assert.equal(safeNext('/buyer/../profile'), '/profile');
});

test('payment labels do not inherit order confirmation or receipt labels', async () => {
  const { paymentStatusLabel } = await import('../src/features/v1/format.js');
  assert.equal(paymentStatusLabel({ payment_status: 'pending', provider_started: false }), 'Not started');
  assert.equal(paymentStatusLabel({ payment_status: 'pending', provider_started: true }), 'Payment processing');
  assert.equal(paymentStatusLabel({ payment_status: 'pending', provider_started: true, provider_reference_unknown: true }), 'Needs review');
  assert.equal(paymentStatusLabel({ payment_status: 'paid' }), 'Paid');
  assert.equal(paymentStatusLabel({ payment_status: 'refunded' }), 'Refunded');
  assert.equal(paymentStatusLabel({ payment_status: 'failed' }), 'Failed');
});
