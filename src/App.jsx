import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { UserProvider } from './UserState.jsx';
import { PullToRefresh } from './PullToRefresh.jsx';
import ToastUpdateNotice from './ToastUpdateNotice.jsx';
import './App.css';

function App() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    // Callback from main.jsx when update is ready
    window.onServiceWorkerUpdate = () => {
      console.log('[Toast] Triggering update toast...');
      setShowUpdateToast(true);
    };

    // If update happened before React was ready
    if (window.__hasPendingUpdate) {
      setShowUpdateToast(true);
      delete window.__hasPendingUpdate;
    }
  }, []);

  return (
    <UserProvider>
      <PullToRefresh>
        <div className="app-container">
          <main className="main-content">
            <Outlet />
          </main>
          {showUpdateToast && (
            <ToastUpdateNotice onReload={() => window.location.reload()} />
          )}
        </div>
      </PullToRefresh>
    </UserProvider>
  );
}

export default App;
