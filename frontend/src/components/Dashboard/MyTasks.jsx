import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Divider,
  Tooltip,
} from "@mui/material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

/**
 * Component hiển thị danh sách công việc được giao cho người dùng
 */
const MyTasks = ({ tasks = [] }) => {
  const navigate = useNavigate();

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Công việc của tôi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bạn chưa có công việc nào được giao
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
      case "urgent":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "done":
      case "completed":
        return "success";
      case "inprogress":
      case "in_progress":
        return "primary";
      case "todo":
        return "warning";
      default:
        return "default";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Công việc của tôi
        </Typography>
        
        <List sx={{ p: 0 }}>
          {tasks.map((task, index) => (
            <React.Fragment key={task._id || index}>
              <ListItem 
                alignItems="flex-start" 
                sx={{ 
                  px: 0,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)"
                  },
                  borderLeft: isOverdue(task.dueDate) ? "4px solid #f44336" : "none",
                  pl: isOverdue(task.dueDate) ? 1 : 0
                }}
                onClick={() => {
                  if (task.project?._id && task._id) {
                    navigate(`/projects/${task.project._id}/tasks/${task._id}`);
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {task.title}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={task.priority || "Normal"} 
                        color={getPriorityColor(task.priority)} 
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                      <Chip 
                        size="small" 
                        label={task.status || "Todo"} 
                        color={getStatusColor(task.status)} 
                        sx={{ height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box mt={0.5}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {task.project?.name}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color={isOverdue(task.dueDate) ? "error.main" : "text.secondary"}
                          fontWeight={isOverdue(task.dueDate) ? 500 : 400}
                        >
                          {task.dueDate ? (
                            <Tooltip title={format(new Date(task.dueDate), "dd/MM/yyyy HH:mm", { locale: vi })}>
                              <span>
                                {isOverdue(task.dueDate) ? "Quá hạn: " : "Hạn: "}
                                {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: vi })}
                              </span>
                            </Tooltip>
                          ) : (
                            "Không có hạn"
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < tasks.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default MyTasks; 