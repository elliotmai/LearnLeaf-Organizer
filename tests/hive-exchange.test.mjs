import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeKeys, signPass } from '../netlify/lib/hiveAssertion.mjs';
import { exchange } from '../netlify/functions/hive-exchange.mjs';

const keys = makeKeys();
const passFor = (user, app = 'learnleaf') => signPass(user, app, keys.signingKey);
const me = { uid: 'h1', email: 'me@example.com', email_verified: true, name: 'Me' };
const deps = (o = {}) => ({
  appId: 'learnleaf', publicKey: keys.publicKey,
  find: async (email) => ({ 'me@example.com': 'uid-me' })[email] ?? null,
  create: async () => 'uid-new',
  mint: (uid) => `token-for-${uid}`,
  ...o,
});
const run = async (pass, o) => { const r = await exchange(pass, deps(o)); return { status: r.status, body: await r.json() }; };

test('an existing account signs straight in', async () => {
  assert.deepEqual(await run(passFor(me)), { status: 200, body: { token: 'token-for-uid-me', created: false } });
});
test('a new person gets an account, unless the app is closed to new people', async () => {
  const stranger = { ...me, email: 'new@example.com' };
  assert.deepEqual(await run(passFor(stranger)), { status: 200, body: { token: 'token-for-uid-new', created: true } });
  assert.equal((await run(passFor(stranger), { allowNew: false })).status, 403);
});
test('a pass for another app, a forged pass, or an unverified email gets nothing', async () => {
  assert.equal((await run(passFor(me, 'kitchenhub'))).status, 401);
  assert.equal((await run(signPass(me, 'learnleaf', makeKeys().signingKey))).status, 401);
  assert.equal((await run(passFor({ ...me, email_verified: false }))).status, 401);
  assert.equal((await run('junk')).status, 401);
});
