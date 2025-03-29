import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  CircularProgress,
  Alert,
} from "@mui/material";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { getProjectTasks } from "../../api/taskApi";

const UpcomingTasks = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await getProjectTasks(projectId);
        if (response.success) {
          // Filter tasks that are due within the next 7 days and not completed
          const now = new Date();
          const nextWeek = addDays(now, 7);
          const upcomingTasks = response.data.filter(
            (task) =>
              task.status !== "done" &&
              isAfter(new Date(task.dueDate), now) &&
              isBefore(new Date(task.dueDate), nextWeek)
          );
          setTasks(upcomingTasks);
        } else {
          throw new Error(response.message);
        }
      } catch (err) {
        console.error("Error fetching upcoming tasks:", err);
        setError(err.message || "Không thể tải danh sách công việc");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (tasks.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Không có công việc nào sắp đến hạn.
      </Alert>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return { bg: "#ffebee", color: "#c62828" };
      case "medium":
        return { bg: "#fff8e1", color: "#f57c00" };
      case "low":
        return { bg: "#e8f5e9", color: "#2e7d32" };
      default:
        return { bg: "#f5f5f5", color: "#757575" };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "todo":
        return { bg: "#e3f2fd", color: "#1976d2" };
      case "inProgress":
        return { bg: "#fff8e1", color: "#f57c00" };
      case "review":
        return { bg: "#f3e5f5", color: "#7b1fa2" };
      case "done":
        return { bg: "#e8f5e9", color: "#2e7d32" };
      default:
        return { bg: "#f5f5f5", color: "#757575" };
    }
  };

  return (
    <Box>
      {tasks.map((task) => (
        <Card
          key={task._id}
          sx={{
            mb: 2,
            transition: "transform 0.2s",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: 3,
            },
          }}
        >
          <CardContent>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              mb={2}
            >
              <Box>
                <Typography variant="h6" gutterBottom>
                  {task.name}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {task.description}
                </Typography>
              </Box>

              <Box display="flex" gap={1}>
                <Chip
                  label={
                    {
                      todo: "Chưa bắt đầu",
                      inProgress: "Đang thực hiện",
                      review: "Đang kiểm tra",
                      done: "Hoàn thành",
                    }[task.status]
                  }
                  size="small"
                  sx={{
                    bgcolor: getStatusColor(task.status).bg,
                    color: getStatusColor(task.status).color,
                  }}
                />
                <Chip
                  label={
                    {
                      low: "Thấp",
                      medium: "Trung bình",
                      high: "Cao",
                    }[task.priority]
                  }
                  size="small"
                  sx={{
                    bgcolor: getPriorityColor(task.priority).bg,
                    color: getPriorityColor(task.priority).color,
                  }}
                />
              </Box>
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Dự án: {task.project?.name}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Hạn:{" "}
                  {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: vi })}
                </Typography>
              </Box>

              {task.assignees?.length > 0 && (
                <AvatarGroup max={3}>
                  {task.assignees.map((assignee) => (
                    <Avatar
                      key={assignee._id}
                      alt={assignee.name}
                      src={assignee.avatar}
                      sx={{ width: 24, height: 24 }}
                    >
                      {assignee.name.charAt(0)}
                    </Avatar>
                  ))}
                </AvatarGroup>
              )}
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default UpcomingTasks;
