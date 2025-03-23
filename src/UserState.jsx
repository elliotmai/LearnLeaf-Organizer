import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase'; // Use centralized Firebase instance

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [loading, setLoading] = useState(true);

  const updateUser = (newUserData) => {
    if (!newUserData) {
      setUser(null);
      localStorage.removeItem('user');
      return;
    }

    const merged = {
      ...user,
      ...newUserData,
      notifications: newUserData.notifications ?? user?.notifications,
      notificationsFrequency: newUserData.notificationsFrequency || user?.notificationsFrequency,
    };

    if (JSON.stringify(user) !== JSON.stringify(merged)) {
      setUser(merged);
      localStorage.setItem('user', JSON.stringify(merged));
      console.log('Updated User Data in localStorage:', merged);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        await setPersistence(auth, indexedDBLocalPersistence);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!isMounted) return;

          if (firebaseUser) {
            const ref = doc(firestore, 'users', firebaseUser.uid);
            const snap = await getDoc(ref);

            if (snap.exists()) {
              const data = snap.data();
              const userData = {
                id: firebaseUser.uid,
                name: data.name,
                email: data.email,
                timeFormat: data.timeFormat || '12h',
                dateFormat: data.dateFormat || 'MM/DD/YYYY',
                notifications: data.notifications ?? false,
                notificationsFrequency: data.notificationsFrequency || [true, false, false, false],
              };
              console.log('User Data Constructed:', userData);
              updateUser(userData);
            } else {
              console.error('No user document found!');
              updateUser(null);
            }
          } else {
            updateUser(null);
          }

          setLoading(false);
        });

        // Save unsubscribe to cleanup later
        return unsubscribe;
      } catch (err) {
        console.error('Auth init error:', err);
        setLoading(false);
      }
    };

    let unsubscribeRef;
    initAuth().then((unsub) => {
      unsubscribeRef = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubscribeRef) unsubscribeRef();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
