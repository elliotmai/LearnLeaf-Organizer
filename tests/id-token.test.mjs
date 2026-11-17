// Firebase ID token verification without firebase-admin/auth (see netlify/lib/firebaseAdmin.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyFirebaseIdToken } from '../netlify/lib/firebaseAdmin.mjs';

const PROJECT = 'learnleaf-organizer';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const keys = async () => ({ k1: publicKey.export({ type: 'spki', format: 'pem' }) });
const NOW = 1_800_000_000_000;
const secs = NOW / 1000;

function token(claims = {}, { kid = 'k1', alg = 'RS256', key = privateKey } = {}) {
  const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const body = { aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'user-1', iat: secs - 60, exp: secs + 3000, auth_time: secs - 60, ...claims };
  const head = `${enc({ alg, kid, typ: 'JWT' })}.${enc(body)}`;
  return `${head}.${sign('RSA-SHA256', Buffer.from(head), key).toString('base64url')}`;
}
const check = t => verifyFirebaseIdToken(t, { projectId: PROJECT, keys, now: NOW });

test('accepts a token Google signed for this project', async () => {
  assert.deepEqual(await check(token()), { uid: 'user-1' });
});
test('refuses a token signed by any other key', async () => {
  await assert.rejects(check(token({}, { key: other.privateKey })), /bad signature/);
});
test('refuses a token whose claims were edited after signing', async () => {
  const [h, , s] = token().split('.');
  const forged = Buffer.from(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'someone-else', iat: secs, exp: secs + 3000 })).toString('base64url');
  await assert.rejects(check(`${h}.${forged}.${s}`), /bad signature/);
});
test('refuses another project, another issuer, an expired token, no subject', async () => {
  await assert.rejects(check(token({ aud: 'other-project' })), /audience/);
  await assert.rejects(check(token({ iss: 'https://securetoken.google.com/other' })), /issuer/);
  await assert.rejects(check(token({ exp: secs - 1 })), /expired/);
  await assert.rejects(check(token({ sub: '' })), /subject/);
});
test('refuses an unknown key id, a non-RS256 header, and junk', async () => {
  await assert.rejects(check(token({}, { kid: 'nope' })), /unknown signing key/);
  await assert.rejects(check(token({}, { alg: 'HS256' })), /algorithm/);
  await assert.rejects(check('not-a-token'), /malformed/);
});
