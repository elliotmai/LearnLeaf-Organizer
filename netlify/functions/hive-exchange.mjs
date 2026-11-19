/*
 * POST /api/hive/exchange  { pass }  → { token, created }
 *
 * This app's half of "sign in once with Hive". Hive hands the page a pass
 * (see netlify/lib/hiveAssertion.mjs); the page sends it here; this checks
 * it and answers with a Firebase custom token for the matching account, which
 * the page passes to signInWithCustomToken (src/lib/hive.js does all of it).
 *
 * The account is the one with the pass's email (Hive only issues passes for
 * Google-verified emails). With none, a new account is made, unless
 * HIVE_NEW_ACCOUNTS=off, for apps only existing users should get into.
 *
 * Environment (Netlify → Site configuration → Environment):
 *   HIVE_APP_ID               this app's id in Hive's catalog, e.g. learnleaf
 *   HIVE_PUBLIC_KEY           from Hive's `node scripts/hive-keys.mjs`
 *   FIREBASE_SERVICE_ACCOUNT  as for Connected apps
 *   HIVE_NEW_ACCOUNTS         optional; "off" to refuse people with no account
 */
import { verifyPass } from '../lib/hiveAssertion.mjs';
import { accountForEmail, createAccount, customToken } from '../lib/firebaseAccounts.mjs';

export const config = { path: '/api/hive/exchange' };

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** The whole decision, with its dependencies passed in so it can be tested. */
export async function exchange(pass, { appId, publicKey, allowNew = true, find = accountForEmail, create = createAccount, mint = customToken }) {
  let claims;
  try {
    claims = verifyPass(pass, appId, publicKey);
  } catch (e) {
    console.warn('[hive-exchange] refused pass:', e.message);
    return json(401, { error: 'Unauthorized' });
  }
  if (!claims.email || claims.email_verified !== true) return json(401, { error: 'Unauthorized' });
  let uid = await find(claims.email);
  let created = false;
  if (!uid) {
    if (!allowNew) return json(403, { error: 'No account for this email', code: 'no-account' });
    uid = await create({ email: claims.email, name: claims.name });
    created = true;
  }
  return json(200, { token: mint(uid, { claims: { hive: true } }), created });
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const appId = process.env.HIVE_APP_ID;
  const publicKey = process.env.HIVE_PUBLIC_KEY;
  if (!appId || !publicKey || !process.env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: 'Hive sign-in is not set up for this app' });
  let pass = '';
  try { ({ pass } = await req.json()); } catch { /* fall through */ }
  if (typeof pass !== 'string' || !pass) return json(400, { error: 'Missing pass' });
  try {
    return await exchange(pass, { appId, publicKey, allowNew: (process.env.HIVE_NEW_ACCOUNTS || '').toLowerCase() !== 'off' });
  } catch (e) {
    console.error('[hive-exchange] failed:', e.message);
    return json(502, { error: 'Could not sign you in right now' });
  }
};
