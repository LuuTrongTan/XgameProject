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
    setError(null);
    setLogs([]);
    
    try {
      console.log(`Fetching audit logs for task ${taskId}`);
      const response = await getTaskHistory(projectId, sprintId, taskId);
      
      console.log('Audit logs response:', response);
      
      if (response && response.success) {
        let historyData = [];
        
        if (Array.isArray(response.data)) {
          historyData = response.data;
        } else if (response.data && Array.isArray(response.data.history)) {
          historyData = response.data.history;
        }
        
        // Xử lý và format dữ liệu logs
        const processedLogs = historyData.map(log => {
          const processedLog = { 
            ...log,
            timestamp: new Date(log.timestamp || log.createdAt).toLocaleString('vi-VN'),
            details: log.details || {},
            changes: log.changes || {},
            user: log.user || { name: 'Unknown User' }
          };
          
          // Format các trường đặc biệt
          if (processedLog.details.field === 'status') {
            processedLog.details.oldValue = getStatusLabel(processedLog.details.oldValue);
            processedLog.details.newValue = getStatusLabel(processedLog.details.newValue);
          }
          
          if (processedLog.details.field === 'priority') {
            processedLog.details.oldValue = getPriorityLabel(processedLog.details.oldValue);
            processedLog.details.newValue = getPriorityLabel(processedLog.details.newValue);
          }
          
          return processedLog;
        });
        
        // Sắp xếp theo thời gian giảm dần
        processedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log('Processed audit logs:', processedLogs);
        setLogs(processedLogs);
      } else {
        console.log('No history data in response');
        setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
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
    
    const getStatusLabel = (status) => {
      return STATUS_MAP[status]?.label || status;
    };
    
    const getPriorityLabel = (priority) => {
      return PRIORITY_MAP[priority]?.label || priority;
    };
    
    switch (log.action) {
      case "create":
        return "đã tạo công việc";
        
      case "update":
        if (log.details) {
          const changes = Object.entries(log.details)
            .filter(([key]) => key !== 'changedBy' && key !== 'changedAt')
            .map(([key, value]) => {
              switch(key) {
                case 'title':
                  return `đổi tên từ "${getValueText(value.oldValue)}" thành "${getValueText(value.newValue)}"`;
                case 'description':
                  return 'cập nhật mô tả';
                case 'status':
                  return `thay đổi trạng thái từ "${getStatusLabel(value.oldValue)}" thành "${getStatusLabel(value.newValue)}"`;
                case 'priority':
                  return `thay đổi độ ưu tiên từ "${getPriorityLabel(value.oldValue)}" thành "${getPriorityLabel(value.newValue)}"`;
                case 'dueDate':
                  return `thay đổi hạn chót từ "${formatDate(value.oldValue)}" thành "${formatDate(value.newValue)}"`;
                case 'estimatedTime':
                  return `thay đổi thời gian dự kiến từ "${getValueText(value.oldValue)}" thành "${getValueText(value.newValue)}"`;
                case 'assignees':
                  return 'thay đổi người được giao';
                case 'tags':
                  return 'cập nhật nhãn';
                default:
                  return `cập nhật ${key}`;
              }
            });
          return `đã ${changes.join(', ')}`;
        }
        return "đã cập nhật công việc";
        
      case "view":
        return "đã xem chi tiết công việc";
        
      case "delete":
        return "đã xóa công việc";
        
      case "status":
        return `đã thay đổi trạng thái từ "${getStatusLabel(log.details?.oldStatus)}" thành "${getStatusLabel(log.details?.newStatus)}"`;
        
      case "assign":
        return `đã gán công việc cho ${log.details?.assigneeName || 'người dùng'}`;
        
      case "unassign":
        return `đã hủy gán công việc từ ${log.details?.assigneeName || 'người dùng'}`;
        
      case "attachment":
        if (log.details?.action === "add") {
          return `đã thêm tệp đính kèm: ${log.details?.fileName || 'tệp'}`;
        } else if (log.details?.action === "delete") {
          return `đã xóa tệp đính kèm: ${log.details?.fileName || 'tệp'}`;
        }
        return `đã thao tác với tệp đính kèm: ${log.details?.fileName || 'tệp'}`;
        
      case "comment":
        if (log.details?.action === "add") {
          return "đã thêm bình luận";
        } else if (log.details?.action === "update") {
          return "đã cập nhật bình luận";
        } else if (log.details?.action === "delete") {
          return "đã xóa bình luận";
        }
        return "đã thao tác với bình luận";
        
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
        return (
          <Card variant="outlined" sx={{ mt: 1, borderRadius: 1 }}>
            <CardContent sx={{ p: "8px 12px !important" }}>
              {Object.entries(log.details)
                .filter(([key]) => key !== 'changedBy' && key !== 'changedAt')
                .map(([key, value]) => (
                  <Box key={key} mb={0.5}>
                    <Typography variant="body2" component="span" fontWeight={600}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}: 
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Chip
                        label={getValueText(value.oldValue)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      <ArrowRightAltIcon fontSize="small" />
                      <Chip
                        label={getValueText(value.newValue)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>
                ))}
            </CardContent>
          </Card>
        );
        
      case "view":
        return (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Xem lúc: {formatDateTime(log.details.viewedAt)}
          </Typography>
        );
        
      case "delete":
        return (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Xóa bởi: {log.details.deletedBy} vào lúc: {formatDateTime(log.details.deletedAt)}
          </Typography>
        );
        
      default:
        return null;
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
