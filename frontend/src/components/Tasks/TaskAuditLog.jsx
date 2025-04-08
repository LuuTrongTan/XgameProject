import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getTaskHistory } from "../../api/taskApi";
import UserAvatar from "../common/UserAvatar";
import DateTimeDisplay from "../common/DateTimeDisplay";

const TaskAuditLog = ({ taskId, projectId, sprintId }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchAuditLogs();
  }, [taskId, projectId, sprintId]);

  const fetchAuditLogs = async () => {
    try {
      const response = await getTaskHistory(projectId, sprintId, taskId);
      setLogs(response);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      create: <AddIcon color="success" />,
      update: <EditIcon color="primary" />,
      delete: <DeleteIcon color="error" />,
      assign: <AssignmentIcon color="info" />,
      attachment: <AttachFileIcon color="secondary" />,
      comment: <CommentIcon color="warning" />,
      calendar: <EventIcon color="action" />,
    };
    return icons[action] || <EditIcon />;
  };

  const getActionText = (log) => {
    switch (log.action) {
      case "create":
        return "đã tạo công việc";
      case "update":
        return "đã cập nhật công việc";
      case "delete":
        return "đã xóa công việc";
      case "assign":
        return `đã gán công việc cho ${log.details.assigneeName}`;
      case "attachment":
        return `đã thêm tệp đính kèm: ${log.details.fileName}`;
      case "comment":
        return "đã thêm bình luận";
      case "calendar":
        return `đã đồng bộ với ${log.details.calendarType}`;
      default:
        return "đã thực hiện một thao tác";
    }
  };

  return (
    <Box>
      <List>
        {logs.map((log) => (
          <ListItem key={log._id} alignItems="flex-start">
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  {getActionIcon(log.action)}
                  <Typography variant="subtitle2">
                    {log.user.fullName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getActionText(log)}
                  </Typography>
                  <DateTimeDisplay date={log.createdAt} />
                </Box>
              }
              secondary={
                log.details && (
                  <Box mt={1}>
                    {log.details.status && (
                      <Chip
                        label={log.details.status}
                        color={
                          log.details.status === "completed"
                            ? "success"
                            : log.details.status === "in_progress"
                            ? "primary"
                            : "default"
                        }
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    )}
                    {log.details.description && (
                      <Typography variant="body2" color="text.secondary">
                        {log.details.description}
                      </Typography>
                    )}
                  </Box>
                )
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default TaskAuditLog;
