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
 */
import { HIVE_ORIGIN as DEFAULT_ORIGIN, HIVE_OLD_ORIGINS } from './config/hive.js';

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
      const res = await fetch('/api/hive/exchange', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pass: e.data.pass }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(body.error || `Sign-in answered ${res.status}`), { code: body.code });
      await ready;
      const { signInWithCustomToken } = await import('firebase/auth');
      const { user } = await signInWithCustomToken(auth, body.token);
      await onSignedIn?.(user, { created: !!body.created });
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
