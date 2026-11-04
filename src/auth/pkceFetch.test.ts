import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPkceFetch } from './pkceFetch';
const origin = 'https://project.supabase.co';
const digest = async (value: string) => createHash('sha256').update(value).digest('base64');
test('native Auth transport upgrades a plain fallback to the RFC7636 S256 challenge', async () => {
  let sent: RequestInit | undefined;
  const transport = createPkceFetch(async (_url, init) => { sent = init; return new Response('{}'); }, origin, digest);
  await transport(`${origin}/auth/v1/signup`, { method: 'POST', body: JSON.stringify({ email: 'test@example.invalid', code_challenge: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', code_challenge_method: 'plain' }) });
  const body = JSON.parse(String(sent?.body));
  assert.equal(body.code_challenge, 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  assert.equal(body.code_challenge_method, 's256');
  assert.equal(body.email, 'test@example.invalid');
});
test('native hashing cannot alter other hosts, database requests, or existing S256 challenges', async () => {
  const bodies: unknown[] = [];
  const transport = createPkceFetch(async (_url, init) => { bodies.push(init?.body); return new Response('{}'); }, origin, async () => { throw new Error('Should not hash'); });
  const body = JSON.stringify({ code_challenge: 'already-hashed', code_challenge_method: 's256' });
  await transport(`${origin}/auth/v1/recover`, { method: 'POST', body });
  await transport(`${origin}/rest/v1/rpc/data`, { method: 'POST', body });
  await transport('https://other.example/auth/v1/signup', { method: 'POST', body });
  assert.deepEqual(bodies, [body, body, body]);
});
