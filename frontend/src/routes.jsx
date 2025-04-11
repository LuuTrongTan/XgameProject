import React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

// Direct imports
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Projects from "./pages/projects/Projects";
import ProjectDetails from "./pages/projects/ProjectDetails";
import Tasks from "./pages/task/Tasks";
import TaskDebug from "./pages/task/TaskDebug";
import Profile from "./pages/profile/Profile";
import NotFound from "./pages/NotFound";
import Layout from "./components/common/Layout";
import Calendar from "./pages/Calendar";
import SprintList from "./pages/sprint/SprintList";
import SprintDetail from "./pages/sprint/SprintDetail";
import NotificationsPage from "./pages/notifications/NotificationsPage";

// Admin pages
import UserManagement from "./pages/admin/UserManagement";
import RoleManagement from "./pages/admin/RoleManagement";

const LoadingSpinner = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <CircularProgress />
  </Box>
);

// Protected route component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && user.role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const App = () => {
  const { user, loading } = useAuth();

  const routes = useRoutes([
    {
      path: "/",
      element: !user ? <Navigate to="/login" /> : <Layout />,
      children: [
        { path: "", element: <Dashboard /> },
        { path: "dashboard", element: <Dashboard /> },
        { path: "reports", element: <Reports /> },
        { path: "calendar", element: <Calendar /> },
        { path: "projects", element: <Projects /> },
        { path: "projects/:projectId", element: <ProjectDetails /> },
        { path: "projects/:projectId/tasks", element: <Tasks /> },
        { path: "projects/:projectId/sprints", element: <SprintList /> },
        {
          path: "projects/:projectId/sprints/:sprintId",
          element: <SprintDetail />,
        },
        { path: "task-debug", element: <TaskDebug /> },
        { path: "profile", element: <Profile /> },
        { path: "notifications", element: <NotificationsPage /> },
        { path: "*", element: <NotFound /> },
      ],
    },
    {
      path: "/login",
      element: user ? <Navigate to="/" /> : <Login />,
    },
    {
      path: "/register",
      element: user ? <Navigate to="/" /> : <Register />,
    },
    // Admin routes
    {
      path: "/admin",
      element: (
        <ProtectedRoute requireAdmin>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        {
          path: "",
          element: <Navigate to="users" />,
        },
        {
          path: "users",
          element: <UserManagement />,
        },
        {
          path: "roles",
          element: <RoleManagement />,
        },
      ],
    },
  ]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return routes;
};

export default App;
