import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
import SplashScreen from './SplashScreen.jsx';
import App from './App.jsx';
import LoginForm from './pages/LoginForm.jsx';
import RegistrationForm from './pages/RegisterForm.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import TaskList from './pages/TaskView.jsx';
import SubjectDashboard from './pages/SubjectDashboard.jsx';
import SubjectTasks from './pages/SubjectTasks.jsx';
import ProjectDashboard from './pages/ProjectDashboard.jsx';
import ProjectTasks from './pages/ProjectTasks.jsx';
import UserProfile from './pages/UserProfile.jsx';
import ArchiveDashboard from './pages/ArchiveDashboard.jsx';
import CalendarView from './pages/CalendarPage.jsx';
import Logo from './LearnLeaf_Logo_Circle.png';

// Global flag to control splash
let forceSplash = false;

// Check for updates only in standalone PWA mode
if (
  'serviceWorker' in navigator &&
  window.matchMedia('(display-mode: standalone)').matches
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((registration) => {
      registration.onupdatefound = () => {
        const newWorker = registration.installing;

        newWorker.onstatechange = () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // Show splash while waiting for the new worker to take control
            forceSplash = true;
            renderApp(); // render splash

            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.log('New service worker is controlling. Reloading...');
              window.location.reload();
            });
          }
        };
      };
    });
  });
}

// Splash-screen-aware render function
const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      {forceSplash ? <SplashScreen /> : <RouterProvider router={router} />}
    </React.StrictMode>
  );
};

// Auth wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        backgroundColor: '#c1d4d2',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <img
          src={Logo}
          alt="LearnLeaf Organizer Logo"
          style={{ width: '120px', height: '120px', marginBottom: '20px' }}
        />
        <p style={{ fontSize: '1.2rem', color: '#35584A' }}>Loading LearnLeaf...</p>
      </div>
    );
  }

  return user ? children : <Navigate to="/" />;
};

// Create your router
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "", element: <LoginForm /> },
      { path: "register", element: <RegistrationForm /> },
      { path: "resetPassword", element: <ResetPassword /> },
      {
        path: "tasks",
        element: (
          <ProtectedRoute>
            <TaskList />
          </ProtectedRoute>
        ),
      },
      {
        path: "subjects",
        element: (
          <ProtectedRoute>
            <SubjectDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "subjects/:subjectId",
        element: (
          <ProtectedRoute>
            <SubjectTasks />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects",
        element: (
          <ProtectedRoute>
            <ProjectDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "projects/:projectId",
        element: (
          <ProtectedRoute>
            <ProjectTasks />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        ),
      },
      {
        path: "archives",
        element: (
          <ProtectedRoute>
            <ArchiveDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "calendar",
        element: (
          <ProtectedRoute>
            <CalendarView />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

// Initial render
renderApp();