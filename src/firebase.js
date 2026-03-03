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
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch {
        // Give up — auth will still work, just without guaranteed persistence
      }
    }
  }
})();