/*
 * Shared helpers for the Netlify functions (api.mjs, connections.mjs).
 * Lives outside netlify/functions so Netlify does not deploy it as a function;
 * esbuild bundles it into each function that imports it.
 */
import { createHash, createPublicKey, verify } from 'node:crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// Not firebase-admin/auth: it loads jwks-rsa → jose 6, an ES module that
// Netlify's function runtime cannot require(), which took the whole API down.
// Sign-in tokens are verified below with node:crypto instead.

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT is not set');
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try { return JSON.parse(text); } catch { throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT is not valid JSON'); }
}

function ensureApp() {
  if (!getApps().length) initializeApp({ credential: cert(readServiceAccount()) });
}

export function getDb() {
  ensureApp();
  return getFirestore();
}

/*
 * Verifying a Firebase ID token, per Google's documented checks
 * (firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library):
 * RS256, signed by one of Google's published securetoken keys (by `kid`),
 * aud = project id, iss = https://securetoken.google.com/<project id>,
 * exp in the future, iat and auth_time in the past, non-empty sub.
 */
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache = { at: 0, maxAge: 0, certs: null };

async function googleCerts() {
  if (certCache.certs && Date.now() - certCache.at < certCache.maxAge) return certCache.certs;
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Google signing keys answered ${res.status}`);
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600) * 1000;
  certCache = { at: Date.now(), maxAge, certs: await res.json() };
  return certCache.certs;
}

const b64url = part => Buffer.from(part, 'base64url');

/** Returns { uid } for a valid ID token; throws otherwise. `keys` is injectable for tests. */
export async function verifyFirebaseIdToken(idToken, { projectId, keys = googleCerts, now = Date.now() } = {}) {
  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(b64url(parts[0]).toString('utf8'));
  const claims = JSON.parse(b64url(parts[1]).toString('utf8'));
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('wrong algorithm');
  const pem = (await keys())[header.kid];
  if (!pem) throw new Error('unknown signing key');
  const ok = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey(pem), b64url(parts[2]));
  if (!ok) throw new Error('bad signature');
  const secs = Math.floor(now / 1000);
  if (claims.aud !== projectId) throw new Error('wrong audience');
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('wrong issuer');
  if (!(claims.exp > secs)) throw new Error('expired');
  if (!(claims.iat <= secs + 300)) throw new Error('issued in the future');
  if (claims.auth_time !== undefined && !(claims.auth_time <= secs + 300)) throw new Error('auth_time in the future');
  if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) throw new Error('no subject');
  return { uid: claims.sub };
}

export function getAdminAuth() {
  const projectId = readServiceAccount().project_id;
  return { verifyIdToken: idToken => verifyFirebaseIdToken(idToken, { projectId }) };
}

export const hashToken = token => createHash('sha256').update(token).digest('hex');

// Reads "Authorization: Bearer <x>"; '' when absent.
export const bearer = req => {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};
