import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserProvider } from './UserState.jsx';  // User context provider
import { PullToRefresh } from './PullToRefresh.jsx'
import './App.css';  // Assuming you have some global styles

function App() {
  return (
    <PullToRefresh>
      <UserProvider>
        <div className="app-container">
          <main className="main-content">
            <Outlet /> {/* This will render the current route's component */}
          </main>
        </div>
      </UserProvider>
    </PullToRefresh>
  );
}

export default App;