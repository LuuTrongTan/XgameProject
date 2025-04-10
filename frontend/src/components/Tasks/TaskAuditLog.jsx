import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  Card,
  CardContent,
  Paper,
  Button,
  Collapse,
  useTheme,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { getTaskHistory } from "../../api/taskApi";
import UserAvatar from "../common/UserAvatar";
import DateTimeDisplay from "../common/DateTimeDisplay";
import { format, formatDistance } from "date-fns";
import { vi } from "date-fns/locale";
import { decodeFileName } from "../../utilities/fileNameUtils";

// Map trạng thái task sang tên hiển thị và màu sắc
const STATUS_MAP = {
  'todo': { label: 'Chưa làm', color: 'default', bgColor: '#f5f5f5', textColor: '#616161' },
  'in_progress': { label: 'Đang làm', color: 'primary', bgColor: '#e3f2fd', textColor: '#1976d2' },
  'inProgress': { label: 'Đang làm', color: 'primary', bgColor: '#e3f2fd', textColor: '#1976d2' },
  'doing': { label: 'Đang làm', color: 'primary', bgColor: '#e3f2fd', textColor: '#1976d2' },
  'review': { label: 'Đang xem xét', color: 'warning', bgColor: '#fff8e1', textColor: '#f57c00' },
  'done': { label: 'Hoàn thành', color: 'success', bgColor: '#e8f5e9', textColor: '#2e7d32' },
  'completed': { label: 'Hoàn thành', color: 'success', bgColor: '#e8f5e9', textColor: '#2e7d32' }
};

// Map độ ưu tiên sang tên hiển thị và màu sắc
const PRIORITY_MAP = {
  'low': { label: 'Thấp', color: 'info', bgColor: '#e1f5fe', textColor: '#0288d1' },
  'medium': { label: 'Trung bình', color: 'warning', bgColor: '#fffde7', textColor: '#ffa000' },
  'high': { label: 'Cao', color: 'error', bgColor: '#ffebee', textColor: '#d32f2f' }
};

// Map màu sắc cho các loại action
const ACTION_COLORS = {
  'create': { primary: '#4caf50', secondary: '#e8f5e9' },
  'update': { primary: '#2196f3', secondary: '#e3f2fd' },
  'delete': { primary: '#f44336', secondary: '#ffebee' },
  'status': { primary: '#9c27b0', secondary: '#f3e5f5' },
  'assign': { primary: '#ff9800', secondary: '#fff3e0' },
  'unassign': { primary: '#ff9800', secondary: '#fff3e0' },
  'attachment': { primary: '#795548', secondary: '#efebe9' },
  'comment': { primary: '#607d8b', secondary: '#eceff1' },
  'view': { primary: '#78909c', secondary: '#eceff1' },
  'progress': { primary: '#00bcd4', secondary: '#e0f7fa' },
  'time': { primary: '#ff5722', secondary: '#fbe9e7' },
};

const TaskAuditLog = ({ taskId, projectId, sprintId, task }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [maxLogs, setMaxLogs] = useState(30);
  
  // Trích xuất ID từ task nếu không được truyền trực tiếp
  const effectiveTaskId = taskId || (task && task._id);
  const effectiveProjectId = projectId || (task && task.project);
  const effectiveSprintId = sprintId || (task && task.sprint);

  // Thêm log debug các thông tin đầu vào
  useEffect(() => {
    console.log('[TaskAuditLog] Component initialized with params:', {
      taskId: effectiveTaskId, 
      projectId: effectiveProjectId, 
      sprintId: effectiveSprintId,
      directTaskId: taskId,
      taskObject: task ? `Task ${task._id} in project ${task.project}` : 'No task object'
    });
  }, []);
  
  useEffect(() => {
    console.log('[TaskAuditLog] Dependencies changed, fetching logs:', {
      taskId: effectiveTaskId, 
      projectId: effectiveProjectId, 
      sprintId: effectiveSprintId
    });
    fetchAuditLogs();
  }, [effectiveTaskId, effectiveProjectId, effectiveSprintId, task]);

  // Khi thay đổi task, reset trạng thái expanded
  useEffect(() => {
    setExpandedLogs({});
    setMaxLogs(30);
  }, [effectiveTaskId]);

  const fetchAuditLogs = async () => {
    // Kiểm tra đầy đủ và chi tiết từng tham số
    if (!effectiveTaskId) {
      console.error('[TaskAuditLog] Missing taskId parameter');
      setError("Thiếu thông tin task ID");
      setLoading(false);
      return;
    }
    
    if (!effectiveProjectId) {
      console.error('[TaskAuditLog] Missing projectId parameter');
      setError("Thiếu thông tin project ID");
      setLoading(false);
      return;
    }
    
    if (!effectiveSprintId) {
      console.error('[TaskAuditLog] Missing sprintId parameter');
      setError("Thiếu thông tin sprint ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setLogs([]);
    
    try {
      console.log(`[TaskAuditLog] Fetching audit logs with params: projectId=${effectiveProjectId}, sprintId=${effectiveSprintId}, taskId=${effectiveTaskId}`);
      const response = await getTaskHistory(effectiveProjectId, effectiveSprintId, effectiveTaskId);
      
      console.log('[TaskAuditLog] API response:', response);
      
      if (response && response.success) {
        let historyData = [];
        
        if (Array.isArray(response.data)) {
          historyData = response.data;
          console.log('[TaskAuditLog] Found array data directly in response.data, length:', historyData.length);
        } else if (response.data && Array.isArray(response.data.history)) {
          historyData = response.data.history;
          console.log('[TaskAuditLog] Found array data in response.data.history, length:', historyData.length);
        } else {
          console.warn('[TaskAuditLog] No valid history array found in response, data structure:', response.data);
        }
        
        // Debug logs cho attachment events
        const attachmentLogs = historyData.filter(log => log.action === 'attachment');
        if (attachmentLogs.length > 0) {
          console.log('[DEBUG] Attachment logs found:', attachmentLogs.length);
          console.log('[DEBUG] First attachment log details:', attachmentLogs[0].details);
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
        processedLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('[TaskAuditLog] Processed logs, count:', processedLogs.length);
        setLogs(processedLogs);
      } else {
        console.warn('[TaskAuditLog] No success flag in response or empty data');
        if (response && response.message) {
          setError(response.message);
        } else {
          setError("Không có dữ liệu lịch sử");
        }
        setLogs([]);
      }
    } catch (error) {
      console.error('[TaskAuditLog] Error fetching audit logs:', error);
      const errorMsg = error.response?.data?.message || error.message || "Không thể tải lịch sử thay đổi";
      setError(errorMsg);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (logId) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const getActionIcon = (action, details) => {
    // Xác định icon dựa trên action và details
    switch (action) {
      case "create":
        return <AddIcon />;
      case "update":
        if (details?.field) {
          switch(details.field) {
            case "status": return <TaskIcon />;
            case "priority": return <PriorityIcon />;
            case "title": return <TitleIcon />;
            case "description": return <DescriptionIcon />;
            case "dueDate": case "startDate": return <ScheduleIcon />;
            case "estimatedTime": return <TimeIcon />;
          }
        }
        return <EditIcon />;
      case "status":
        return <TaskIcon />;
      case "delete":
        return <DeleteIcon />;
      case "assign":
        return <AssignmentIcon />;
      case "unassign":
        return <PersonAddIcon />;
      case "attachment":
        return <AttachFileIcon />;
      case "comment":
        return <CommentIcon />;
      case "calendar":
        return <EventIcon />;
      case "view":
        return <VisibilityIcon />;
      case "progress":
        return <ChecklistIcon />;
      case "time":
        return <TimeIcon />;
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
        
      case "attachment":
        if (log.details) {
          // Xác định tên file từ nhiều trường có thể có
          const rawFileName = log.details.attachmentName || log.details.fileName || log.details.name || '';
          
          // Giải mã tên file để hiển thị đúng tiếng Việt
          const fileName = decodeFileName(rawFileName);
          console.log('[DEBUG] Filename after decoding:', fileName, 'Original:', rawFileName);
          
          // Xác định loại hành động
          const action = log.details.action || 'update';
          
          if (action === 'add') {
            return `đã tải lên tệp đính kèm ${fileName ? `"${fileName}"` : ''}`;
          } else if (action === 'delete') {
            return `đã xóa tệp đính kèm ${fileName ? `"${fileName}"` : ''}`;
          } else {
            return `đã thay đổi tệp đính kèm ${fileName ? `"${fileName}"` : ''}`;
          }
        }
        return "đã thay đổi tệp đính kèm";
        
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

  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { 
        addSuffix: true,
        locale: vi
      });
    } catch (error) {
      return dateString;
    }
  };

  // Tách thời gian thành ngày và giờ
  const getDateParts = (dateString) => {
    try {
      const date = new Date(dateString);
      return {
        day: format(date, 'dd/MM/yyyy', { locale: vi }),
        time: format(date, 'HH:mm', { locale: vi })
      };
    } catch (error) {
      return { day: 'Không xác định', time: 'Không xác định' };
    }
  };
  
  const getValueText = (value, fieldType) => {
    if (value === null || value === undefined) return 'Không có';
    
    // Xử lý hiển thị dữ liệu theo từng loại trường
    switch(fieldType) {
      case 'status':
        return STATUS_MAP[value]?.label || value;
      case 'priority':
        return PRIORITY_MAP[value]?.label || value;
      case 'date':
        try {
          return formatDateTime(value);
        } catch (e) {
          return value;
        }
      case 'assignees':
        if (Array.isArray(value)) {
          if (value.length === 0) return 'Không có';
          // Kiểm tra xem mảng có chứa object hay string
          if (typeof value[0] === 'object') {
            return value.map(assignee => assignee.name || assignee.email || 'Không xác định').join(', ');
          }
          return value.join(', ');
        }
        return value.toString();
      case 'tags':
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : 'Không có';
        }
        return value.toString();
      case 'array':
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : 'Không có';
        }
        return value.toString();
      case 'time':
        return `${value} giờ`;
      default:
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
    }
  };

  // Phương thức để xác định loại trường
  const getFieldType = (fieldName) => {
    switch(fieldName) {
      case 'status': return 'status';
      case 'priority': return 'priority';
      case 'dueDate': 
      case 'startDate': 
      case 'endDate': 
      case 'createdAt': 
      case 'updatedAt': 
        return 'date';
      case 'assignees': return 'assignees';
      case 'tags': return 'tags';
      case 'estimatedHours':
      case 'actualHours':
      case 'estimatedTime':
      case 'actualTime':
        return 'time';
      default: return 'text';
    }
  };

  // Phương thức để hiển thị tên trường dễ đọc
  const getFieldLabel = (fieldName) => {
    const fieldLabels = {
      'title': 'Tên công việc',
      'description': 'Mô tả',
      'status': 'Trạng thái',
      'priority': 'Độ ưu tiên',
      'dueDate': 'Hạn chót',
      'startDate': 'Ngày bắt đầu',
      'endDate': 'Ngày kết thúc',
      'estimatedHours': 'Thời gian ước tính',
      'actualHours': 'Thời gian thực tế',
      'estimatedTime': 'Thời gian ước tính',
      'actualTime': 'Thời gian thực tế',
      'assignees': 'Người thực hiện',
      'tags': 'Nhãn',
      'position': 'Vị trí',
      'progress': 'Tiến độ',
      'comments': 'Bình luận',
      'attachments': 'Tệp đính kèm'
    };
    
    return fieldLabels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  // Hiển thị chi tiết của log
  const renderLogDetails = (log) => {
    if (!log.details) return null;
    
    // Xác định màu nền dựa trên loại hành động
    const actionColor = ACTION_COLORS[log.action] || ACTION_COLORS['update'];
    
    switch (log.action) {
      case "create":
        return (
          <Box>
            {log.details.title && (
              <Box mb={0.5} display="flex" alignItems="center">
                <Typography variant="body2" component="span" sx={{ fontWeight: 600, color: 'text.secondary', width: 120 }}>
                  Tên:
                </Typography>
                <Typography variant="body2" component="span" sx={{ ml: 1, flex: 1 }}>
                  {log.details.title}
                </Typography>
              </Box>
            )}
            
            <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
              {log.details.status && (
                <Chip
                  icon={<TaskIcon sx={{ fontSize: '1rem !important' }} />}
                  label={STATUS_MAP[log.details.status]?.label || log.details.status}
                  size="small"
                  sx={{ 
                    height: 24, 
                    fontSize: '0.75rem',
                    backgroundColor: STATUS_MAP[log.details.status]?.bgColor,
                    color: STATUS_MAP[log.details.status]?.textColor,
                    fontWeight: 600,
                  }}
                />
              )}
              
              {log.details.priority && (
                <Chip
                  icon={<PriorityIcon sx={{ fontSize: '1rem !important' }} />}
                  label={PRIORITY_MAP[log.details.priority]?.label || log.details.priority}
                  size="small"
                  sx={{ 
                    height: 24, 
                    fontSize: '0.75rem',
                    backgroundColor: PRIORITY_MAP[log.details.priority]?.bgColor,
                    color: PRIORITY_MAP[log.details.priority]?.textColor,
                    fontWeight: 600,
                  }}
                />
              )}
              
              {log.details.estimatedTime && (
                <Chip
                  icon={<TimeIcon sx={{ fontSize: '1rem !important' }} />}
                  label={`${log.details.estimatedTime} giờ`}
                  size="small"
                  sx={{ 
                    height: 24, 
                    fontSize: '0.75rem',
                    backgroundColor: theme.palette.info.light,
                    color: theme.palette.info.dark,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            
            {log.details.description && (
              <Box mt={1.5}>
                <Typography variant="body2" component="div" sx={{ 
                  fontWeight: 600, 
                  mb: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'text.secondary'
                }}>
                  <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Mô tả:
                </Typography>
                <Paper variant="outlined" sx={{ 
                  py: 1, 
                  px: 1.5, 
                  bgcolor: 'rgba(255,255,255,0.8)', 
                  borderRadius: 1.5,
                  fontSize: '0.82rem',
                  whiteSpace: 'pre-wrap',
                  borderColor: 'rgba(0,0,0,0.09)',
                }}>
                  <Typography variant="body2">
                    {log.details.description.length > 100 
                      ? log.details.description.substring(0, 100) + '...' 
                      : log.details.description}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        );
        
      case "update":
        return (
          <Box>
            {Object.entries(log.details)
              .filter(([key]) => key !== 'changedBy' && key !== 'changedAt')
              .map(([key, value]) => {
                // Icon cho từng loại thay đổi
                let fieldIcon;
                const fieldType = getFieldType(key);
                const fieldLabel = getFieldLabel(key);
                
                switch(key) {
                  case 'title':
                    fieldIcon = <TitleIcon fontSize="small" />;
                    break;
                  case 'description':
                    fieldIcon = <DescriptionIcon fontSize="small" />;
                    break;
                  case 'status':
                    fieldIcon = <TaskIcon fontSize="small" />;
                    break;
                  case 'priority':
                    fieldIcon = <PriorityIcon fontSize="small" />;
                    break;
                  case 'dueDate':
                  case 'startDate':
                  case 'endDate':
                    fieldIcon = <ScheduleIcon fontSize="small" />;
                    break;
                  case 'estimatedHours':
                  case 'actualHours':
                  case 'estimatedTime':
                  case 'actualTime':
                    fieldIcon = <TimeIcon fontSize="small" />;
                    break;
                  case 'assignees':
                    fieldIcon = <AssignmentIcon fontSize="small" />;
                    break;
                  case 'tags':
                    fieldIcon = <LabelIcon fontSize="small" />;
                    break;
                  default:
                    fieldIcon = <EditIcon fontSize="small" />;
                }
                
                // Style đặc biệt cho các loại trường
                let oldChipProps = {};
                let newChipProps = {};
                
                if (key === 'status') {
                  oldChipProps = {
                    backgroundColor: STATUS_MAP[value.oldValue]?.bgColor || theme.palette.grey[100],
                    color: STATUS_MAP[value.oldValue]?.textColor || theme.palette.text.secondary,
                  };
                  newChipProps = {
                    backgroundColor: STATUS_MAP[value.newValue]?.bgColor || theme.palette.primary.light,
                    color: STATUS_MAP[value.newValue]?.textColor || theme.palette.primary.contrastText,
                  };
                } else if (key === 'priority') {
                  oldChipProps = {
                    backgroundColor: PRIORITY_MAP[value.oldValue]?.bgColor || theme.palette.grey[100],
                    color: PRIORITY_MAP[value.oldValue]?.textColor || theme.palette.text.secondary,
                  };
                  newChipProps = {
                    backgroundColor: PRIORITY_MAP[value.newValue]?.bgColor || theme.palette.primary.light,
                    color: PRIORITY_MAP[value.newValue]?.textColor || theme.palette.primary.contrastText,
                  };
                }
                
                // Style đặc biệt cho description
                if (key === 'description') {
                  return (
                    <Box key={key} mb={1.5}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          color: 'text.secondary',
                          mb: 0.5
                        }}
                      >
                        {fieldIcon}
                        <Box component="span" sx={{ ml: 0.5 }}>{fieldLabel}</Box>
                      </Typography>
                      
                      <Paper 
                        variant="outlined" 
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          borderRadius: 1.5,
                          p: 1.5,
                          borderColor: 'rgba(0,0,0,0.09)',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Mô tả đã được cập nhật
                        </Typography>
                        
                        <Button 
                          size="small" 
                          variant="outlined" 
                          onClick={() => toggleExpand(`${log._id || log.id}-desc`)}
                          endIcon={expandedLogs[`${log._id || log.id}-desc`] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          sx={{ mb: 1 }}
                        >
                          {expandedLogs[`${log._id || log.id}-desc`] ? 'Ẩn chi tiết' : 'Xem chi tiết thay đổi'}
                        </Button>
                        
                        <Collapse in={expandedLogs[`${log._id || log.id}-desc`]}>
                          <Box sx={{ mt: 1, mb: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              Nội dung cũ:
                            </Typography>
                            <Paper 
                              variant="outlined" 
                              sx={{ 
                                p: 1, 
                                bgcolor: 'grey.50', 
                                borderColor: 'grey.200',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              <Typography variant="body2">
                                {value.oldValue || 'Không có nội dung'}
                              </Typography>
                            </Paper>
                          </Box>
                          
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5 }}>
                              Nội dung mới:
                            </Typography>
                            <Paper 
                              variant="outlined" 
                              sx={{ 
                                p: 1, 
                                bgcolor: 'primary.50', 
                                borderColor: 'primary.100',
                                whiteSpace: 'pre-wrap'
                              }}
                            >
                              <Typography variant="body2">
                                {value.newValue || 'Không có nội dung'}
                              </Typography>
                            </Paper>
                          </Box>
                        </Collapse>
                      </Paper>
                    </Box>
                  );
                }
                
                // Xử lý cho các mảng (tags, assignees)
                if (Array.isArray(value.oldValue) || Array.isArray(value.newValue)) {
                  return (
                    <Box key={key} mb={1.5}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          color: 'text.secondary',
                          mb: 0.5
                        }}
                      >
                        {fieldIcon}
                        <Box component="span" sx={{ ml: 0.5 }}>{fieldLabel}</Box>
                      </Typography>
                      
                      <Paper 
                        variant="outlined" 
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.8)',
                          borderRadius: 1.5,
                          p: 1.5,
                          borderColor: 'rgba(0,0,0,0.09)',
                        }}
                      >
                        <Box display="flex" alignItems="flex-start" flexDirection="column">
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                            Đã thay đổi từ:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                            {Array.isArray(value.oldValue) && value.oldValue.length > 0 ? (
                              value.oldValue.map((item, idx) => (
                                <Chip
                                  key={idx}
                                  label={typeof item === 'object' ? (item.name || item.email || JSON.stringify(item)) : item}
                                  size="small"
                                  sx={{ 
                                    height: 24, 
                                    fontSize: '0.75rem',
                                    backgroundColor: theme.palette.grey[100],
                                    fontWeight: 500
                                  }}
                                />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Không có
                              </Typography>
                            )}
                          </Box>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, mb: 0.5 }}>
                            Thành:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Array.isArray(value.newValue) && value.newValue.length > 0 ? (
                              value.newValue.map((item, idx) => (
                                <Chip
                                  key={idx}
                                  label={typeof item === 'object' ? (item.name || item.email || JSON.stringify(item)) : item}
                                  size="small"
                                  sx={{ 
                                    height: 24, 
                                    fontSize: '0.75rem',
                                    backgroundColor: theme.palette.primary.light,
                                    color: theme.palette.primary.contrastText,
                                    fontWeight: 500
                                  }}
                                />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Không có
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    </Box>
                  );
                }
                
                // Hiển thị mặc định cho các trường đơn giản khác
                return (
                  <Box key={key} mb={1.5}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        color: 'text.secondary',
                        mb: 0.5
                      }}
                    >
                      {fieldIcon}
                      <Box component="span" sx={{ ml: 0.5 }}>{fieldLabel}</Box>
                    </Typography>
                    
                    <Paper 
                      variant="outlined" 
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.8)',
                        borderRadius: 1.5,
                        p: 1,
                        borderColor: 'rgba(0,0,0,0.09)',
                      }}
                    >
                      <Box display="flex" alignItems="center" flexWrap="wrap">
                        <Chip
                          label={getValueText(value.oldValue, fieldType)}
                          size="small"
                          sx={{ 
                            height: 24, 
                            fontSize: '0.75rem',
                            backgroundColor: theme.palette.grey[100],
                            borderColor: theme.palette.grey[300],
                            fontWeight: 500,
                            ...oldChipProps
                          }}
                        />
                        
                        <ArrowRightAltIcon 
                          fontSize="small" 
                          sx={{ 
                            color: theme.palette.text.secondary,
                            mx: 1
                          }} 
                        />
                        
                        <Chip
                          label={getValueText(value.newValue, fieldType)}
                          size="small"
                          sx={{ 
                            height: 24, 
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: theme.palette.primary.light,
                            color: theme.palette.primary.contrastText,
                            ...newChipProps
                          }}
                        />
                      </Box>
                    </Paper>
                  </Box>
                );
              })}
          </Box>
        );
        
      case "status":
        return (
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                mb: 0.5
              }}
            >
              <TaskIcon fontSize="small" sx={{ mr: 0.5 }} />
              Thay đổi trạng thái
            </Typography>
            
            <Paper 
              variant="outlined" 
              sx={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: 1.5,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                borderColor: 'rgba(0,0,0,0.09)',
              }}
            >
              <Chip
                label={STATUS_MAP[log.details?.oldStatus]?.label || log.details?.oldStatus}
                size="small"
                sx={{ 
                  height: 26, 
                  fontSize: '0.8rem',
                  backgroundColor: STATUS_MAP[log.details?.oldStatus]?.bgColor,
                  color: STATUS_MAP[log.details?.oldStatus]?.textColor,
                  fontWeight: 500,
                  px: 0.5
                }}
              />
              
              <ArrowRightAltIcon 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontSize: '1.3rem'
                }} 
              />
              
              <Chip
                label={STATUS_MAP[log.details?.newStatus]?.label || log.details?.newStatus}
                size="small"
                sx={{ 
                  height: 26, 
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: STATUS_MAP[log.details?.newStatus]?.bgColor,
                  color: STATUS_MAP[log.details?.newStatus]?.textColor,
                  px: 0.5
                }}
              />
            </Paper>
          </Box>
        );
        
      case "view":
        return (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mt: 0.5, 
              fontSize: '0.8rem',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <VisibilityIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
            Xem chi tiết lúc {formatDateTime(log.details.viewedAt)}
          </Typography>
        );
        
      case "delete":
        return (
          <Typography 
            variant="body2" 
            color="error" 
            sx={{ 
              mt: 0.5,
              py: 0.5,
              px: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(244, 67, 54, 0.08)',
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.8rem',
              fontWeight: 600
            }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 0.5 }} />
            Đã xóa bởi {log.details.deletedBy} vào lúc {formatDateTime(log.details.deletedAt)}
          </Typography>
        );
        
      case "attachment":
        // Debug log chi tiết
        console.log('[DEBUG] Rendering attachment log details:', log.details);
        
        // Xác định tên file từ nhiều trường có thể có
        const rawFileName = log.details.attachmentName || log.details.fileName || log.details.name || 'Tệp không xác định';
        
        // Giải mã tên file để hiển thị đúng tiếng Việt
        const fileName = decodeFileName(rawFileName);
        console.log('[DEBUG] Filename after decoding:', fileName, 'Original:', rawFileName);
        
        // Xác định kích thước file
        const fileSize = log.details.size || log.details.fileSize || 0;
        
        // Xác định loại hành động
        const actionType = log.details.action || 'update';
        
        return (
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                mb: 0.5
              }}
            >
              <AttachFileIcon fontSize="small" sx={{ mr: 0.5 }} />
              {actionType === 'add' ? 'Thêm tệp đính kèm' : 
               actionType === 'delete' ? 'Xóa tệp đính kèm' : 'Thao tác tệp đính kèm'}
            </Typography>
            
            <Paper 
              variant="outlined" 
              sx={{
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderRadius: 1.5,
                p: 1.5,
                borderColor: 'rgba(0,0,0,0.09)',
              }}
            >
              <Box display="flex" alignItems="center">
                <AttachFileIcon fontSize="small" sx={{ mr: 1, color: theme.palette.text.secondary }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {fileName}
                </Typography>
                
                {fileSize > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({(fileSize / 1024).toFixed(2)} KB)
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        );
        
      default:
        return null;
    }
  };

  const loadMore = () => {
    setMaxLogs(prev => prev + 10);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={3} flexDirection="column" alignItems="center">
        <CircularProgress size={28} thickness={4} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Đang tải lịch sử...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center', 
          borderRadius: 2, 
          backgroundColor: '#fff4e5', 
          border: '1px solid #ffe0b2'
        }}
      >
        <Typography color="error" variant="subtitle2">
          {error}
        </Typography>
        <Button 
          variant="outlined" 
          size="small" 
          onClick={fetchAuditLogs} 
          sx={{ mt: 2, borderRadius: 4 }}
        >
          Thử lại
        </Button>
      </Paper>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center', 
          borderRadius: 2, 
          backgroundColor: '#f5f5f5', 
          border: '1px dashed #e0e0e0'
        }}
      >
        <HistoryIcon sx={{ color: 'text.secondary', fontSize: 32, mb: 1, opacity: 0.5 }} />
        <Typography color="text.secondary" variant="body2">
          Chưa có lịch sử thay đổi nào
        </Typography>
      </Paper>
    );
  }

  // Nhóm logs theo ngày
  const groupedLogs = logs.reduce((groups, log) => {
    const date = new Date(log.createdAt);
    const day = format(date, 'dd/MM/yyyy', { locale: vi });
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(log);
    return groups;
  }, {});

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {Object.entries(groupedLogs).map(([day, dayLogs], dayIndex) => (
        <Box key={day} mb={3} sx={{ width: '100%' }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              mb: 1.5, 
              display: 'flex', 
              alignItems: 'center',
              backgroundColor: theme.palette.grey[100],
              py: 1,
              px: 2,
              borderRadius: 1.5,
              fontWeight: 600,
              color: theme.palette.text.secondary,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              width: '100%',
            }}
          >
            <HistoryIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
            {day === format(new Date(), 'dd/MM/yyyy', { locale: vi }) ? 'Hôm nay' : 
             day === format(new Date(Date.now() - 86400000), 'dd/MM/yyyy', { locale: vi }) ? 'Hôm qua' : day}
          </Typography>
          
          <List sx={{ 
            position: 'relative',
            pl: 7,
            pr: 2,
            width: '100%',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 40,
              width: 2,
              backgroundColor: theme.palette.grey[200],
              zIndex: 0
            }
          }}>
            {dayLogs.slice(0, dayIndex === 0 ? maxLogs : undefined).map((log, index) => {
              const logId = log._id || log.id || `log-${dayIndex}-${index}`;
              const isExpanded = expandedLogs[logId] || false;
              const actionColor = ACTION_COLORS[log.action] || ACTION_COLORS['update'];
              const timeParts = getDateParts(log.createdAt);
              
              return (
                <ListItem 
                  key={logId}
                  sx={{ 
                    position: 'relative',
                    pb: 2,
                    pt: index === 0 ? 0 : 2,
                    px: 0,
                  }}
                  disablePadding
                  disableGutters
                >
                  {/* Time chip */}
                  <Chip
                    label={timeParts.time}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      position: 'absolute',
                      left: -85,
                      width: '60px',
                      top: index === 0 ? 12 : 22,
                      height: 26,
                      minWidth: '60px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: 1,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      borderColor: theme.palette.grey[300],
                      bgcolor: theme.palette.background.paper,
                    }}
                  />
                  
                  {/* Avatar and timeline dot combined */}
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      left: -28,
                      top: index === 0 ? 5 : 15,
                      zIndex: 2,
                    }}
                  >
                    <Avatar 
                      src={log.user?.avatar}
                      alt={log.user?.name || log.user?.fullName}
                      sx={{ 
                        width: 36, 
                        height: 36, 
                        boxShadow: '0 0 0 3px white, 0 0 0 4px rgba(0,0,0,0.1)',
                        bgcolor: actionColor.primary,
                        color: '#fff',
                      }}
                    >
                      {(log.user?.name || log.user?.fullName || '?').charAt(0).toUpperCase()}
                    </Avatar>
                  </Box>
                  
                  {/* Content card */}
                  <Card
                    variant="outlined"
                    sx={{
                      width: '100%',
                      borderRadius: 2,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      borderColor: theme.palette.grey[200],
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: '0 2px 5px rgba(0,0,0,0.12)',
                        borderColor: theme.palette.grey[300],
                      },
                      overflow: 'hidden',
                    }}
                  >
                    <CardContent sx={{ p: '12px 16px !important', '&:last-child': { pb: '12px !important' } }}>
                      {/* Header */}
                      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                          {/* Icon */}
                          <Box 
                            display="flex" 
                            alignItems="center" 
                            justifyContent="center" 
                            mr={1.5}
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              backgroundColor: actionColor.secondary,
                              color: actionColor.primary,
                              flexShrink: 0,
                            }}
                          >
                            {getActionIcon(log.action, log.details)}
                          </Box>
                          
                          {/* User and action text */}
                          <Box>
                            <Box display="flex" alignItems="center" flexWrap="wrap">
                              <Typography variant="subtitle2" fontWeight={600} sx={{ mr: 1 }}>
                                {log.user?.fullName || log.user?.name || 'Người dùng'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 400 }}>
                                {getActionText(log)}
                              </Typography>
                            </Box>
                            
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{ fontSize: '0.7rem', display: 'block', mt: 0.5 }}
                            >
                              {formatTimeAgo(log.createdAt)}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {/* Toggle button */}
                        {renderLogDetails(log) && (
                          <Button
                            size="small"
                            color="primary"
                            sx={{ 
                              minWidth: 'auto', 
                              p: 0,
                              height: 24,
                              ml: 1,
                              fontSize: '0.7rem',
                              textTransform: 'none',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                            onClick={() => toggleExpand(logId)}
                            endIcon={isExpanded ? 
                              <ExpandLessIcon fontSize="small" /> : 
                              <ExpandMoreIcon fontSize="small" />
                            }
                          >
                            {isExpanded ? "Ẩn chi tiết" : "Hiện chi tiết"}
                          </Button>
                        )}
                      </Box>
                      
                      {/* Details content */}
                      {renderLogDetails(log) && (
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box 
                            sx={{ 
                              mt: 1.5, 
                              pt: 1.5, 
                              borderTop: '1px solid', 
                              borderColor: 'rgba(0,0,0,0.05)' 
                            }}
                          >
                            {renderLogDetails(log)}
                          </Box>
                        </Collapse>
                      )}
                    </CardContent>
                  </Card>
                </ListItem>
              );
            })}
          </List>
        </Box>
      ))}
      
      {maxLogs < logs.length && (
        <Box display="flex" justifyContent="center" mt={2} mb={1}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={loadMore}
            startIcon={<HistoryIcon />}
            sx={{ 
              borderRadius: 4,
              px: 2,
              py: 0.75,
              fontSize: '0.8rem',
              textTransform: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              '&:hover': {
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                backgroundColor: theme.palette.primary.light,
                color: theme.palette.primary.contrastText,
              }
            }}
          >
            Xem thêm lịch sử ({logs.length - maxLogs} còn lại)
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TaskAuditLog;
