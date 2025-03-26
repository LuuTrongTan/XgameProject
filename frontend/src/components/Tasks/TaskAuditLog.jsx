import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Chip,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Create as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CompletedIcon,
  AddCircle as CreateIcon,
  Comment as CommentIcon,
  AttachFile as AttachmentIcon,
  SwapHoriz as StatusIcon,
  Flag as PriorityIcon,
  People as AssigneeIcon,
  Label as TagIcon,
  Today as DateIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import API from "../../api/api";

const TaskAuditLog = ({ taskId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [taskId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/tasks/${taskId}/history`);
      setLogs(response.data || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "create":
        return <CreateIcon color="success" />;
      case "update":
        return <EditIcon color="primary" />;
      case "delete":
        return <DeleteIcon color="error" />;
      case "complete":
        return <CompletedIcon color="success" />;
      case "status_change":
        return <StatusIcon color="info" />;
      case "priority_change":
        return <PriorityIcon color="warning" />;
      case "comment_add":
        return <CommentIcon color="primary" />;
      case "attachment_add":
        return <AttachmentIcon />;
      case "assignee_add":
      case "assignee_remove":
        return <AssigneeIcon color="secondary" />;
      case "tag_add":
      case "tag_remove":
        return <TagIcon />;
      case "date_change":
        return <DateIcon color="primary" />;
      default:
        return <EditIcon color="action" />;
    }
  };

  const formatChangeText = (log) => {
    const { action, field, newValue, oldValue, user } = log;
    const userName = user?.fullName || "Someone";

    switch (action) {
      case "create":
        return `${userName} đã tạo công việc này`;
      case "update":
        if (field === "title") {
          return `${userName} đã cập nhật tiêu đề từ "${oldValue}" thành "${newValue}"`;
        } else if (field === "description") {
          return `${userName} đã cập nhật mô tả`;
        }
        return `${userName} đã cập nhật ${field}`;
      case "delete":
        return `${userName} đã xóa công việc này`;
      case "complete":
        return `${userName} đã đánh dấu công việc hoàn thành`;
      case "status_change":
        return `${userName} đã thay đổi trạng thái từ "${getStatusName(
          oldValue
        )}" thành "${getStatusName(newValue)}"`;
      case "priority_change":
        return `${userName} đã thay đổi độ ưu tiên từ "${getPriorityName(
          oldValue
        )}" thành "${getPriorityName(newValue)}"`;
      case "comment_add":
        return `${userName} đã thêm bình luận`;
      case "attachment_add":
        return `${userName} đã đính kèm file "${newValue}"`;
      case "assignee_add":
        return `${userName} đã thêm ${newValue} vào công việc`;
      case "assignee_remove":
        return `${userName} đã loại bỏ ${oldValue} khỏi công việc`;
      case "tag_add":
        return `${userName} đã thêm thẻ "${newValue}"`;
      case "tag_remove":
        return `${userName} đã xóa thẻ "${oldValue}"`;
      case "date_change":
        return `${userName} đã thay đổi ngày hết hạn từ "${formatDate(
          oldValue
        )}" thành "${formatDate(newValue)}"`;
      default:
        return `${userName} đã thực hiện hành động trên công việc`;
    }
  };

  const getStatusName = (status) => {
    const statusMap = {
      todo: "Chưa bắt đầu",
      in_progress: "Đang thực hiện",
      review: "Đang kiểm tra",
      done: "Hoàn thành",
    };
    return statusMap[status] || status;
  };

  const getPriorityName = (priority) => {
    const priorityMap = {
      low: "Thấp",
      medium: "Trung bình",
      high: "Cao",
    };
    return priorityMap[priority] || priority;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: vi });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Lịch sử thay đổi
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : logs.length > 0 ? (
        <Paper sx={{ px: 2, py: 1 }}>
          <List dense>
            {logs.map((log, index) => (
              <React.Fragment key={log._id || index}>
                <ListItem alignItems="flex-start" sx={{ py: 1 }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getActionIcon(log.action)}
                  </ListItemIcon>
                  <ListItemText
                    primary={formatChangeText(log)}
                    secondary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 0.5 }}
                      >
                        <Avatar
                          src={log.user?.avatar}
                          alt={log.user?.fullName}
                          sx={{ width: 20, height: 20, mr: 1 }}
                        >
                          {log.user?.fullName?.charAt(0) || "?"}
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                          {log.createdAt
                            ? format(
                                new Date(log.createdAt),
                                "dd/MM/yyyy HH:mm",
                                { locale: vi }
                              )
                            : ""}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < logs.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 2 }}
        >
          Chưa có lịch sử thay đổi nào được ghi nhận
        </Typography>
      )}
    </Box>
  );
};

export default TaskAuditLog;
