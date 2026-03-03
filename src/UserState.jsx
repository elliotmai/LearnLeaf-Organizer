import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, firestore } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAllFromStore, saveToStore, clearStore } from './db.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(firestore, 'users', firebaseUser.uid));
          const data = snap.exists() ? snap.data() : {};
          const userObj = { id: firebaseUser.uid, email: firebaseUser.email, name: data.name || '', timeFormat: data.timeFormat || '12h', dateFormat: data.dateFormat || 'MM/DD/YYYY', notifications: data.notifications || false, notificationsFrequency: data.notificationsFrequency || [true,false,false,false], icsURLs: data.icsURLs || {} };
          setUser(userObj);
          localStorage.setItem('user', JSON.stringify(userObj));
        } catch { setUser(null); }
      } else { setUser(null); localStorage.removeItem('user'); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const updateUser = (userObj) => {
    setUser(userObj);
    if (userObj) localStorage.setItem('user', JSON.stringify(userObj));
    else localStorage.removeItem('user');
  };

  // Change the context value to expose setDataLoading
return <UserContext.Provider 
  value={{ user, loading, dataLoading, updateUser, setDataLoading }}>
  {children}
</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
