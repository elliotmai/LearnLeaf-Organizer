/*
 * Connected apps: mint, list and revoke API tokens for the signed-in user.
 * Called by the web app (Account & Preferences → Connected apps), same origin.
 *
 * Auth: "Authorization: Bearer <Firebase ID token>" from
 * `await auth.currentUser.getIdToken()`, verified with the Admin SDK. This is
 * NOT the API token: an API token cannot mint or revoke tokens.
 *
 * Routes (netlify.toml sends /api/connections here, ahead of the /api/* rule):
 *   GET    /api/connections          -> { connections: [{ id, label, createdAt, lastUsedAt }] }
 *   POST   /api/connections          { label } -> 201 { id, label, createdAt, token }  (token shown once)
 *   DELETE /api/connections/:id      -> { ok: true }   (404 if it is not one of yours)
 *   POST   /api/connections/revoke   { id } -> { ok: true }   (same, for clients that avoid DELETE)
 *
 * Required environment variable: FIREBASE_SERVICE_ACCOUNT (same as api.mjs).
 */
import { randomUUID } from 'node:crypto';
import { HttpError, json, getDb, getAdminAuth, bearer } from '../lib/firebaseAdmin.mjs';
import { listTokens, mintToken, revokeToken } from '../lib/apiTokens.mjs';

async function readBody(req) {
  const text = await req.text();
  if (!text) return {};
  try {
    const body = JSON.parse(text);
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch { /* fall through */ }
  throw new HttpError(400, 'Body must be a JSON object');
}

// The request handler with its dependencies passed in, so it can be tested
// without Firebase: db is a Firestore instance, verifyIdToken(idToken) -> { uid }.
export async function handleConnections(req, { db, verifyIdToken }) {
  const idToken = bearer(req);
  if (!idToken) throw new HttpError(401, 'Sign in again to manage connected apps.');
  let uid;
  try { ({ uid } = await verifyIdToken(idToken)); } catch { uid = null; }
  if (!uid) throw new HttpError(401, 'Sign in again to manage connected apps.');

  const path = new URL(req.url).pathname.replace(/^\/(\.netlify\/functions\/connections|api\/connections)\/?/, '');
  const [segment, ...rest] = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (rest.length) throw new HttpError(404, 'Not found');

  if (!segment && req.method === 'GET') return json(200, { connections: await listTokens(db, uid) });
  if (!segment && req.method === 'POST') {
    const { label } = await readBody(req);
    return json(201, await mintToken(db, uid, label));
  }
  if (segment === 'revoke' && req.method === 'POST') {
    const { id } = await readBody(req);
    return json(200, await revokeToken(db, uid, id));
  }
  if (segment && segment !== 'revoke' && req.method === 'DELETE') return json(200, await revokeToken(db, uid, segment));
  throw new HttpError(404, 'Not found');
}

export default async function handler(req) {
  const requestId = randomUUID().slice(0, 8);
  try {
    const auth = getAdminAuth();
    return await handleConnections(req, { db: getDb(), verifyIdToken: t => auth.verifyIdToken(t) });
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    console.error(`[connections ${requestId}]`, e);
    return json(500, { error: 'Something went wrong. Try again.', requestId });
  }
}
