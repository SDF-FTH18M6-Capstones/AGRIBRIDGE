import test from 'node:test';
import assert from 'node:assert/strict';
import { strongPassword } from '../src/features/security/passwordPolicy.js';
import { claimTabOwnership } from '../src/services/tabOwnership.js';

class Storage {
  constructor(session, token = 'tab-token') { this.values = new Map([['agribridge_session', JSON.stringify({ session_id: session })], ['token', token]]); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
class Channel {
  static peers = new Set();
  constructor() { Channel.peers.add(this); }
  postMessage(data) { for (const peer of Channel.peers) if (peer !== this) queueMicrotask(() => peer.onmessage?.({ data })); }
  close() { Channel.peers.delete(this); }
}

test('mixed passwords enforce every category, byte length and predictable-password rejection', () => {
  assert.equal(strongPassword('HarvestFields2026!'), true);
  for (const value of ['short', 'Password123456!', 'harvestfields2026!', 'HARVESTFIELDS2026!', 'HarvestFields!!!!', 'HarvestFields2026', 'ü'.repeat(37)]) assert.equal(strongPassword(value), false, value);
});

test('a copied tab is signed out without signing out its original', async () => {
  const original = new Storage('same-session'); let originalCleared = false;
  const first = claimTabOwnership({ storage: original, Channel, delay: 10, onCopied() { originalCleared = true; original.removeItem('token'); original.removeItem('agribridge_session'); } });
  await first.ready;
  const copy = new Storage('same-session'); let copyCleared = false;
  const second = claimTabOwnership({ storage: copy, Channel, delay: 10, onCopied() { copyCleared = true; copy.removeItem('token'); copy.removeItem('agribridge_session'); } });
  await second.ready;
  assert.equal(copyCleared, true); assert.equal(originalCleared, false); assert.equal(original.getItem('token'), 'tab-token'); assert.equal(copy.getItem('token'), null);
  first.close(); second.close();
});

test('separate sessions remain independent even for the same account', async () => {
  const a = new Storage('session-A'); const b = new Storage('session-B'); let cleared = 0;
  const first = claimTabOwnership({ storage: a, Channel, delay: 10, onCopied() { cleared++; } }); await first.ready;
  const second = claimTabOwnership({ storage: b, Channel, delay: 10, onCopied() { cleared++; } }); await second.ready;
  assert.equal(cleared, 0); a.removeItem('token'); assert.equal(b.getItem('token'), 'tab-token'); first.close(); second.close();
});


test('an in-flight renewal cannot restore credentials after this tab signs out', async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.sessionStorage;
  const originalFetch = globalThis.fetch;
  globalThis.window = new EventTarget();
  const storage = new Storage('session-race');
  storage.values.set('agribridge_refresh_token', 'refresh-before-logout');
  storage.values.set('agribridge_auth_token', 'access-before-logout');
  globalThis.sessionStorage = storage;
  let finish;
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  try {
    const session = await import('../src/services/tabSession.js');
    const pending = session.refreshSession();
    session.clearSession();
    finish({ ok: true, json: async () => ({ data: { access_token: 'new-access', refresh_token: 'new-refresh', session: { session_id: 'session-race' } } }) });
    await assert.rejects(pending, /signed out/);
    assert.equal(storage.getItem('agribridge_auth_token'), null);
    assert.equal(storage.getItem('agribridge_refresh_token'), null);
  } finally { globalThis.window = originalWindow; globalThis.sessionStorage = originalStorage; globalThis.fetch = originalFetch; }
});
