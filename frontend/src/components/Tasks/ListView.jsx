import React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
  AvatarGroup,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccessTime as AccessTimeIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { 
  getTaskStatusColor, 
  getTaskStatusLabel, 
  getTaskPriorityLabel, 
  getTaskPriorityColor 
} from "../../config/constants";

const ListView = ({
  tasks,
  handleViewTaskDetail,
  handleDeleteTask,
  project,
  canEditTask,
  canDeleteTask,
}) => {
  // Combine all task lists into one for table view
  const allTasks = [
    ...tasks.todo,
    ...tasks.inProgress,
    ...tasks.done,
  ];

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: vi });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  return (
    <TableContainer component={Paper} sx={{ borderRadius: "15px", boxShadow: "0 5px 15px rgba(0,0,0,0.08)" }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Tên công việc</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Độ ưu tiên</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Người thực hiện</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Ngày bắt đầu</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Ngày hết hạn</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Thao tác</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {allTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                <Typography variant="body1" color="text.secondary">
                  Chưa có công việc nào
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            allTasks.map((task) => (
              <TableRow 
                key={task._id} 
                sx={{ 
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.02)"
                  }
                }}
                onClick={() => handleViewTaskDetail(task)}
              >
                <TableCell>
                  <Typography variant="body1" fontWeight={500}>
                    {task.title || task.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getTaskStatusLabel(task.status)}
                    size="small"
                    sx={{
                      backgroundColor: getTaskStatusColor(task.status).bg,
                      color: getTaskStatusColor(task.status).color,
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getTaskPriorityLabel(task.priority)}
                    size="small"
                    sx={{
                      backgroundColor: getTaskPriorityColor(task.priority).bg,
                      color: getTaskPriorityColor(task.priority).color,
                      fontWeight: 500,
                    }}
                  />
                </TableCell>
                <TableCell>
                  {task.assignees && task.assignees.length > 0 ? (
                    <AvatarGroup max={3} sx={{ justifyContent: "flex-start" }}>
                      {task.assignees.map((assignee, index) => (
                        <Tooltip
                          key={index}
                          title={assignee.name || assignee.email || "Người dùng"}
                        >
                          <Avatar
                            alt={assignee.name || assignee.email || "User"}
                            src={assignee.avatar}
                            sx={{ width: 28, height: 28 }}
                          >
                            {assignee.name ? assignee.name.charAt(0) : "U"}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Chưa gán
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {formatDate(task.startDate)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AccessTimeIcon fontSize="small" color="error" />
                    <Typography variant="body2">
                      {formatDate(task.dueDate)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {canEditTask && canEditTask(task, project) && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTaskDetail(task);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                    {canDeleteTask && canDeleteTask(task, project) && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task._id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ListView; 