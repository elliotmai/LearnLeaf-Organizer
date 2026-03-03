import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import "./index.css";
import { useUser } from "./UserState.jsx";
import App from "./App.jsx";
import SplashScreen from "./SplashScreen.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import TasksPage from "./pages/TasksPage.jsx";
import SubjectsPage from "./pages/SubjectsPage.jsx";
import SubjectTasksPage from "./pages/SubjectTasksPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import ProjectTasksPage from "./pages/ProjectTasksPage.jsx";
import UserProfilePage from "./pages/UserProfilePage.jsx";
import ArchivePage from "./pages/ArchivePage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";

const PublicRoute = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) return <SplashScreen />;
  return user ? <Navigate to="/tasks" replace /> : children;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) return <SplashScreen message="Loading LearnLeaf..." />;
  return user ? children : <Navigate to="/" />;
};

const router = createBrowserRouter([{
  path: "/",
  element: <App />,
  children: [
    { index: true,                    element: <PublicRoute><LoginPage /></PublicRoute> },
    { path: "register",               element: <PublicRoute><RegisterPage /></PublicRoute> },
    { path: "resetPassword",          element: <PublicRoute><ResetPasswordPage /></PublicRoute> },
    { path: "tasks",                  element: <ProtectedRoute><TasksPage /></ProtectedRoute> },
    { path: "subjects",               element: <ProtectedRoute><SubjectsPage /></ProtectedRoute> },
    { path: "subjects/:subjectId",    element: <ProtectedRoute><SubjectTasksPage /></ProtectedRoute> },
    { path: "projects",               element: <ProtectedRoute><ProjectsPage /></ProtectedRoute> },
    { path: "projects/:projectId",    element: <ProtectedRoute><ProjectTasksPage /></ProtectedRoute> },
    { path: "profile",                element: <ProtectedRoute><UserProfilePage /></ProtectedRoute> },
    { path: "archives",               element: <ProtectedRoute><ArchivePage /></ProtectedRoute> },
    { path: "calendar",               element: <ProtectedRoute><CalendarPage /></ProtectedRoute> },
  ],
}]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
