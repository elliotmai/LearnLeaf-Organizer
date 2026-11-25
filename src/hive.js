/**
 * Sign in with Hive: when this app is opened inside Hive and Hive is signed
 * in, the person is signed in here too, with no second login.
 *
 *   import { connectHive } from '@/lib/hive';
 *   useEffect(() => connectHive({
 *     auth,                                  // this app's Firebase Auth
 *     ready,                                 // optional promise to await before signing in
 *     onSignedIn: (user, { created }) => {}, // e.g. load data, make a profile doc
 *     onSignedOut: () => {},                 // Hive has nobody signed in: show the normal login
 *     onError: (err) => {},                  // err.code 'no-account' if the app takes no new people
 *   }), []);
 *
 * Call it where a signed-out person would land (the login screen). It does
 * nothing outside Hive, when HIVE_ORIGIN isn't set, or when someone is
 * already signed in here. Needs netlify/functions/hive-exchange.mjs.
 *
 * HIVE_ORIGIN (src/config/hive.js, or VITE_HIVE_ORIGIN) is Hive's address.
 * Messages from anywhere else are ignored.
 *
 * Outside Hive, on Hive's shared domain, it signs you in from Hive's shared
 * sign-in instead (signInFromSharedSession), so there's one login either way.
 */
import {
  HIVE_APP_ID, HIVE_ORIGIN as DEFAULT_ORIGIN, HIVE_OLD_ORIGINS, SHARED_DOMAIN, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL,
} from './config/hive.js';

export const HIVE_ORIGIN = (import.meta.env.VITE_HIVE_ORIGIN || DEFAULT_ORIGIN || '').replace(/\/$/, '');
const ORIGINS = [HIVE_ORIGIN, ...HIVE_OLD_ORIGINS].filter(Boolean);

export const inHive = () => Boolean(HIVE_ORIGIN) && window.parent !== window;

export function connectHive({ auth, ready, onSignedIn, onSignedOut, onError } = {}) {
  if (!inHive() || !auth) return () => {};
  let busy = false;
  const onMessage = async (e) => {
    if (!ORIGINS.includes(e.origin) || e.source !== window.parent) return;
    if (e.data?.type === 'hive:signed-out') { onSignedOut?.(); return; }
    if (e.data?.type !== 'hive:pass' || typeof e.data.pass !== 'string') return;
    if (busy || auth.currentUser) return;
    busy = true;
    try {
      const { user, created } = await signInWithPass(auth, e.data.pass, ready);
      await onSignedIn?.(user, { created });
    } catch (err) {
      console.warn('[hive] sign-in failed:', err.message);
      onError?.(err);
    } finally {
      busy = false;
    }
  };
  window.addEventListener('message', onMessage);
  // Only the real Hive (whichever address it's at) receives this; others are dropped.
  for (const o of ORIGINS) window.parent.postMessage({ type: 'hive:hello', v: 1 }, o);
  return () => window.removeEventListener('message', onMessage);
}

/** Trade a Hive pass for a sign-in here (netlify/functions/hive-exchange.mjs). */
async function signInWithPass(auth, pass, ready) {
  const res = await fetch('/api/hive/exchange', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pass }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Sign-in answered ${res.status}`), { code: body.code });
  await ready;
  const { signInWithCustomToken } = await import('firebase/auth');
  const { user } = await signInWithCustomToken(auth, body.token);
  try { localStorage.setItem(VIA_HIVE, '1'); } catch { /* private mode */ }
  return { user, created: !!body.created };
}

/** Set when this sign-in came from Hive; logging out clears all storage, and it with it. */
const VIA_HIVE = 'learnleaf.viaHive';

/**
 * Signed in here through Hive, and Hive has since signed out: `onSignedOut`.
 * Inside Hive, when Hive says so; on the shared domain, when Hive's shared
 * sign-in cookie is gone. A sign-in of your own here is left alone.
 */
export function watchHiveSignOut(onSignedOut) {
  let via = null;
  try { via = localStorage.getItem(VIA_HIVE); } catch { /* private mode */ }
  if (via !== '1') return () => {};
  if (inHive()) {
    const onMessage = (e) => {
      if (ORIGINS.includes(e.origin) && e.source === window.parent && e.data?.type === 'hive:signed-out') onSignedOut();
    };
    window.addEventListener('message', onMessage);
    for (const o of ORIGINS) window.parent.postMessage({ type: 'hive:hello', v: 1 }, o);
    return () => window.removeEventListener('message', onMessage);
  }
  if (onSharedDomain() && !document.cookie.split(/;\s*/).some((c) => c.startsWith('hive-auth'))) onSignedOut();
  return () => {};
}

export const onSharedDomain = (host = location.hostname) => host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`);

/**
 * Outside Hive, on the shared domain: if Hive is signed in (its session cookie
 * is shared by every app here), sign in here as the same person. Resolves to
 * the signed-in user, or null when Hive isn't signed in or this can't be done.
 */
export async function signInFromSharedSession({ auth, ready } = {}) {
  if (inHive() || !onSharedDomain() || !auth || !HIVE_ORIGIN) return null;
  await ready;
  if (auth.currentUser) return null;
  try {
    const { createBrowserClient } = await import('@supabase/ssr');
    const sb = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookieOptions: { name: 'hive-auth', path: '/', sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 400, domain: `.${SHARED_DOMAIN}` },
      auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data } = await sb.auth.getSession(); // refreshes an expired session, and saves it back for every app
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch(`${HIVE_ORIGIN}/api/hive/pass`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ app: HIVE_APP_ID }),
    });
    if (!res.ok) return null;
    const { pass } = await res.json();
    return (await signInWithPass(auth, pass, ready)).user;
  } catch (err) {
    console.warn('[hive] shared sign-in failed:', err.message);
    return null;
  }
}
