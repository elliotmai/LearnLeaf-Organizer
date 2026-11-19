// Tests for connected-app tokens: API token resolution and the mint/list/revoke
// endpoint handlers, against a small in-memory stand-in for Firestore.
// Run with: npm test   (node --test tests/*.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import { resolveUser } from '../netlify/functions/api.mjs';
import { handleConnections } from '../netlify/functions/connections.mjs';
import { hashToken } from '../netlify/lib/firebaseAdmin.mjs';
import { TOKEN_PREFIX, MAX_ACTIVE_TOKENS } from '../netlify/lib/apiTokens.mjs';

// ------------------------------------------------------------ mock db ------
function mockDb(seed = {}) {
  const store = new Map(); // "col/id" -> data
  for (const [path, data] of Object.entries(seed)) store.set(path, { ...data });
  const calls = { updates: [], failUpdates: false };

  const snapFor = (col, id) => {
    const path = `${col}/${id}`;
    const data = store.get(path);
    return { id, exists: data !== undefined, data: () => (data ? { ...data } : undefined), ref: docRef(col, id) };
  };
  const docRef = (col, id) => ({
    id,
    get: async () => snapFor(col, id),
    create: async data => {
      if (store.has(`${col}/${id}`)) throw new Error('ALREADY_EXISTS');
      store.set(`${col}/${id}`, { ...data });
    },
    update: async data => {
      calls.updates.push({ path: `${col}/${id}`, data });
      if (calls.failUpdates) throw new Error('update failed');
      if (!store.has(`${col}/${id}`)) throw new Error('NOT_FOUND');
      store.set(`${col}/${id}`, { ...store.get(`${col}/${id}`), ...data });
    },
  });
  const query = (col, filters) => ({
    where: (f, op, v) => query(col, [...filters, [f, op, v]]),
    limit: () => query(col, filters),
    get: async () => {
      const docs = [...store.keys()]
        .filter(k => k.startsWith(`${col}/`) && k.split('/').length === 2)
        .map(k => snapFor(col, k.slice(col.length + 1)))
        .filter(s => filters.every(([f, op, v]) => {
          const val = s.data()[f];
          if (op === '==') return val === v;
          if (op === 'array-contains') return Array.isArray(val) && val.includes(v);
          throw new Error(`op ${op} not mocked`);
        }));
      return { docs, size: docs.length };
    },
  });
  return {
    store, calls,
    collection: col => ({ doc: id => docRef(col, id), ...query(col, []) }),
  };
}

const reqWith = (token, { method = 'GET', url = 'https://x.test/api/connections', body } = {}) =>
  new Request(url, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

const fakeVerify = async idToken => {
  if (idToken === 'id-alice') return { uid: 'alice' };
  if (idToken === 'id-bob') return { uid: 'bob' };
  throw new Error('invalid id token');
};

const call = async (db, idToken, opts) => {
  const res = await handleConnections(reqWith(idToken, opts), { db, verifyIdToken: fakeVerify }).catch(e => e);
  if (res instanceof Error) return { status: res.status ?? 500, body: { error: res.message } };
  return { status: res.status, body: await res.json() };
};

const expect401 = async (db, token) => {
  await assert.rejects(resolveUser(db, reqWith(token)), e => e.status === 401 && e.message === 'Unauthorized');
};

const TOKEN = TOKEN_PREFIX + 'a'.repeat(43);
const LEGACY = 'L'.repeat(43);

// ------------------------------------------------------- resolveUser ------
test('resolves an active apiTokens token and keeps the user timezone', async () => {
  const db = mockDb({
    [`apiTokens/${hashToken(TOKEN)}`]: { uid: 'alice', label: 'Fridge Board', createdAt: Timestamp.now(), lastUsedAt: null, revokedAt: null },
    'users/alice': { timezone: 'America/Chicago' },
  });
  assert.deepEqual(await resolveUser(db, reqWith(TOKEN)), { uid: 'alice', timezone: 'America/Chicago' });
  const lastUsed = db.store.get(`apiTokens/${hashToken(TOKEN)}`).lastUsedAt;
  assert.ok(lastUsed instanceof Timestamp, 'lastUsedAt was set');
});

test('a failing lastUsedAt update does not fail the request', async () => {
  const db = mockDb({
    [`apiTokens/${hashToken(TOKEN)}`]: { uid: 'alice', label: 'x', createdAt: Timestamp.now(), lastUsedAt: null, revokedAt: null },
    'users/alice': {},
  });
  db.calls.failUpdates = true;
  const warn = console.warn; console.warn = () => {};
  try {
    assert.deepEqual(await resolveUser(db, reqWith(TOKEN)), { uid: 'alice', timezone: undefined });
  } finally { console.warn = warn; }
  assert.equal(db.calls.updates.length, 1);
});

test('a revoked apiTokens token is refused, even if a legacy field also matches', async () => {
  const db = mockDb({
    [`apiTokens/${hashToken(TOKEN)}`]: { uid: 'alice', label: 'x', createdAt: Timestamp.now(), lastUsedAt: null, revokedAt: Timestamp.now() },
    'users/alice': { apiTokenHash: hashToken(TOKEN) },
  });
  await expect401(db, TOKEN);
  assert.equal(db.calls.updates.length, 0);
});

test('an apiTokens token whose user document is gone is refused', async () => {
  const db = mockDb({ [`apiTokens/${hashToken(TOKEN)}`]: { uid: 'ghost', label: 'x', createdAt: Timestamp.now(), lastUsedAt: null, revokedAt: null } });
  await expect401(db, TOKEN);
});

test('legacy apiTokenHash and apiTokenHashes still resolve', async () => {
  const other = 'M'.repeat(43);
  const db = mockDb({
    'users/alice': { apiTokenHash: hashToken(LEGACY), timezone: 'Europe/London' },
    'users/bob': { apiTokenHashes: ['zzz', hashToken(other)] },
  });
  assert.deepEqual(await resolveUser(db, reqWith(LEGACY)), { uid: 'alice', timezone: 'Europe/London' });
  assert.deepEqual(await resolveUser(db, reqWith(other)), { uid: 'bob', timezone: undefined });
});

test('legacy hash on two users is ambiguous and refused', async () => {
  const db = mockDb({
    'users/alice': { apiTokenHash: hashToken(LEGACY) },
    'users/bob': { apiTokenHashes: [hashToken(LEGACY)] },
  });
  await expect401(db, LEGACY);
});

test('missing, short and unknown tokens all get the same 401', async () => {
  const db = mockDb({ 'users/alice': { apiTokenHash: hashToken(LEGACY) } });
  await expect401(db, '');
  await expect401(db, 'short');
  await expect401(db, 'U'.repeat(43));
});

test('an invalid stored timezone is still reported as before', async () => {
  const db = mockDb({
    [`apiTokens/${hashToken(TOKEN)}`]: { uid: 'alice', label: 'x', createdAt: Timestamp.now(), lastUsedAt: null, revokedAt: null },
    'users/alice': { timezone: 'Not/AZone' },
  });
  await assert.rejects(resolveUser(db, reqWith(TOKEN)), e => e.status === 500);
});

// ------------------------------------------------- connections handler ----
test('mint returns a token once, stores only its hash, and the token works with the API', async () => {
  const db = mockDb({ 'users/alice': {} });
  const { status, body } = await call(db, 'id-alice', { method: 'POST', body: { label: '  Fridge Board  ' } });
  assert.equal(status, 201);
  assert.equal(body.label, 'Fridge Board');
  assert.match(body.token, /^llapp_[A-Za-z0-9_-]{43}$/);
  assert.match(body.id, /^[0-9a-f]{12}$/);
  assert.ok(!Number.isNaN(Date.parse(body.createdAt)));

  const hash = hashToken(body.token);
  assert.equal(body.id, hash.slice(0, 12));
  const stored = db.store.get(`apiTokens/${hash}`);
  assert.deepEqual(Object.keys(stored).sort(), ['createdAt', 'label', 'lastUsedAt', 'revokedAt', 'uid']);
  assert.equal(stored.uid, 'alice');
  assert.equal(stored.revokedAt, null);
  assert.ok(![...db.store.values()].some(v => JSON.stringify(v).includes(body.token)), 'plain token is not stored');

  assert.equal((await resolveUser(db, reqWith(body.token))).uid, 'alice');
});

test('list returns only the caller\'s active tokens, newest first, without hashes or tokens', async () => {
  const db = mockDb({ 'users/alice': {}, 'users/bob': {} });
  const a = await call(db, 'id-alice', { method: 'POST', body: { label: 'One' } });
  await new Promise(r => setTimeout(r, 5));
  const b = await call(db, 'id-alice', { method: 'POST', body: { label: 'Two' } });
  await call(db, 'id-bob', { method: 'POST', body: { label: 'Bob app' } });
  const { status, body } = await call(db, 'id-alice');
  assert.equal(status, 200);
  assert.deepEqual(body.connections.map(c => c.label), ['Two', 'One']);
  for (const c of body.connections) {
    assert.deepEqual(Object.keys(c).sort(), ['createdAt', 'id', 'label', 'lastUsedAt']);
    assert.equal(c.lastUsedAt, null);
  }
  assert.ok(!JSON.stringify(body).includes(a.body.token) && !JSON.stringify(body).includes(hashToken(b.body.token)));
});

test('revoke stops the token, hides it from the list, and is limited to the owner', async () => {
  const db = mockDb({ 'users/alice': {} });
  const minted = (await call(db, 'id-alice', { method: 'POST', body: { label: 'Fridge Board' } })).body;

  assert.equal((await call(db, 'id-bob', { method: 'DELETE', url: `https://x.test/api/connections/${minted.id}` })).status, 404);
  assert.equal((await resolveUser(db, reqWith(minted.token))).uid, 'alice');

  const r = await call(db, 'id-alice', { method: 'DELETE', url: `https://x.test/api/connections/${minted.id}` });
  assert.deepEqual(r, { status: 200, body: { ok: true } });
  assert.deepEqual((await call(db, 'id-alice')).body.connections, []);
  await expect401(db, minted.token);
  assert.equal((await call(db, 'id-alice', { method: 'DELETE', url: `https://x.test/api/connections/${minted.id}` })).status, 404);
});

test('revoke via POST /revoke { id } works, and a full hash is never accepted', async () => {
  const db = mockDb({ 'users/alice': {} });
  const minted = (await call(db, 'id-alice', { method: 'POST', body: { label: 'X' } })).body;
  const full = hashToken(minted.token);
  assert.equal((await call(db, 'id-alice', { method: 'POST', url: 'https://x.test/api/connections/revoke', body: { id: full } })).status, 404);
  assert.equal((await call(db, 'id-alice', { method: 'POST', url: 'https://x.test/api/connections/revoke', body: { id: minted.id } })).status, 200);
  await expect401(db, minted.token);
});

test('label is validated: required, trimmed, at most 60 characters', async () => {
  const db = mockDb();
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: {} })).status, 400);
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: { label: '   ' } })).status, 400);
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: { label: 42 } })).status, 400);
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: { label: 'x'.repeat(61) } })).status, 400);
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: { label: 'x'.repeat(60) } })).status, 201);
});

test(`at most ${MAX_ACTIVE_TOKENS} active tokens; revoking one frees a slot`, async () => {
  const db = mockDb();
  let last;
  for (let i = 0; i < MAX_ACTIVE_TOKENS; i++) last = await call(db, 'id-alice', { method: 'POST', body: { label: `App ${i}` } });
  assert.equal(last.status, 201);
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: { label: 'One too many' } })).status, 400);
  await call(db, 'id-alice', { method: 'DELETE', url: `https://x.test/api/connections/${last.body.id}` });
  assert.equal((await call(db, 'id-alice', { method: 'POST', body: { label: 'Fits now' } })).status, 201);
});

test('the endpoints need a valid Firebase ID token; an API token is not one', async () => {
  const db = mockDb({ 'users/alice': { apiTokenHash: hashToken(LEGACY) } });
  assert.equal((await call(db, null)).status, 401);
  assert.equal((await call(db, 'garbage')).status, 401);
  assert.equal((await call(db, LEGACY)).status, 401);
  assert.equal((await call(db, 'id-alice', { method: 'PUT' })).status, 404);
});

test('works on the direct function path too', async () => {
  const db = mockDb();
  const r = await call(db, 'id-alice', { url: 'https://x.test/.netlify/functions/connections' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { connections: [] });
});

// ------------------------------------------------------ Hive passes -------
import { makeKeys, signPass } from '../netlify/lib/hiveAssertion.mjs';

const hiveKeys = makeKeys();
const hiveReq = (pass) => new Request('https://x.test/api/summary', { headers: { authorization: `Hive ${pass}` } });
const findUid = async (email) => ({ 'alice@example.com': 'alice' })[email] ?? null;
const alice = { uid: 'hive-a', email: 'alice@example.com', email_verified: true };

test('a Hive pass made for LearnLeaf finds the person by their confirmed email', async () => {
  process.env.HIVE_PUBLIC_KEY = hiveKeys.publicKey;
  const db = mockDb({ 'users/alice': { timezone: 'America/Chicago' } });
  assert.deepEqual(await resolveUser(db, hiveReq(signPass(alice, 'learnleaf', hiveKeys.signingKey)), { findUid }), { uid: 'alice', timezone: 'America/Chicago' });
});

test('Hive passes for another app, forged, unconfirmed, or with no LearnLeaf account get 401', async () => {
  process.env.HIVE_PUBLIC_KEY = hiveKeys.publicKey;
  const db = mockDb({ 'users/alice': {} });
  const bad = [
    signPass(alice, 'kitchenhub', hiveKeys.signingKey),
    signPass(alice, 'learnleaf', makeKeys().signingKey),
    signPass({ ...alice, email_verified: false }, 'learnleaf', hiveKeys.signingKey),
    signPass({ ...alice, email: 'stranger@example.com' }, 'learnleaf', hiveKeys.signingKey),
    'junk',
  ];
  for (const p of bad) await assert.rejects(resolveUser(db, hiveReq(p), { findUid }), (e) => e.status === 401);
  delete process.env.HIVE_PUBLIC_KEY;
});
