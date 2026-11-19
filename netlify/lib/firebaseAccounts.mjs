/*
 * Firebase Auth admin tasks without firebase-admin/auth (which breaks
 * Netlify's function runtime; see apiTokens.mjs). Everything here is signed
 * locally with the service account's key and sent to Google's REST API.
 *
 *   accountForEmail(email)      → uid of the account with that email, or null
 *   createAccount({ email })    → uid of a new account (email marked verified)
 *   customToken(uid)            → token for signInWithCustomToken in the page
 *
 * Needs FIREBASE_SERVICE_ACCOUNT (the same one Connected apps uses). The
 * default firebase-adminsdk service account already has the access this needs.
 */
import { createPrivateKey, sign } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const IDT = 'https://identitytoolkit.googleapis.com/v1';
const CUSTOM_TOKEN_AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const SCOPES = 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase';

export function serviceAccount(raw = process.env.FIREBASE_SERVICE_ACCOUNT) {
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(text);
  if (!sa.client_email || !sa.private_key || !sa.project_id) throw new Error('FIREBASE_SERVICE_ACCOUNT is missing fields');
  return sa;
}

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwt(claims, sa) {
  const head = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc(claims)}`;
  return `${head}.${sign('RSA-SHA256', Buffer.from(head), createPrivateKey(sa.private_key)).toString('base64url')}`;
}

/** Token for `signInWithCustomToken`. Good for an hour; Firebase swaps it for a normal session. */
export function customToken(uid, { sa = serviceAccount(), now = Date.now(), claims } = {}) {
  if (typeof uid !== 'string' || !uid || uid.length > 128) throw new Error('bad uid');
  const iat = Math.floor(now / 1000);
  return jwt({ iss: sa.client_email, sub: sa.client_email, aud: CUSTOM_TOKEN_AUD, iat, exp: iat + 3600, uid, ...(claims ? { claims } : {}) }, sa);
}

let cached = { token: null, until: 0, who: null };
/** OAuth access token for Google's admin APIs, from the service account. */
export async function accessToken({ sa = serviceAccount(), fetch: f = fetch, now = Date.now() } = {}) {
  if (cached.token && cached.who === sa.client_email && now < cached.until) return cached.token;
  const iat = Math.floor(now / 1000);
  const assertion = jwt({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat, exp: iat + 3600 }, sa);
  const res = await f(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Google sign-in for the service account failed (${res.status})`);
  cached = { token: body.access_token, until: now + (Number(body.expires_in || 3600) - 300) * 1000, who: sa.client_email };
  return cached.token;
}

async function admin(path, payload, { sa = serviceAccount(), fetch: f = fetch, now } = {}) {
  const res = await f(`${IDT}/projects/${sa.project_id}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${await accessToken({ sa, fetch: f, now })}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Firebase Auth ${path} failed (${res.status}): ${body.error?.message || ''}`.trim());
  return body;
}

export async function accountForEmail(email, opts) {
  const body = await admin('accounts:lookup', { email: [email] }, opts);
  return body.users?.[0]?.localId ?? null;
}

export async function createAccount({ email, name }, opts) {
  const body = await admin('accounts', { email, emailVerified: true, ...(name ? { displayName: name } : {}) }, opts);
  if (!body.localId) throw new Error('Firebase Auth did not return a uid');
  return body.localId;
}

/** For tests: forget the cached access token. */
export const _resetCache = () => { cached = { token: null, until: 0, who: null }; };
