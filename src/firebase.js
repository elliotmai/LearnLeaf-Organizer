// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, indexedDBLocalPersistence, setPersistence } from 'firebase/auth';
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

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app)

setPersistence(auth, indexedDBLocalPersistence).catch((error) => {
    console.error('Failed to set persistence:', error);
  });
  
export { auth, firestore };
