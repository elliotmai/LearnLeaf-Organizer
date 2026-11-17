/*
 * Connected-app API tokens.
 *
 * A token is "llapp_" + 32 random bytes (base64url), minted on the server and
 * shown to the owner once. Only its SHA-256 hex is stored, as the document id:
 *
 *   apiTokens/{sha256hex} = { uid, label, createdAt, lastUsedAt, revokedAt }
 *
 * The client never sees the hash. It gets a public id (the first 12 hex chars)
 * for display and revoke; revoke resolves it server-side among the caller's own
 * tokens. Client reads and writes on apiTokens/** are denied by security rules;
 * only the Admin SDK touches it.
 */
import { randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpError, hashToken } from './firebaseAdmin.mjs';

export const TOKEN_PREFIX = 'llapp_';
export const MAX_ACTIVE_TOKENS = 20;
export const MAX_LABEL_LENGTH = 60;
const PUBLIC_ID_LENGTH = 12;
const PUBLIC_ID_RE = /^[0-9a-f]{12}$/;

export const publicId = hash => hash.slice(0, PUBLIC_ID_LENGTH);

const iso = v => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : null);

const toPublic = doc => {
  const d = doc.data();
  return { id: publicId(doc.id), label: d.label, createdAt: iso(d.createdAt), lastUsedAt: iso(d.lastUsedAt) };
};

async function activeTokensFor(db, uid) {
  const snap = await db.collection('apiTokens').where('uid', '==', uid).get();
  return snap.docs
    .filter(doc => !doc.data().revokedAt)
    .sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0));
}

export async function listTokens(db, uid) {
  return (await activeTokensFor(db, uid)).map(toPublic);
}

export async function mintToken(db, uid, rawLabel) {
  if (typeof rawLabel !== 'string') throw new HttpError(400, 'Give the app a name.');
  const label = rawLabel.trim();
  if (!label) throw new HttpError(400, 'Give the app a name.');
  if (label.length > MAX_LABEL_LENGTH) throw new HttpError(400, `Keep the name to ${MAX_LABEL_LENGTH} characters or fewer.`);
  if ((await activeTokensFor(db, uid)).length >= MAX_ACTIVE_TOKENS) {
    throw new HttpError(400, `You can connect up to ${MAX_ACTIVE_TOKENS} apps. Revoke one to add another.`);
  }
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const hash = hashToken(token);
  const createdAt = Timestamp.now();
  // create() fails if the id exists, so a (vanishingly unlikely) collision can never overwrite.
  await db.collection('apiTokens').doc(hash).create({ uid, label, createdAt, lastUsedAt: null, revokedAt: null });
  return { id: publicId(hash), label, createdAt: createdAt.toDate().toISOString(), token };
}

export async function revokeToken(db, uid, id) {
  if (typeof id !== 'string' || !PUBLIC_ID_RE.test(id)) throw new HttpError(404, 'No connected app with that id.');
  const match = (await activeTokensFor(db, uid)).find(doc => publicId(doc.id) === id);
  if (!match) throw new HttpError(404, 'No connected app with that id.');
  await match.ref.update({ revokedAt: Timestamp.now() });
  return { ok: true };
}

// Bearer-token lookup for the API. Returns:
//   { uid }        an active connected-app token (lastUsedAt is updated best-effort)
//   { revoked }    the token exists but was revoked: refuse, do not fall back
//   null           not a connected-app token: the caller tries the legacy fields
export async function lookupToken(db, hash) {
  const ref = db.collection('apiTokens').doc(hash);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.revokedAt || typeof d.uid !== 'string' || !d.uid) return { revoked: true };
  const touched = Promise.resolve()
    .then(() => ref.update({ lastUsedAt: Timestamp.now() }))
    .catch(e => console.warn('apiTokens lastUsedAt update failed:', e?.message || e));
  return { uid: d.uid, touched };
}
