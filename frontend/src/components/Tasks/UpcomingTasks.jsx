import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../../contexts/AuthContext";
import { getSprintTasks } from "../../api/taskApi";
import DateTimeDisplay from "../common/DateTimeDisplay";

const UpcomingTasks = ({ projectId, sprintId }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId, sprintId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // Kiểm tra projectId và sprintId trước khi gọi API
      if (!projectId || !sprintId) {
        console.log("Missing projectId or sprintId", { projectId, sprintId });
        setTasks([]);
        setLoading(false);
        return;
      }
      
      const response = await getSprintTasks(projectId, sprintId);
      console.log("UpcomingTasks - API Response:", response);
      
      // Lấy đúng mảng dữ liệu từ response
      const taskData = response.data || response;
      
      // Kiểm tra taskData có phải là mảng không
      if (!Array.isArray(taskData)) {
        console.log("Data is not an array:", taskData);
        setTasks([]);
        return;
      }

      // Log tất cả các task có dueDate
      console.log("All tasks with dueDate:", taskData.filter(task => task.dueDate).map(task => ({
        id: task._id,
        title: task.title,
        dueDate: task.dueDate,
        date: new Date(task.dueDate).toLocaleString()
      })));
      
      const now = new Date();
      const twelveHoursFromNow = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 giờ tới
      
      console.log("Current time:", now.toLocaleString());
      console.log("12 hours from now:", twelveHoursFromNow.toLocaleString());
      
      // Lọc các task có dueDate trong khoảng thời gian phù hợp và sắp xếp theo ngày
      const upcomingTasks = taskData
        .filter((task) => {
          if (!task.dueDate) return false;
          
          const dueDate = new Date(task.dueDate);
          
          // Hiển thị cả những task quá hạn chưa hoàn thành và task sắp đến hạn trong 12h tới
          const isOverdue = dueDate <= now && task.status !== "done" && task.status !== "completed";
          const isDueSoon = dueDate > now && dueDate <= twelveHoursFromNow;
          
          const result = isOverdue || isDueSoon;
          
          // Debug log
          if (dueDate <= twelveHoursFromNow) {
            console.log(`Task "${task.title}" (${task._id}):`, {
              dueDate: dueDate.toLocaleString(),
              status: task.status,
              isOverdue,
              isDueSoon,
              included: result
            });
          }
          
          return result;
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5); // Chỉ lấy 5 task gần nhất
      
      setTasks(upcomingTasks);
    } catch (error) {
      console.error("Error fetching upcoming tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (tasks.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="text.secondary">
          Không có công việc sắp đến hạn trong 12 giờ tới hoặc quá hạn chưa hoàn thành
        </Typography>
      </Box>
    );
  }

  return (
    <List>
      {tasks.map((task) => (
        <ListItem key={task._id}>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle2">{task.title}</Typography>
                <Chip
                  label={task.status}
                  size="small"
                  color={
                    task.status === "completed"
                      ? "success"
                      : task.status === "in_progress"
                      ? "primary"
                      : "default"
                  }
                />
              </Box>
            }
            secondary={
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {task.description}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Typography variant="caption" color="text.secondary">
                    Hạn hoàn thành:
                  </Typography>
                  <DateTimeDisplay date={task.dueDate} format="dd/MM/yyyy HH:mm" />
                </Box>
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default UpcomingTasks;
