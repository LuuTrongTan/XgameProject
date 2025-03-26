import React from "react";
import { Navigate, useRoutes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

// Direct imports
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/projects/Projects";
import ProjectDetails from "./pages/projects/ProjectDetails";
import Tasks from "./pages/task/Tasks";
import TaskDebug from "./pages/task/TaskDebug";
import Profile from "./pages/profile/Profile";
import NotFound from "./pages/NotFound";
import Layout from "./components/common/Layout";
import Calendar from "./pages/Calendar";

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

const App = () => {
  const { user, loading } = useAuth();

  const routes = useRoutes([
    {
      path: "/",
      element: !user ? <Navigate to="/login" /> : <Layout />,
      children: [
        { path: "", element: <Dashboard /> },
        { path: "dashboard", element: <Dashboard /> },
        { path: "calendar", element: <Calendar /> },
        { path: "projects", element: <Projects /> },
        { path: "projects/:projectId", element: <ProjectDetails /> },
        { path: "projects/:projectId/tasks", element: <Tasks /> },
        { path: "task-debug", element: <TaskDebug /> },
        { path: "profile", element: <Profile /> },
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
  ]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return routes;
};

export default App;
