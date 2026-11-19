import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify, createPublicKey } from 'node:crypto';
import { _resetCache, accessToken, accountForEmail, createAccount, customToken } from '../netlify/lib/firebaseAccounts.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const sa = { client_email: 'svc@proj.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }), project_id: 'proj' };
const NOW = 1_800_000_000_000;
const parts = (t) => t.split('.').map((p, i) => (i < 2 ? JSON.parse(Buffer.from(p, 'base64url')) : p));
const signedBySa = (t) => { const [h, b, s] = t.split('.'); return verify('RSA-SHA256', Buffer.from(`${h}.${b}`), createPublicKey(publicKey.export({ type: 'spki', format: 'pem' })), Buffer.from(s, 'base64url')); };

/** A fake Google: records calls, answers token + lookup + create. */
function fakeGoogle({ users = {} } = {}) {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    const ok = (body) => ({ ok: true, status: 200, json: async () => body });
    if (url.endsWith('/token')) return ok({ access_token: 'at-1', expires_in: 3600 });
    const body = JSON.parse(init.body);
    if (url.endsWith('accounts:lookup')) { const uid = users[body.email[0]]; return ok(uid ? { users: [{ localId: uid }] } : {}); }
    if (url.endsWith('/accounts')) return ok({ localId: 'new-uid' });
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { f, calls };
}

beforeEach(() => _resetCache());

test('custom token has the shape Firebase expects and is signed by the service account', () => {
  const t = customToken('user-9', { sa, now: NOW });
  const [h, c] = parts(t);
  assert.equal(h.alg, 'RS256');
  assert.equal(c.iss, sa.client_email);
  assert.equal(c.sub, sa.client_email);
  assert.equal(c.aud, 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit');
  assert.equal(c.uid, 'user-9');
  assert.equal(c.exp - c.iat, 3600);
  assert.ok(signedBySa(t));
  assert.throws(() => customToken('', { sa }), /bad uid/);
});

test('access token is fetched once with a signed JWT, then cached', async () => {
  const g = fakeGoogle();
  assert.equal(await accessToken({ sa, fetch: g.f, now: NOW }), 'at-1');
  assert.equal(await accessToken({ sa, fetch: g.f, now: NOW + 60_000 }), 'at-1');
  assert.equal(g.calls.length, 1);
  const assertion = new URLSearchParams(g.calls[0].init.body).get('assertion');
  assert.ok(signedBySa(assertion));
  assert.match(parts(assertion)[1].scope, /identitytoolkit/);
});

test('finds an account by email, and creates one with a verified email', async () => {
  const g = fakeGoogle({ users: { 'a@example.com': 'uid-a' } });
  assert.equal(await accountForEmail('a@example.com', { sa, fetch: g.f, now: NOW }), 'uid-a');
  assert.equal(await accountForEmail('b@example.com', { sa, fetch: g.f, now: NOW }), null);
  assert.equal(await createAccount({ email: 'b@example.com', name: 'B' }, { sa, fetch: g.f, now: NOW }), 'new-uid');
  const create = g.calls.find((c) => c.url.endsWith('/accounts'));
  assert.equal(create.url, 'https://identitytoolkit.googleapis.com/v1/projects/proj/accounts');
  assert.deepEqual(JSON.parse(create.init.body), { email: 'b@example.com', emailVerified: true, displayName: 'B' });
  assert.equal(create.init.headers.authorization, 'Bearer at-1');
});

test('a Google error surfaces as an error', async () => {
  const f = async (url) => (url.endsWith('/token') ? { ok: true, json: async () => ({ access_token: 't' }) } : { ok: false, status: 403, json: async () => ({ error: { message: 'PERMISSION_DENIED' } }) });
  await assert.rejects(accountForEmail('a@example.com', { sa, fetch: f, now: NOW }), /PERMISSION_DENIED/);
});
