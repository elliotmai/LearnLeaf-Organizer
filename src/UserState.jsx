import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, firestore } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAllFromStore } from './db.js';
import { backgroundFetchRemaining } from './LearnLeaf_Functions.jsx';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          const data = snap.exists() ? snap.data() : {};
          const userObj = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: data.name || '',
            timeFormat: data.timeFormat || '12h',
            dateFormat: data.dateFormat || 'MM/DD/YYYY',
            notifications: data.notifications || false,
            notificationsFrequency: data.notificationsFrequency || [true,false,false,false],
            icsURLs: data.icsURLs || {},
          };
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));

          // If IDB already has data (returning visit / page refresh), kick off
          // a quiet background refresh to pick up anything missed since last load.
          // If IDB is empty this is a fresh login — loginUser already ran
          // fetchCriticalData so we only need the background pass here too.
          const cached = await getAllFromStore('tasks');
          if (cached.length > 0) {
            // IDB is warm — silently refresh in background, no spinner needed
            backgroundFetchRemaining(firebaseUser.uid).catch(() => {});
          }
          // If IDB is empty, loginUser / loginWithGoogle handles the full seed
          // before navigating, so nothing extra needed here.
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateUser = (userObj) => {
    setUser(userObj);
    if (userObj) localStorage.setItem('user', JSON.stringify(userObj));
    else localStorage.removeItem('user');
  };

  return (
    <UserContext.Provider value={{ user, loading, dataLoading, updateUser, setDataLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}