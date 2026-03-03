import { initializeApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA8rr1TEUUZ9b_PqR475mszkoC0aMoHeTE",
  authDomain: "learnleaf-organizer.firebaseapp.com",
  projectId: "learnleaf-organizer",
  storageBucket: "learnleaf-organizer.appspot.com",
  messagingSenderId: "998389863314",
  appId: "1:998389863314:web:3da40aae1598c7904c674b",
  measurementId: "G-8XX0HRFBCX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Resolves when auth persistence is configured — await this before any sign-in call
export const authReady = (async () => {
  // Pre-test IndexedDB before letting Firebase attempt it.
  // In some deployed environments (Safari ITP, incognito, certain hosts)
  // Firebase's own internal IDB open throws an unrecoverable error.
  const idbAvailable = await new Promise(resolve => {
    try {
      const req = indexedDB.open('__firebase_idb_test__');
      req.onsuccess = () => { req.result.close(); indexedDB.deleteDatabase('__firebase_idb_test__'); resolve(true); };
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });

  if (idbAvailable) {
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
      return;
    } catch { /* fall through */ }
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, inMemoryPersistence);
    } catch {
      // Give up — auth will still work, just without guaranteed persistence
    }
  }
})();