import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { UserProvider } from './UserState.jsx';
import { PullToRefresh } from './PullToRefresh.jsx';
import { firestore } from './firebase.js';
import { collection } from 'firebase/firestore';
import { syncIndexedDBToFirestore, processUserUpdateQueue, processDeleteQueue } from './LearnLeaf_Functions.jsx';
import { TASKS_STORE, SUBJECTS_STORE, PROJECTS_STORE, clearStore } from './db.js'
import ToastUpdateNotice from './ToastUpdateNotice.jsx';
import NetworkStatusToast from './NetworkStatusToast.jsx';

import './App.css';

function App() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [appVersion, setAppVersion] = useState(null);
  const [networkToast, setNetworkToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    const updated = localStorage.getItem('appJustUpdated') === 'true';
    const version = localStorage.getItem('appVersion');

    if (updated) {
      setAppVersion(version);
      setShowUpdateToast(true);

      localStorage.removeItem('appJustUpdated');
      localStorage.removeItem('appVersion');

      setTimeout(() => {
        setShowUpdateToast(false);
      }, 5000);
    }
  }, []);

  const handleOnline = async () => {
    setNetworkToast({
      show: true,
      message: 'You are back online. Syncing changes...',
      type: 'online'
    });

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.id) return;

      const userPath = ['users', user.id];
      const userTasks = collection(firestore, ...userPath, 'tasks');
      const userSubjects = collection(firestore, ...userPath, 'subjects');
      const userProjects = collection(firestore, ...userPath, 'projects');

      // Push local changes to Firestore
      await Promise.all([
        syncIndexedDBToFirestore(userTasks, TASKS_STORE),
        syncIndexedDBToFirestore(userSubjects, SUBJECTS_STORE),
        syncIndexedDBToFirestore(userProjects, PROJECTS_STORE)
      ]);

      // Handle pending deletes
      await processDeleteQueue(user.id);

      // Handle pending user details updates
      await processUserUpdateQueue();

      // Clear stores after successful sync
      await Promise.all([
        clearStoreByName(DELETED_STORE),
        clearStoreByName(USER_STORE)
      ]);
      
    } catch (error) {
      console.error('[SYNC] Error syncing data on reconnect:', error);
    }
  };

  const handleOffline = () => {
    localStorage.setItem('lastOfflineTime', Date.now());
    setNetworkToast({ show: true, message: 'You are offline. Changes will be saved locally.', type: 'offline' });
  };

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  return (
    <UserProvider>
      <PullToRefresh>
        <div className="app-container">
          <main className="main-content">
            <Outlet />
          </main>
          {showUpdateToast && (
            <ToastUpdateNotice version={appVersion} onClose={() => setShowUpdateToast(false)} />
          )}

          {networkToast.show && (
            <NetworkStatusToast
              message={networkToast.message}
              type={networkToast.type}
              onClose={() => setNetworkToast({ ...networkToast, show: false })}
            />
          )}

        </div>
      </PullToRefresh>
    </UserProvider>
  );
}

export default App;
