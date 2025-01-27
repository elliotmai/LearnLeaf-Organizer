// @flow
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const auth = getAuth();
    const db = getFirestore();

    // Initialize user state from localStorage
    const [user, setUser] = useState(() => {
        const storedUserData = localStorage.getItem('user');
        return storedUserData ? JSON.parse(storedUserData) : null;
    });

    // Enhanced setUser to manage localStorage
    const updateUser = (newUserData) => {
        if (!newUserData) {
            // Clear user state and localStorage
            setUser(null);
            localStorage.removeItem('user');
            return;
        }
    
        // Merge new data with the existing user state, guarding against undefined values
        const mergedData = {
            ...user, // Keep existing fields
            ...newUserData, // Overwrite only provided fields
            notifications: newUserData.notifications !== undefined ? newUserData.notifications : user?.notifications,
            notificationsFrequency: newUserData.notificationsFrequency || user?.notificationsFrequency,
        };
    
        // Avoid re-updating localStorage with unchanged data
        if (JSON.stringify(user) !== JSON.stringify(mergedData)) {
            setUser(mergedData);
            localStorage.setItem('user', JSON.stringify(mergedData));
            console.log("Updated User Data in localStorage:", mergedData);
        }
    };        

    useEffect(() => {
        let isMounted = true; // To track component mount state
        let authListenerTriggered = false; // Ensure the listener is called only once
    
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!isMounted || authListenerTriggered) return;
            authListenerTriggered = true; // Prevent multiple triggers
    
            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
    
                if (userDoc.exists()) {
                    const userData = {
                        id: firebaseUser.uid,
                        name: userDoc.data().name,
                        email: userDoc.data().email,
                        timeFormat: userDoc.data().timeFormat || '12h',
                        dateFormat: userDoc.data().dateFormat || 'MM/DD/YYYY',
                        notifications: userDoc.data().notifications !== undefined ? userDoc.data().notifications : false,
                        notificationsFrequency: userDoc.data().notificationsFrequency || [true, false, false, false],
                    };
                    console.log("User Data Constructed:", userData);
                    updateUser(userData); // Pass full user data
                } else {
                    console.error("No user document found!");
                    updateUser(null); // Clear state if no document exists
                }
            } else {
                updateUser(null); // Clear state if user logs out
            }
        });
    
        return () => {
            isMounted = false; // Cleanup on component unmount
            unsubscribe();
        };
    }, [auth, db]);    
    
    return (
        <UserContext.Provider value={{ user, updateUser }}>
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