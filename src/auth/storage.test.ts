import test from 'node:test';
import assert from 'node:assert/strict';
import { createChunkedStorage, type SecureKeyValueStorage } from './chunkedStorage';
import { parseAuthCallback } from './callback';

function memory() {
  const values = new Map<string, string>();
  let failIndex = false;
  const native: SecureKeyValueStorage = {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { if (failIndex && key.endsWith('.index')) throw new Error('Device storage unavailable'); values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
  return { values, storage: createChunkedStorage(native), failCommit: () => { failIndex = true; } };
}
test('large Unicode sessions round-trip with every native value below the secure-store limit', async () => {
  const { storage, values } = memory();
  const session = JSON.stringify({ access_token: 'test-only.'.repeat(1300), displayName: 'स्वच्छता 🏠'.repeat(500) });
  await storage.setItem('session', session);
  assert.equal(await storage.getItem('session'), session);
  assert.ok(values.size > 2);
  for (const value of values.values()) assert.ok(Buffer.byteLength(value, 'utf8') <= 1800);
});
test('failed secure-store commit preserves the previous sign-in and removes staged chunks', async () => {
  const { storage, values, failCommit } = memory();
  await storage.setItem('session', 'previous test session');
  const before = new Map(values);
  failCommit();
  await assert.rejects(storage.setItem('session', 'new test session'.repeat(1000)), /unavailable/);
  assert.deepEqual(values, before);
  assert.equal(await storage.getItem('session'), 'previous test session');
});
test('queued replacement and sign-out remove obsolete credential chunks', async () => {
  const { storage, values } = memory();
  await Promise.all([storage.setItem('session', 'first'.repeat(2500)), storage.setItem('session', 'second')]);
  assert.equal(await storage.getItem('session'), 'second');
  assert.equal(values.size, 2);
  await storage.removeItem('session');
  assert.equal(await storage.getItem('session'), null);
  assert.equal(values.size, 0);
});
test('missing credential chunks fail visibly and explicit recovery permits a new sign-in', async () => {
  const { storage, values } = memory();
  await storage.setItem('session', 'credential'.repeat(500));
  values.delete([...values.keys()].find(key => !key.endsWith('.index'))!);
  await assert.rejects(storage.getItem('session'), /incomplete/);
  await storage.removeItem('session');
  await storage.setItem('session', 'replacement');
  assert.equal(await storage.getItem('session'), 'replacement');
});
test('oversized sessions and invalid storage keys cannot overwrite valid credentials', async () => {
  const { storage } = memory();
  await storage.setItem('session', 'saved');
  await assert.rejects(storage.setItem('session', 'x'.repeat(256 * 1024 + 1)), /too large/);
  await assert.rejects(storage.setItem('../other', 'value'), /key is invalid/);
  assert.equal(await storage.getItem('session'), 'saved');
});
test('auth callback accepts only one PKCE code on the exact app callback', () => {
  const redirect = 'cleanos-team://auth/callback';
  assert.deepEqual(parseAuthCallback(`${redirect}?code=one-use-code&sb_flow_id=flow_123`, redirect), { code: 'one-use-code', flowId: 'flow_123' });
  for (const value of [
    'https://untrusted.example/auth/callback?code=code',
    'cleanos-team://other/callback?code=code',
    `${redirect}/extra?code=code`,
    `${redirect}?code=first&code=second`,
    `${redirect}#access_token=implicit-token`,
    `${redirect}?code=code&sb_flow_id=bad%20flow`,
  ]) assert.equal(parseAuthCallback(value, redirect), null);
  assert.deepEqual(parseAuthCallback(`${redirect}?error=access_denied`, redirect), { failed: true });
});
