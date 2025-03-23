import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import { useUser } from '/src/UserState.jsx';
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

// Use the custom hook to check authentication
const ProtectedRoute = ({ children }) => {
  const { user } = useUser(); // Check if user is authenticated
  return user ? children : <Navigate to="/" />; // If no user, redirect to login
};

// Create your router
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,  // Common parent component, could be a layout component
    children: [
      // Public routes
      { path: "", element: <LoginForm /> },
      { path: "register", element: <RegistrationForm /> },
      { path: "resetPassword", element: <ResetPassword /> },

      // Protected routes, wrapped in <ProtectedRoute>
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((registration) => {
      registration.onupdatefound = () => {
        const newWorker = registration.installing;
        newWorker.onstatechange = () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload(); // Reload the app
            }
          }
        };
    });
  });
}
