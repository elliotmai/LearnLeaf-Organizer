import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { UserProvider } from './UserState.jsx';
import { PullToRefresh } from './PullToRefresh.jsx';
import ToastUpdateNotice from './ToastUpdateNotice.jsx';
import './App.css';

function App() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  // Make it available to the window so main.jsx can trigger it
  useEffect(() => {
    window.triggerAppUpdateToast = () => setShowUpdateToast(true);
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
