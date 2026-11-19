import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeKeys, signPass, verifyPass, PASS_SECONDS } from '../netlify/lib/hiveAssertion.mjs';

const keys = makeKeys();
const other = makeKeys();
const NOW = 1_800_000_000_000;
const user = { uid: 'hive-1', email: 'a@example.com', email_verified: true, name: 'A' };
const pass = (o = {}) => signPass(o.user ?? user, o.app ?? 'learnleaf', o.key ?? keys.signingKey, { now: o.now ?? NOW });

test('a pass checks out for the app it was made for', () => {
  const c = verifyPass(pass(), 'learnleaf', keys.publicKey, { now: NOW + 1000 });
  assert.equal(c.sub, 'hive-1');
  assert.equal(c.email, 'a@example.com');
  assert.equal(c.email_verified, true);
});

test('another app cannot use it', () => {
  assert.throws(() => verifyPass(pass(), 'kitchenhub', keys.publicKey, { now: NOW }), /another app/);
});

test('a pass signed with any other key is refused', () => {
  assert.throws(() => verifyPass(pass({ key: other.signingKey }), 'learnleaf', keys.publicKey, { now: NOW }), /bad signature/);
});

test('editing the claims breaks the signature', () => {
  const [h, , s] = pass().split('.');
  const forged = Buffer.from(JSON.stringify({ iss: 'hive', aud: 'learnleaf', sub: 'someone-else', email_verified: true, iat: NOW / 1000, exp: NOW / 1000 + 60 })).toString('base64url');
  assert.throws(() => verifyPass(`${h}.${forged}.${s}`, 'learnleaf', keys.publicKey, { now: NOW }), /bad signature/);
});

test('expires after two minutes, allowing a little clock drift', () => {
  assert.doesNotThrow(() => verifyPass(pass(), 'learnleaf', keys.publicKey, { now: NOW + PASS_SECONDS * 1000 + 10_000 }));
  assert.throws(() => verifyPass(pass(), 'learnleaf', keys.publicKey, { now: NOW + PASS_SECONDS * 1000 + 60_000 }), /expired/);
  assert.throws(() => verifyPass(pass(), 'learnleaf', keys.publicKey, { now: NOW - 120_000 }), /future/);
});

test('junk and wrong algorithms are refused', () => {
  assert.throws(() => verifyPass('nope', 'learnleaf', keys.publicKey), /malformed/);
  assert.throws(() => verifyPass('a.b.c', 'learnleaf', keys.publicKey), /malformed/);
  const [, b, s] = pass().split('.');
  const none = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  assert.throws(() => verifyPass(`${none}.${b}.${s}`, 'learnleaf', keys.publicKey, { now: NOW }), /algorithm/);
});

test('an unverified email is carried through as false, never true', () => {
  const c = verifyPass(pass({ user: { uid: 'x', email: 'b@example.com' } }), 'learnleaf', keys.publicKey, { now: NOW });
  assert.equal(c.email_verified, false);
});
