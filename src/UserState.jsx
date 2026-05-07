import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { auth, firestore } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAllFromStore } from './db.js';
import { refreshAllData } from './LearnLeaf_Functions.jsx';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [refreshing, setRefreshing]   = useState(false);
  const refreshingRef = useRef(false);

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

          // If IDB already has data (returning visit / page refresh), pages will
          // mount and read the cached data immediately. Then we re-pull from
          // Firebase in the background and bump dataVersion so pages re-render
          // with fresh data. If IDB is empty, loginUser/loginWithGoogle already
          // ran fetchCriticalData before navigating, so no extra fetch here.
          const cached = await getAllFromStore('tasks');
          if (cached.length > 0) {
            refreshAllData(firebaseUser.uid)
              .then(() => setDataVersion(v => v + 1))
              .catch(() => {});
          }
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

  // Manual refresh (pull-to-refresh on mobile, or any explicit refresh trigger).
  // Clears IDB stores so deleted-in-Firebase records don't linger.
  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await refreshAllData(user.id, { clear: true });
      setDataVersion(v => v + 1);
    } catch (e) {
      console.warn('refreshData failed:', e);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, dataLoading, dataVersion, refreshing, updateUser, setDataLoading, refreshData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
