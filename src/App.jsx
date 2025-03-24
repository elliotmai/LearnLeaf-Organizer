import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { UserProvider } from './UserState.jsx';
import { PullToRefresh } from './PullToRefresh.jsx';
import ToastUpdateNotice from './ToastUpdateNotice.jsx';
import './App.css';

function App() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [appVersion, setAppVersion] = useState(null);

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

        </div>
      </PullToRefresh>
    </UserProvider>
  );
}

export default App;
