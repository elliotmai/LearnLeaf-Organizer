import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { UserProvider } from './UserState.jsx';
import { PullToRefresh } from './PullToRefresh.jsx';
import ToastUpdateNotice from './ToastUpdateNotice.jsx';
import './App.css';

function App() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    window.onServiceWorkerUpdate = () => {
      console.log('[App] SW update handler fired');
      setShowUpdateToast(true);
    };

    if (window.__hasPendingUpdate) {
      setShowUpdateToast(true);
      window.__hasPendingUpdate = false; // ✅ kill it
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
            <ToastUpdateNotice
              onReload={() => {
                localStorage.removeItem('hasPendingUpdate'); // optional fallback
                window.__hasPendingUpdate = false; // ✅ clear the flag
                setShowUpdateToast(false); // ✅ hide toast before reload
                window.location.reload();
              }}
            />
          )}
        </div>
      </PullToRefresh>
    </UserProvider>
  );
}

export default App;
