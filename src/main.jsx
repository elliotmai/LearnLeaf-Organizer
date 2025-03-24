import React, { useEffect } from 'react';
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
// import { m } from '@vite-pwa/assets-generator/dist/shared/assets-generator.5e51fd40.js';

const PublicRoute = ({ children }) => {
  const { user, loading } = useUser();
  // if (loading) {
  //   return (
  //     <SplashScreen
  //       message={"Loading LearnLeaf WHYYYYYYYYYY..."}
  //     />
  //   );
  // }
  return user ? <Navigate to="/tasks" replace /> : children;
};

// Global flag to control splash
let forceSplash = false;

// Splash-screen-aware render function
const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
};

// Auth wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();

  useEffect(() => {
    console.log('[ProtectedRoute] user:', user);
  }, [user]);

  if (loading) {
    return (
      null
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
      {
        index: true,
        element: <PublicRoute><LoginForm /></PublicRoute>
      },
      { path: "register", element: <PublicRoute> <RegistrationForm /></PublicRoute> },
      { path: "resetPassword", element: <PublicRoute> <ResetPassword /></PublicRoute> },
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

let inactivityTimer;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  // 10 minutes of inactivity = 120000ms
  inactivityTimer = setTimeout(checkForServiceWorkerUpdate, 600000);
}

// Track activity
['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach((event) =>
  window.addEventListener(event, resetInactivityTimer)
);

// Start timer initially
resetInactivityTimer();

function checkForServiceWorkerUpdate() {
  if (
    'serviceWorker' in navigator &&
    window.matchMedia('(display-mode: standalone)').matches
  ) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        console.log('[SW] Update found while inactive. Reloading...');

        localStorage.setItem('appJustUpdated', 'true');
        localStorage.setItem('appVersion', __APP_VERSION__);

        registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } else {
        console.log('[SW] No update found during inactivity check.');
      }
    });
  }
}
