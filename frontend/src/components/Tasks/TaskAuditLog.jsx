import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  Paper,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
  Event as EventIcon,
  FormatListBulleted as TaskIcon,
  Update as UpdateIcon,
  Flag as PriorityIcon,
  PersonAdd as PersonAddIcon,
  Description as DescriptionIcon,
  Label as LabelIcon,
  Schedule as ScheduleIcon,
  AccessTime as TimeIcon,
  PlaylistAddCheck as ChecklistIcon,
  Title as TitleIcon,
  ArrowRightAlt as ArrowRightAltIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getTaskHistory } from "../../api/taskApi";
import UserAvatar from "../common/UserAvatar";
import DateTimeDisplay from "../common/DateTimeDisplay";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Map trạng thái task sang tên hiển thị và màu sắc
const STATUS_MAP = {
  'todo': { label: 'Chưa làm', color: 'default' },
  'in_progress': { label: 'Đang làm', color: 'primary' },
  'inProgress': { label: 'Đang làm', color: 'primary' },
  'doing': { label: 'Đang làm', color: 'primary' },
  'review': { label: 'Đang xem xét', color: 'warning' },
  'done': { label: 'Hoàn thành', color: 'success' },
  'completed': { label: 'Hoàn thành', color: 'success' }
};

// Map độ ưu tiên sang tên hiển thị và màu sắc
const PRIORITY_MAP = {
  'low': { label: 'Thấp', color: 'info' },
  'medium': { label: 'Trung bình', color: 'warning' },
  'high': { label: 'Cao', color: 'error' }
};

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
        let historyData = [];
        
        // Kiểm tra xem response.data có phải là mảng không
        if (Array.isArray(response.data)) {
          historyData = response.data;
        } else if (response.data && Array.isArray(response.data.history)) {
          historyData = response.data.history;
        } else {
          // Nếu không phải mảng, set logs là mảng rỗng
          historyData = [];
        }
        
        // Xử lý dữ liệu logs để chuẩn hóa định dạng
        const processedLogs = historyData.map(log => {
          // Sao chép log để tránh thay đổi trực tiếp
          const processedLog = { ...log };
          
          // Bảo đảm rằng details tồn tại
          if (!processedLog.details) {
            processedLog.details = {};
          }
          
          // Bảo đảm rằng changes tồn tại
          if (!processedLog.changes) {
            processedLog.changes = {};
          }
          
          return processedLog;
        });
        
        // Sắp xếp theo thời gian giảm dần (mới nhất lên đầu)
        processedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log("Loaded history logs:", processedLogs);
        setLogs(processedLogs);
      } else {
        console.log("No history data in response");
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

  const getActionIcon = (action, details) => {
    // Xác định icon dựa trên action và details
    switch (action) {
      case "create":
        return <AddIcon color="success" />;
      case "update":
        if (details?.field) {
          switch(details.field) {
            case "status": return <TaskIcon color="info" />;
            case "priority": return <PriorityIcon color="error" />;
            case "title": return <TitleIcon color="primary" />;
            case "description": return <DescriptionIcon />;
            case "dueDate": case "startDate": return <ScheduleIcon color="primary" />;
            case "estimatedTime": return <TimeIcon color="secondary" />;
          }
        }
        return <EditIcon color="primary" />;
      case "status":
        return <TaskIcon color="info" />;
      case "delete":
        return <DeleteIcon color="error" />;
      case "assign":
        return <AssignmentIcon color="info" />;
      case "unassign":
        return <PersonAddIcon color="warning" />;
      case "attachment":
        return <AttachFileIcon color="secondary" />;
      case "comment":
        return <CommentIcon color="warning" />;
      case "calendar":
        return <EventIcon />;
      default:
        return <UpdateIcon />;
    }
  };

  const getActionText = (log) => {
    const getValueText = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return value.toString();
    };
    
    // Hàm hiển thị tên trạng thái
    const getStatusLabel = (status) => {
      return STATUS_MAP[status]?.label || status;
    };
    
    // Hàm hiển thị tên độ ưu tiên
    const getPriorityLabel = (priority) => {
      return PRIORITY_MAP[priority]?.label || priority;
    };
    
    switch (log.action) {
      case "create":
        return "đã tạo công việc";
        
      case "update":
        if (log.details && log.details.field) {
          switch(log.details.field) {
            case "status":
              return `đã thay đổi trạng thái từ "${getStatusLabel(log.details.oldValue)}" thành "${getStatusLabel(log.details.newValue)}"`;
            case "priority":
              return `đã thay đổi độ ưu tiên từ "${getPriorityLabel(log.details.oldValue)}" thành "${getPriorityLabel(log.details.newValue)}"`;
            case "title":
              return `đã đổi tên công việc từ "${getValueText(log.details.oldValue)}" thành "${getValueText(log.details.newValue)}"`;
            case "description":
              return "đã cập nhật mô tả công việc";
            case "dueDate":
              return `đã thay đổi thời hạn từ "${formatDate(log.details.oldValue)}" thành "${formatDate(log.details.newValue)}"`;
            case "startDate":
              return `đã thay đổi ngày bắt đầu từ "${formatDate(log.details.oldValue)}" thành "${formatDate(log.details.newValue)}"`;
            case "estimatedTime":
              return `đã cập nhật thời gian dự kiến từ "${getValueText(log.details.oldValue)}" thành "${getValueText(log.details.newValue)}"`;
            default:
              return `đã cập nhật ${log.details.field}`;
          }
        }
        return "đã cập nhật công việc";
        
      case "status":
        return `đã thay đổi trạng thái từ "${getStatusLabel(log.details?.oldStatus)}" thành "${getStatusLabel(log.details?.newStatus)}"`;
        
      case "delete":
        return "đã xóa công việc";
        
      case "assign":
        return `đã gán công việc cho ${log.details?.assigneeName || log.details?.name || 'người dùng'}`;
        
      case "unassign":
        return `đã hủy gán công việc từ ${log.details?.assigneeName || log.details?.name || 'người dùng'}`;
        
      case "attachment":
        if (log.details?.action === "add") {
          return `đã thêm tệp đính kèm: ${log.details?.fileName || log.details?.name || 'tệp'}`;
        } else if (log.details?.action === "delete") {
          return `đã xóa tệp đính kèm: ${log.details?.fileName || log.details?.name || 'tệp'}`;
        }
        return `đã thao tác với tệp đính kèm: ${log.details?.fileName || log.details?.name || 'tệp'}`;
        
      case "comment":
        if (log.details?.action === "add") {
          return "đã thêm bình luận";
        } else if (log.details?.action === "update") {
          return "đã cập nhật bình luận";
        } else if (log.details?.action === "delete") {
          return "đã xóa bình luận";
        }
        return "đã thao tác với bình luận";
        
      case "calendar":
        return `đã đồng bộ với ${log.details?.calendarType || log.details?.type || 'lịch'}`;
        
      default:
        return "đã thực hiện một thao tác";
    }
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "không xác định";
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: vi });
    } catch (error) {
      return dateString;
    }
  };
  
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch (error) {
      return dateString;
    }
  };
  
  // Hiển thị chi tiết của log
  const renderLogDetails = (log) => {
    if (!log.details) return null;
    
    // Xử lý hiển thị chi tiết dựa trên loại action
    switch (log.action) {
      case "create":
        return (
          <Card variant="outlined" sx={{ mt: 1, borderRadius: 1 }}>
            <CardContent sx={{ p: "8px 12px !important" }}>
              {log.details.title && (
                <Box mb={0.5}>
                  <Typography variant="body2" component="span" fontWeight={600}>Tên: </Typography>
                  <Typography variant="body2" component="span">{log.details.title}</Typography>
                </Box>
              )}
              {log.details.status && (
                <Box mb={0.5}>
                  <Typography variant="body2" component="span" fontWeight={600}>Trạng thái: </Typography>
                  <Chip
                    label={STATUS_MAP[log.details.status]?.label || log.details.status}
                    color={STATUS_MAP[log.details.status]?.color || "default"}
                    size="small"
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                </Box>
              )}
              {log.details.priority && (
                <Box mb={0.5}>
                  <Typography variant="body2" component="span" fontWeight={600}>Ưu tiên: </Typography>
                  <Chip
                    label={PRIORITY_MAP[log.details.priority]?.label || log.details.priority}
                    color={PRIORITY_MAP[log.details.priority]?.color || "default"}
                    size="small"
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                </Box>
              )}
              {log.details.description && (
                <Box>
                  <Typography variant="body2" component="div" fontWeight={600}>Mô tả: </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mt: 0.5, 
                    px: 1, 
                    py: 0.5, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1,
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {log.details.description.length > 100 
                      ? log.details.description.substring(0, 100) + '...' 
                      : log.details.description}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        );
        
      case "update":
      case "status":
        if (log.details.field === "status" || log.action === "status") {
          return (
            <Box mt={1} display="flex" alignItems="center" gap={1}>
              <Chip
                label={STATUS_MAP[log.details.oldValue || log.details.oldStatus]?.label || log.details.oldValue || log.details.oldStatus}
                color={STATUS_MAP[log.details.oldValue || log.details.oldStatus]?.color || "default"}
                size="small"
              />
              <ArrowRightAltIcon fontSize="small" />
              <Chip
                label={STATUS_MAP[log.details.newValue || log.details.newStatus]?.label || log.details.newValue || log.details.newStatus}
                color={STATUS_MAP[log.details.newValue || log.details.newStatus]?.color || "default"}
                size="small"
              />
            </Box>
          );
        } else if (log.details.field === "priority") {
          return (
            <Box mt={1} display="flex" alignItems="center" gap={1}>
              <Chip
                label={PRIORITY_MAP[log.details.oldValue]?.label || log.details.oldValue}
                color={PRIORITY_MAP[log.details.oldValue]?.color || "default"}
                size="small"
              />
              <ArrowRightAltIcon fontSize="small" />
              <Chip
                label={PRIORITY_MAP[log.details.newValue]?.label || log.details.newValue}
                color={PRIORITY_MAP[log.details.newValue]?.color || "default"}
                size="small"
              />
            </Box>
          );
        }
        break;
        
      case "comment":
        if (log.details.content) {
          return (
            <Paper variant="outlined" sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {log.details.content}
              </Typography>
            </Paper>
          );
        }
        break;
    }
    
    // Hiển thị mặc định khi không có xử lý đặc biệt
    if (log.details.description) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {log.details.description}
        </Typography>
      );
    }
    
    return null;
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
      <List sx={{ 
        bgcolor: 'background.paper', 
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
      }}>
        {logs.map((log, index) => (
          <React.Fragment key={log._id || log.id || `log-${index}`}>
            {index > 0 && <Divider component="li" />}
            <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
              <Box display="flex" width="100%">
                <Box mr={2} display="flex" alignItems="flex-start" pt={0.5}>
                  {log.user?.avatar ? (
                    <Avatar 
                      src={log.user.avatar} 
                      alt={log.user?.name || log.user?.fullName || 'User'} 
                      sx={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {(log.user?.name || log.user?.fullName || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                  )}
                </Box>
                <Box flex={1}>
                  <Box display="flex" alignItems="center" mb={0.5} flexWrap="wrap">
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 1 }}>
                      {log.user?.fullName || log.user?.name || 'Người dùng'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {getActionText(log)}
                    </Typography>
                    <Box display="flex" alignItems="center" mt={{ xs: 0.5, sm: 0 }}>
                      <Chip
                        icon={getActionIcon(log.action, log.details)}
                        label={formatDateTime(log.createdAt)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 24, borderRadius: 1 }}
                      />
                    </Box>
                  </Box>
                  
                  {renderLogDetails(log)}
                </Box>
              </Box>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default TaskAuditLog;
