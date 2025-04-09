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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuditLogs();
  }, [taskId, projectId, sprintId]);

  const fetchAuditLogs = async () => {
    if (!taskId || !projectId || !sprintId) {
      setError("Thiếu thông tin cần thiết");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getTaskHistory(projectId, sprintId, taskId);
      
      // Kiểm tra và xử lý dữ liệu trả về
      if (response && response.success) {
        // Kiểm tra xem response.data có phải là mảng không
        if (Array.isArray(response.data)) {
          setLogs(response.data);
        } else if (response.data && Array.isArray(response.data.history)) {
          setLogs(response.data.history);
        } else {
          // Nếu không phải mảng, set logs là mảng rỗng
          setLogs([]);
        }
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setError("Không thể tải lịch sử thay đổi");
      setLogs([]);
    } finally {
      setLoading(false);
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
        return `đã gán công việc cho ${log.details?.assigneeName || 'người dùng'}`;
      case "attachment":
        return `đã thêm tệp đính kèm: ${log.details?.fileName || 'tệp'}`;
      case "comment":
        return "đã thêm bình luận";
      case "calendar":
        return `đã đồng bộ với ${log.details?.calendarType || 'lịch'}`;
      default:
        return "đã thực hiện một thao tác";
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center">
        {error}
      </Typography>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Typography color="text.secondary" align="center">
        Chưa có lịch sử thay đổi nào
      </Typography>
    );
  }

  return (
    <Box>
      <List>
        {logs.map((log) => (
          <ListItem key={log._id || log.id || Math.random()} alignItems="flex-start">
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  {getActionIcon(log.action)}
                  <Typography variant="subtitle2">
                    {log.user?.fullName || log.user?.name || 'Người dùng'}
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
