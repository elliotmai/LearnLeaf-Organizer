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
      setShowUpdateToast(true);
    };
  
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
            <ToastUpdateNotice onReload={() => {
              setShowUpdateToast(false); // ✅ clear before reload
              window.location.reload();
            }} />            
          )}
        </div>
      </PullToRefresh>
    </UserProvider>
  );
}

export default App;
