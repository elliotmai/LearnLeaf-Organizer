/*
 * Hive passes: how Hive tells one of your apps "this is who's signed in".
 *
 * A pass is a JWT signed with Ed25519 (alg EdDSA) by Hive's server, using
 * HIVE_SIGNING_KEY, which only Hive holds. Each app checks it with
 * HIVE_PUBLIC_KEY. A pass is made for one app (aud = that app's id in Hive's
 * catalog) and lasts two minutes, so one app can't replay it to another and
 * an old one is useless.
 *
 *   { iss: 'hive', aud: 'learnleaf', sub: <Hive uid>, email, email_verified,
 *     name, iat, exp }
 *
 * This file is identical in Hive (signs) and in every app (verifies). Copy it
 * as is; app-template keeps the master copy beside its tests.
 *
 * Keys: `node scripts/hive-keys.mjs` in the Hive repo prints a fresh pair,
 * each base64 DER on one line, ready for an environment variable.
 */
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';

export const ISSUER = 'hive';
export const PASS_SECONDS = 120;
const LEEWAY = 30; // seconds of clock drift allowed between servers

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const dec = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

const privateKey = (b64) => createPrivateKey({ key: Buffer.from(String(b64).trim(), 'base64'), format: 'der', type: 'pkcs8' });
const publicKey = (b64) => createPublicKey({ key: Buffer.from(String(b64).trim(), 'base64'), format: 'der', type: 'spki' });

/** A fresh Ed25519 pair as one-line base64 DER strings. */
export function makeKeys() {
  const { privateKey: k, publicKey: p } = generateKeyPairSync('ed25519');
  return {
    signingKey: k.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    publicKey: p.export({ format: 'der', type: 'spki' }).toString('base64'),
  };
}

/** Sign a pass for `app`. `user` = { uid, email, email_verified, name }. */
export function signPass(user, app, signingKey, { now = Date.now() } = {}) {
  if (!app || typeof app !== 'string') throw new Error('no app');
  if (!user?.uid) throw new Error('no user');
  const iat = Math.floor(now / 1000);
  const head = `${enc({ alg: 'EdDSA', typ: 'JWT' })}.${enc({
    iss: ISSUER, aud: app, sub: user.uid,
    email: user.email || null, email_verified: user.email_verified === true, name: user.name || null,
    iat, exp: iat + PASS_SECONDS,
  })}`;
  return `${head}.${sign(null, Buffer.from(head), privateKey(signingKey)).toString('base64url')}`;
}

/**
 * Check a pass made for `app`. Returns its claims; throws on anything wrong.
 * The error messages are for logs only: answer every failure the same way.
 */
export function verifyPass(pass, app, hivePublicKey, { now = Date.now() } = {}) {
  const parts = String(pass).split('.');
  if (parts.length !== 3) throw new Error('malformed pass');
  let header, claims;
  try { header = dec(parts[0]); claims = dec(parts[1]); } catch { throw new Error('malformed pass'); }
  if (header.alg !== 'EdDSA') throw new Error('wrong algorithm');
  const ok = verify(null, Buffer.from(`${parts[0]}.${parts[1]}`), publicKey(hivePublicKey), Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new Error('bad signature');
  const secs = Math.floor(now / 1000);
  if (claims.iss !== ISSUER) throw new Error('wrong issuer');
  if (!app || claims.aud !== app) throw new Error('made for another app');
  if (!(claims.exp + LEEWAY > secs)) throw new Error('expired');
  if (!(claims.iat - LEEWAY <= secs)) throw new Error('issued in the future');
  if (claims.exp - claims.iat > PASS_SECONDS) throw new Error('lasts too long');
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) throw new Error('no subject');
  return claims;
}
