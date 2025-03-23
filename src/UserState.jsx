import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  indexedDBLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const auth = getAuth();
  const db = getFirestore();

  const [user, setUser] = useState(() => {
    const storedUserData = localStorage.getItem('user');
    return storedUserData ? JSON.parse(storedUserData) : null;
  });

  const [loading, setLoading] = useState(true); // Track auth loading

  const updateUser = (newUserData) => {
    if (!newUserData) {
      setUser(null);
      localStorage.removeItem('user');
      return;
    }

    const mergedData = {
      ...user,
      ...newUserData,
      notifications: newUserData.notifications !== undefined
        ? newUserData.notifications
        : user?.notifications,
      notificationsFrequency:
        newUserData.notificationsFrequency || user?.notificationsFrequency,
    };

    if (JSON.stringify(user) !== JSON.stringify(mergedData)) {
      setUser(mergedData);
      localStorage.setItem('user', JSON.stringify(mergedData));
      console.log('Updated User Data in localStorage:', mergedData);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authListenerTriggered = false;

    setPersistence(auth, indexedDBLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!isMounted || authListenerTriggered) return;
          authListenerTriggered = true;

          if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = {
                id: firebaseUser.uid,
                name: userDoc.data().name,
                email: userDoc.data().email,
                timeFormat: userDoc.data().timeFormat || '12h',
                dateFormat: userDoc.data().dateFormat || 'MM/DD/YYYY',
                notifications:
                  userDoc.data().notifications !== undefined
                    ? userDoc.data().notifications
                    : false,
                notificationsFrequency:
                  userDoc.data().notificationsFrequency || [true, false, false, false],
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

          // Mark loading complete regardless of auth state
          setLoading(false);
        });

        return () => unsubscribe();
      })
      .catch((error) => {
        console.error('Error setting persistence:', error);
        setLoading(false); // Prevent permanent loading state on error
      });

    return () => {
      isMounted = false;
    };
  }, [auth, db]);

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
