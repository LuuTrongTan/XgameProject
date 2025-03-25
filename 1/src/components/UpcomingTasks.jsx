import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Link,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { getProjects } from "../api/projectApi";

const UpcomingTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUpcomingTasks();
  }, []);

  const fetchUpcomingTasks = async () => {
    try {
      const response = await getProjects();
      if (response && response.data) {
        // Get all tasks from all projects
        const allTasks = response.data.reduce((acc, project) => {
          if (project.tasks) {
            const projectTasks = project.tasks.map((task) => ({
              ...task,
              projectId: project._id,
              projectName: project.name,
            }));
            return [...acc, ...projectTasks];
          }
          return acc;
        }, []);

        // Filter upcoming tasks (due in next 7 days)
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const upcomingTasks = allTasks.filter((task) => {
          const dueDate = new Date(task.dueDate);
          return dueDate >= today && dueDate <= nextWeek;
        });

        // Sort by due date
        upcomingTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        setTasks(upcomingTasks);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Lỗi khi tải danh sách công việc"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "đang hoạt động":
        return "#4CAF50";
      case "hoàn thành":
        return "#2196F3";
      case "đóng":
        return "#9E9E9E";
      default:
        return "#757575";
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">
            Không có công việc sắp đến hạn. Bạn đã hoàn thành tất cả!
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {tasks.map((task) => (
          <Box
            key={task._id}
            sx={{
              mb: 2,
              pb: 2,
              borderBottom: "1px solid #eee",
              "&:last-child": {
                mb: 0,
                pb: 0,
                borderBottom: "none",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 1,
              }}
            >
              <Link
                component={RouterLink}
                to={`/tasks/${task._id}`}
                sx={{
                  color: "text.primary",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                <Typography variant="subtitle1">{task.title}</Typography>
              </Link>
              <Chip
                label={task.status}
                size="small"
                sx={{
                  backgroundColor: `${getStatusColor(task.status)}20`,
                  color: getStatusColor(task.status),
                  ml: 1,
                }}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Link
                component={RouterLink}
                to={`/projects/${task.projectId}`}
                sx={{
                  color: "text.secondary",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                <Typography variant="body2">{task.projectName}</Typography>
              </Link>
              <Typography variant="body2" color="text.secondary">
                Đến hạn:{" "}
                {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: vi })}
              </Typography>
            </Box>
          </Box>
        ))}
        <Box sx={{ mt: 2, textAlign: "right" }}>
          <Link
            component={RouterLink}
            to="/tasks"
            sx={{
              color: "primary.main",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Xem tất cả công việc
          </Link>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UpcomingTasks;
