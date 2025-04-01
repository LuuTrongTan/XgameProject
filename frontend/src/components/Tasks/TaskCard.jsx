import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  Collapse,
  Button,
  Avatar,
  AvatarGroup,
  Tooltip,
  Divider,
  Stack,
  styled,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction,
  TextField,
  CircularProgress,
  Badge,
  InputAdornment,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Label as LabelIcon,
  Send as SendIcon,
  History as HistoryIcon,
  InsertDriveFile as InsertDriveFileIcon,
  CloudUpload as CloudUploadIcon,
  PersonOff as PersonOffIcon,
  CalendarToday as CalendarTodayIcon,
  Visibility as VisibilityIcon,
  DragIndicator as DragIndicatorIcon
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import {
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
  addTaskAttachment,
  getTaskAttachments,
  deleteTaskAttachment,
  getTaskComments,
  addTaskComment,
  updateTaskComment,
  deleteTaskComment,
  getTaskAuditLogs,
} from "../../api/taskApi";
import UserAvatar from "../common/UserAvatar";
import DateTimeDisplay from "../common/DateTimeDisplay";
import TaskComments from "./TaskComments";
import TaskAuditLog from "./TaskAuditLog";

// Styled components
const TaskCardContainer = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  borderRadius: "12px",
  overflow: "visible",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  transition: "all 0.2s ease-in-out",
  position: "relative",
  border: "1px solid rgba(255,255,255,0.5)",
  backgroundColor: "#ffffff",
  backgroundImage: "linear-gradient(to bottom, #ffffff, #fcfcff)",
  "&:hover": {
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    transform: "translateY(-4px)",
    backgroundImage: "linear-gradient(to bottom, #ffffff, #f0f4ff)",
  }
}));

const PriorityIndicator = styled(Box)(({ priority, theme }) => ({
  position: "absolute",
  top: 0,
  right: 0,
  width: "90px",
  height: "45px",
  borderRadius: "0 12px 0 25px",
  backgroundColor: 
    priority === "high" ? theme.palette.error.main :
    priority === "medium" ? theme.palette.warning.main : 
    theme.palette.success.main,
  zIndex: 10,
  boxShadow: priority === "high" ? "0 3px 8px rgba(211, 47, 47, 0.3)" : 
             priority === "medium" ? "0 3px 8px rgba(237, 108, 2, 0.3)" : 
             "0 3px 8px rgba(46, 125, 50, 0.3)",
  opacity: 0.85,
  "&:after": {
    content: '""',
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    height: "40%",
    background: "linear-gradient(to top, rgba(255,255,255,0.2), transparent)",
  }
}));

const TaskTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "1.05rem",
  marginBottom: theme.spacing(1),
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  color: theme.palette.text.primary,
}));

const TaskDescription = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.85rem",
  marginBottom: theme.spacing(1.5),
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
}));

const TaskInfoSection = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(1.5),
}));

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'colorData'
})(({ theme, colorData }) => ({
  backgroundColor: colorData?.bg || theme.palette.grey[200],
  color: colorData?.color || theme.palette.grey[700],
  height: "22px",
  fontSize: "0.7rem",
  fontWeight: 500,
  borderRadius: "4px",
}));

// Main component
const TaskCard = ({
  task,
  container,
  project,
  onEdit,
  onDelete,
  onAddComment,
  onAddAttachment,
  actionButtons,
  index = 0,
  onDragStart,
  onDragEnd,
}) => {
  const { user } = useAuth();
  const { canDeleteTask } = usePermissions();
  const [expanded, setExpanded] = useState(false);
  const [expandedTab, setExpandedTab] = useState(0);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef();
  
  // Enhance task with sprint information if missing
  const enhancedTask = React.useMemo(() => {
    // If task already has sprintId, use it
    if (task.sprintId || task.sprint?._id) {
      return task;
    }
    
    // Otherwise, get sprintId from URL if possible
    const urlParams = new URLSearchParams(window.location.search);
    const sprintIdFromUrl = urlParams.get('sprint');
    
    // Try to extract project and sprint from the URL path
    const pathParts = window.location.pathname.split('/');
    const projectIdx = pathParts.indexOf('projects');
    const sprintIdx = pathParts.indexOf('sprints');
    
    let pathProjectId = null;
    let pathSprintId = null;
    
    if (projectIdx !== -1 && projectIdx < pathParts.length - 1) {
      pathProjectId = pathParts[projectIdx + 1];
    }
    
    if (sprintIdx !== -1 && sprintIdx < pathParts.length - 1) {
      pathSprintId = pathParts[sprintIdx + 1];
    }
    
    return {
      ...task,
      projectId: task.projectId || task.project?._id || pathProjectId || project?._id,
      sprintId: task.sprintId || task.sprint?._id || pathSprintId || sprintIdFromUrl,
    };
  }, [task, project]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: enhancedTask._id,
    data: { task: enhancedTask, index, container }
  });

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    filter: isDragging ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))' : 'none',
  };
  
  // Chi tiết button click handler
  const handleDetailClick = (e) => {
    // Ensure the event doesn't trigger card behavior
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Call onEdit directly with the event
    if (typeof onEdit === 'function') {
      onEdit(enhancedTask, e);
    }
    
    return false;
  };
  
  // Handlers
  const handleExpandClick = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setExpanded(!expanded);
    
    // Fetch data for the first tab when expanding
    if (!expanded) {
      // Set default tab
      setExpandedTab(0);
      
      // Log task data for debugging
      console.log("Task data in handleExpandClick:", { 
        task: enhancedTask, 
        project, 
        container,
        expandedTab
      });
      
      // Load comments when first expanded
      fetchAllData();
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setExpandedTab(newValue);
    
    // Log task data for debugging
    console.log("Task data in handleTabChange:", { 
      task: enhancedTask, 
      project, 
      container,
      newTabValue: newValue
    });
    
    // Tải dữ liệu tương ứng với tab
    if (newValue === 0) {
      fetchComments();
    } else if (newValue === 1) {
      fetchAttachments();
    } else if (newValue === 2) {
      fetchHistory();
    }
  };

  // Thêm useEffect để lưu và nạp lại comment từ localStorage
  React.useEffect(() => {
    // Chỉ nạp comment từ localStorage khi component được mount lần đầu và nếu có
    const savedComments = localStorage.getItem(`task_comments_${enhancedTask._id}`);
    if (savedComments && comments.length === 0) {
      try {
        const parsedComments = JSON.parse(savedComments);
        // Chỉ đặt comments nếu mảng này không rỗng
        if (parsedComments && parsedComments.length > 0) {
          setComments(parsedComments);
        }
      } catch (error) {
        console.error("Error parsing saved comments:", error);
      }
    }
  }, [enhancedTask._id, comments.length]); // Thêm comments.length vào dependencies

  // Thêm useEffect cho attachments
  React.useEffect(() => {
    // Chỉ nạp attachments từ localStorage khi component được mount lần đầu
    const savedAttachments = localStorage.getItem(`task_attachments_${enhancedTask._id}`);
    if (savedAttachments && attachments.length === 0) {
      try {
        const parsedAttachments = JSON.parse(savedAttachments);
        if (parsedAttachments && parsedAttachments.length > 0) {
          setAttachments(parsedAttachments);
        }
      } catch (error) {
        console.error("Error parsing saved attachments:", error);
      }
    }
  }, [enhancedTask._id, attachments.length]);

  // Thêm useEffect cho history
  React.useEffect(() => {
    // Chỉ nạp history từ localStorage khi component được mount lần đầu
    const savedHistory = localStorage.getItem(`task_history_${enhancedTask._id}`);
    if (savedHistory && history.length === 0) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (parsedHistory && parsedHistory.length > 0) {
          setHistory(parsedHistory);
        }
      } catch (error) {
        console.error("Error parsing saved history:", error);
      }
    }
  }, [enhancedTask._id, history.length]);

  // Thêm useEffect để đồng bộ dữ liệu khi component mount
  React.useEffect(() => {
    // Chỉ tải dữ liệu khi component được mở rộng
    if (expanded) {
      // Tải dữ liệu cho cả 3 tab khi mở rộng
      fetchAllData();
    }
  }, [expanded, enhancedTask._id]); // Chạy khi opened hoặc taskId thay đổi

  // Hàm tải tất cả dữ liệu
  const fetchAllData = async () => {
    // Tải song song cả 3 loại dữ liệu
    fetchComments();
    fetchAttachments();
    fetchHistory();
  };

  // Sửa lại hàm fetchComments để cập nhật localStorage khi lấy comments mới
  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      // Lấy projectId và sprintId từ task hoặc từ props
      const taskProjectId = enhancedTask.projectId || enhancedTask.project?._id || project?._id;
      const taskSprintId = enhancedTask.sprintId || enhancedTask.sprint?._id;
      
      if (!taskProjectId || !taskSprintId) {
        console.error("Missing projectId or sprintId for fetchComments:", { taskProjectId, taskSprintId, task: enhancedTask });
        return;
      }
      
      console.log("Fetching comments for task:", { 
        taskId: enhancedTask._id, 
        projectId: taskProjectId, 
        sprintId: taskSprintId 
      });
      
      const result = await getTaskComments(taskProjectId, taskSprintId, enhancedTask._id);
      console.log("Comments API result:", result);
      
      if (result.success) {
        // Đảm bảo data.comments hoặc data là mảng
        let fetchedComments = [];
        
        // Kiểm tra cấu trúc phản hồi API và lấy mảng comments
        if (result.data && Array.isArray(result.data)) {
          fetchedComments = result.data;
        } else if (result.data && result.data.comments && Array.isArray(result.data.comments)) {
          fetchedComments = result.data.comments;
        } else if (result.data && result.data.data && Array.isArray(result.data.data.comments)) {
          fetchedComments = result.data.data.comments;
        } else {
          console.error("Unexpected comments data structure:", result.data);
        }
        
        console.log("Processed comments:", fetchedComments);
        setComments(fetchedComments);
        
        // Lưu comments vào localStorage sau khi fetch
        if (fetchedComments.length > 0) {
          try {
            localStorage.setItem(`task_comments_${enhancedTask._id}`, JSON.stringify(fetchedComments));
          } catch (error) {
            console.error("Error saving fetched comments to localStorage:", error);
          }
        }
      } else {
        console.error("Error in fetchComments:", result.message);
        // Đặt comments là mảng rỗng để tránh lỗi
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      // Đặt comments là mảng rỗng để tránh lỗi
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      setLoadingAttachments(true);
      // Lấy projectId và sprintId từ task hoặc từ props
      const taskProjectId = enhancedTask.projectId || enhancedTask.project?._id || project?._id;
      const taskSprintId = enhancedTask.sprintId || enhancedTask.sprint?._id;
      
      if (!taskProjectId || !taskSprintId) {
        console.error("Missing projectId or sprintId for fetchAttachments:", { taskProjectId, taskSprintId, task: enhancedTask });
        return;
      }
      
      console.log("Fetching attachments for task:", { 
        taskId: enhancedTask._id, 
        projectId: taskProjectId, 
        sprintId: taskSprintId 
      });
      
      const result = await getTaskAttachments(taskProjectId, taskSprintId, enhancedTask._id);
      if (result.success) {
        const fetchedAttachments = result.data || [];
        setAttachments(fetchedAttachments);
        
        // Lưu attachments vào localStorage
        if (fetchedAttachments.length > 0) {
          try {
            localStorage.setItem(`task_attachments_${enhancedTask._id}`, JSON.stringify(fetchedAttachments));
          } catch (error) {
            console.error("Error saving fetched attachments to localStorage:", error);
          }
        }
      } else {
        console.error("Error in fetchAttachments:", result.message);
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      // Lấy projectId và sprintId từ task hoặc từ props
      const taskProjectId = enhancedTask.projectId || enhancedTask.project?._id || project?._id;
      const taskSprintId = enhancedTask.sprintId || enhancedTask.sprint?._id;
      
      if (!taskProjectId || !taskSprintId) {
        console.error("Missing projectId or sprintId for fetchHistory:", { taskProjectId, taskSprintId, task: enhancedTask });
        return;
      }
      
      console.log("Fetching history for task:", { 
        taskId: enhancedTask._id, 
        projectId: taskProjectId, 
        sprintId: taskSprintId 
      });
      
      const result = await getTaskAuditLogs(taskProjectId, taskSprintId, enhancedTask._id);
      if (result.success) {
        const fetchedHistory = result.data || [];
        setHistory(fetchedHistory);
        
        // Lưu history vào localStorage
        if (fetchedHistory.length > 0) {
          try {
            localStorage.setItem(`task_history_${enhancedTask._id}`, JSON.stringify(fetchedHistory));
          } catch (error) {
            console.error("Error saving fetched history to localStorage:", error);
          }
        }
      } else {
        console.error("Error in fetchHistory:", result.message);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cập nhật hàm handleSendComment để tải lại lịch sử sau khi gửi bình luận
  const handleSendComment = async () => {
    if (!newComment.trim() || !enhancedTask._id) return;
    
    try {
      // Lấy projectId và sprintId từ task hoặc từ props
      const taskProjectId = enhancedTask.projectId || enhancedTask.project?._id || project?._id;
      const taskSprintId = enhancedTask.sprintId || enhancedTask.sprint?._id;
      
      if (!taskProjectId || !taskSprintId) {
        console.error("Missing projectId or sprintId for handleSendComment:", { taskProjectId, taskSprintId, task: enhancedTask });
        return;
      }
      
      console.log("Sending comment for task:", { 
        taskId: enhancedTask._id, 
        projectId: taskProjectId, 
        sprintId: taskSprintId,
        comment: newComment
      });
      
      const result = await addTaskComment(taskProjectId, taskSprintId, enhancedTask._id, newComment);
      if (result.success) {
        const updatedComments = [...comments, result.data];
        setComments(updatedComments);
        
        // Lưu comments vào localStorage
        try {
          localStorage.setItem(`task_comments_${enhancedTask._id}`, JSON.stringify(updatedComments));
        } catch (error) {
          console.error("Error saving comments to localStorage:", error);
        }
        
        setNewComment("");
        
        // Tải lại lịch sử sau khi thêm bình luận
        fetchHistory();
      } else {
        console.error("Error in handleSendComment:", result.message);
      }
    } catch (error) {
      console.error("Error sending comment:", error);
    }
  };

  // Cập nhật hàm handleFileUpload để tải lại lịch sử sau khi tải lên tệp
  const handleFileUpload = async (event) => {
    if (!event.target.files || !event.target.files[0] || !enhancedTask._id) return;
    
    const file = event.target.files[0];
    try {
      // Lấy projectId và sprintId từ task hoặc từ props
      const taskProjectId = enhancedTask.projectId || enhancedTask.project?._id || project?._id;
      const taskSprintId = enhancedTask.sprintId || enhancedTask.sprint?._id;
      
      if (!taskProjectId || !taskSprintId) {
        console.error("Missing projectId or sprintId for handleFileUpload:", { taskProjectId, taskSprintId, task: enhancedTask });
        return;
      }
      
      console.log("Uploading file for task:", { 
        taskId: enhancedTask._id, 
        projectId: taskProjectId, 
        sprintId: taskSprintId,
        fileName: file.name,
        fileSize: file.size
      });
      
      const result = await addTaskAttachment(taskProjectId, taskSprintId, enhancedTask._id, file);
      if (result.success) {
        const updatedAttachments = [...attachments, result.data];
        setAttachments(updatedAttachments);
        
        // Lưu attachments vào localStorage
        try {
          localStorage.setItem(`task_attachments_${enhancedTask._id}`, JSON.stringify(updatedAttachments));
        } catch (error) {
          console.error("Error saving attachments to localStorage:", error);
        }
        
        // Tải lại lịch sử sau khi thêm tệp đính kèm
        fetchHistory();
      } else {
        console.error("Error in handleFileUpload:", result.message);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Helper functions
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

  const getStatusLabel = (status) => {
    switch (status) {
      case "todo":
        return "Chưa bắt đầu";
      case "inProgress":
        return "Đang thực hiện";
      case "review":
        return "Đang kiểm tra";
      case "done":
        return "Hoàn thành";
      default:
        return "Không xác định";
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "low":
        return "Thấp";
      case "medium":
        return "Trung bình";
      case "high":
        return "Cao";
      default:
        return "Không xác định";
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: vi });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // Get days remaining
  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    
    try {
      const due = new Date(dueDate);
      const today = new Date();
      
      // Reset time to compare dates only
      due.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return `Quá hạn ${Math.abs(diffDays)} ngày`;
      } else if (diffDays === 0) {
        return "Hết hạn hôm nay";
      } else {
        return `Còn ${diffDays} ngày`;
      }
    } catch (error) {
      console.error("Error calculating days remaining:", error);
      return null;
    }
  };

  // Extracted for readability
  const statusColor = getStatusColor(enhancedTask.status);

  // Xử lý sự kiện kéo thả
  const handleDragStart = (e) => {
    e.stopPropagation();
    
    // Đặt dữ liệu để sử dụng khi thả
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', enhancedTask._id);
      e.dataTransfer.effectAllowed = 'move';
    }
    
    // Gọi callback onDragStart nếu được cung cấp
    if (typeof onDragStart === 'function') {
      onDragStart(e, enhancedTask, container);
    }
  };

  return (
    <TaskCardContainer
      ref={setNodeRef}
      style={cardStyle}
      onClick={handleDetailClick}
      draggable={true}
      onDragStart={handleDragStart}
      sx={{
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
      }}
    >
      {/* Status strip - top of card */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "5px",
          backgroundColor: getStatusColor(enhancedTask.status)?.bg || "#f5f5f5",
          borderRadius: "12px 12px 0 0",
        }}
      />
      
      {/* Priority indicator - top right corner */}
      {enhancedTask.priority && (
        <PriorityIndicator priority={enhancedTask.priority} />
      )}

      {/* Main content */}
      <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
        {/* Content */}
        <Box>
          {/* Action buttons position top right */}
          {actionButtons}
          
          {/* Card main content */}
          <Box sx={{ pr: enhancedTask.priority ? 7 : 0 }}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mb: 1 }}>
              <StatusChip 
                label={getStatusLabel(enhancedTask.status)} 
                colorData={getStatusColor(enhancedTask.status)}
                size="small"
              />
              
              {/* Due date chip */}
              {enhancedTask.dueDate && (
                <Tooltip title="Ngày hết hạn">
                  <Chip
                    icon={<CalendarTodayIcon style={{ fontSize: "0.7rem" }} />}
                    label={
                      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        <Typography variant="caption" fontSize="0.7rem">
                          {formatDate(enhancedTask.dueDate)}
                        </Typography>
                      </Box>
                    }
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "0.7rem",
                      bgcolor: 'rgba(0,0,0,0.04)',
                      color: 'text.secondary',
                      '& .MuiChip-icon': { marginLeft: '4px', marginRight: '-4px' },
                      '& .MuiChip-label': { px: 1 },
                      borderRadius: "4px",
                    }}
                  />
                </Tooltip>
              )}
            </Box>
            
            {/* Task title */}
            <TaskTitle variant="h6">
              {enhancedTask.title || enhancedTask.name}
            </TaskTitle>
            
            {/* Task description */}
            <TaskDescription variant="body2">
              {enhancedTask.description || "Không có mô tả"}
            </TaskDescription>
            
            {/* Task details - assignees, tags, etc. */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {/* Assignees */}
              {enhancedTask.assignees && enhancedTask.assignees.length > 0 ? (
                <AvatarGroup 
                  max={3} 
                  sx={{ 
                    '& .MuiAvatar-root': { 
                      width: 24, 
                      height: 24, 
                      fontSize: '0.75rem',
                      border: '1px solid #fff'
                    },
                    mr: 1
                  }}
                >
                  {enhancedTask.assignees.map((assignee, index) => {
                    // Người dùng có thể là object hoặc string ID
                    const name = assignee?.name || assignee?.fullName || assignee?.email || "Người dùng";
                    const avatar = assignee?.avatar || assignee?.user?.avatar;
                    const id = assignee?._id || assignee?.id || assignee?.user?._id || assignee;
                    
                    return (
                      <Tooltip key={id || `assignee-${index}`} title={name}>
                        <Avatar src={avatar}>
                          {name.charAt(0).toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    );
                  })}
                </AvatarGroup>
              ) : (
                <Tooltip title="Chưa gán cho ai">
                  <Chip
                    icon={<PersonIcon style={{ fontSize: "0.7rem" }} />}
                    label="Chưa gán"
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "0.7rem",
                      bgcolor: 'rgba(0,0,0,0.04)',
                      color: 'text.secondary',
                      '& .MuiChip-icon': { marginLeft: '4px', marginRight: '-4px' },
                      '& .MuiChip-label': { px: 1 },
                      borderRadius: "4px",
                    }}
                  />
                </Tooltip>
              )}
              
              {/* Estimate time */}
              {enhancedTask.estimatedTime && Number(enhancedTask.estimatedTime) > 0 && (
                <Tooltip title="Thời gian ước tính">
                  <Chip
                    icon={<AccessTimeIcon style={{ fontSize: "0.7rem" }} />}
                    label={`${enhancedTask.estimatedTime}h`}
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "0.7rem",
                      bgcolor: 'rgba(0,0,0,0.04)',
                      color: 'text.secondary',
                      '& .MuiChip-icon': { marginLeft: '4px', marginRight: '-4px' },
                      '& .MuiChip-label': { px: 1 },
                      borderRadius: "4px",
                    }}
                  />
                </Tooltip>
              )}
              
              {/* Tags */}
              {enhancedTask.tags && enhancedTask.tags.length > 0 && enhancedTask.tags.slice(0, 2).map((tag, index) => (
                <Tooltip title="Tag" key={`tag-${index}`}>
                  <Chip
                    icon={<LabelIcon style={{ fontSize: "0.7rem" }} />}
                    label={tag}
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "0.7rem",
                      bgcolor: 'rgba(156, 39, 176, 0.1)',
                      color: '#7b1fa2',
                      '& .MuiChip-icon': { marginLeft: '4px', marginRight: '-4px', color: '#7b1fa2' },
                      '& .MuiChip-label': { px: 1 },
                      borderRadius: "4px",
                    }}
                  />
                </Tooltip>
              ))}
              
              {/* More tags indicator */}
              {enhancedTask.tags && enhancedTask.tags.length > 2 && (
                <Tooltip title={enhancedTask.tags.slice(2).join(', ')}>
                  <Chip
                    label={`+${enhancedTask.tags.length - 2}`}
                    size="small"
                    sx={{
                      height: "22px",
                      fontSize: "0.7rem",
                      bgcolor: 'rgba(156, 39, 176, 0.05)',
                      color: '#7b1fa2',
                      '& .MuiChip-label': { px: 1 },
                      borderRadius: "4px",
                    }}
                  />
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {/* Footer with project name and action buttons */}
          <Box sx={{ 
            mt: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            {/* Project name */}
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
                maxWidth: "50%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {project?.name || "Dự án"}
            </Typography>

            {/* Action buttons at bottom right */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<VisibilityIcon />}
                onClick={handleDetailClick}
                sx={{
                  borderRadius: "6px",
                  textTransform: "none",
                  fontSize: "0.75rem",
                  py: 0.6,
                  fontWeight: "bold",
                  boxShadow: '0 3px 6px rgba(0,0,0,0.15)',
                  backgroundImage: 'linear-gradient(to right, #1976d2, #2196f3)',
                  "&:hover": {
                    boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
                    backgroundImage: 'linear-gradient(to right, #1565c0, #1976d2)',
                  }
                }}
              >
                CHI TIẾT
              </Button>
              
              {/* Expand button - đặt ở góc phải dưới */}
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandClick(e);
                }}
                sx={{
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s',
                  width: 26,
                  height: 26,
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.08)',
                  }
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </CardContent>
      
      {/* Expanded content - with class name for targeting */}
      <Collapse in={expanded} timeout="auto" unmountOnExit className="expanded-content" onClick={(e) => e.stopPropagation()}>
        <CardContent sx={{ pt: 1, pb: 1.5 }}>
          <Divider sx={{ mb: 1.5 }} />
          
          {/* Tabs cho comments, files, lịch sử */}
          <Box sx={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }} onClick={(e) => e.stopPropagation()}>
              <Tabs 
                value={expandedTab} 
                onChange={handleTabChange} 
                aria-label="task detail tabs"
                variant="fullWidth"
                sx={{ minHeight: '36px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <Tab 
                  icon={<Badge badgeContent={comments.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}><CommentIcon sx={{ fontSize: '1rem' }} /></Badge>} 
                  label="Bình luận" 
                  id="task-tab-0" 
                  aria-controls="task-tabpanel-0"
                  sx={{ 
                    minHeight: '36px', 
                    fontSize: '0.75rem',
                    px: 1,
                    '& .MuiTab-iconWrapper': { 
                      marginRight: '4px',
                      marginBottom: '0px'
                    }
                  }}
                />
                <Tab 
                  icon={<Badge badgeContent={attachments.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}><AttachFileIcon sx={{ fontSize: '1rem' }} /></Badge>} 
                  label="Tệp đính kèm" 
                  id="task-tab-1" 
                  aria-controls="task-tabpanel-1"
                  sx={{ 
                    minHeight: '36px', 
                    fontSize: '0.75rem',
                    px: 1,
                    '& .MuiTab-iconWrapper': { 
                      marginRight: '4px',
                      marginBottom: '0px'
                    }
                  }}
                />
                <Tab 
                  icon={<HistoryIcon sx={{ fontSize: '1rem' }} />} 
                  label="Lịch sử" 
                  id="task-tab-2" 
                  aria-controls="task-tabpanel-2"
                    sx={{
                    minHeight: '36px', 
                    fontSize: '0.75rem',
                    px: 1,
                    '& .MuiTab-iconWrapper': { 
                      marginRight: '4px',
                      marginBottom: '0px'
                    }
                  }}
                />
              </Tabs>
            </Box>

            {/* Tab Comments */}
            <Box
              role="tabpanel"
              hidden={expandedTab !== 0}
              id="task-tabpanel-0"
              aria-labelledby="task-tab-0"
              sx={{ py: 1.5 }}
            >
              {loadingComments ? (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <List sx={{ width: '100%', p: 0 }} dense>
                    {(!comments || !Array.isArray(comments) || comments.length === 0) ? (
                      <Box display="flex" justifyContent="center" my={1}>
                        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                          Chưa có bình luận nào.
                        </Typography>
                      </Box>
                    ) : (
                      Array.isArray(comments) && comments.map((comment, index) => (
                        <ListItem
                          key={comment._id || `comment-${index}`}
                          alignItems="flex-start"
                          sx={{
                            py: 0.5,
                            px: 0,
                            borderBottom: index < comments.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 36 }}>
                            <Avatar 
                              src={comment.user?.avatar}
                              sx={{ width: 24, height: 24 }}
                            >
                              {(comment.user?.name || "?").charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" component="span" fontSize="0.75rem">
                                  {comment.user?.name || "Người dùng"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                  {comment.createdAt ? format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                color="text.primary"
                                sx={{ mt: 0.5, whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}
                              >
                                {comment.content}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      placeholder="Thêm bình luận..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      size="small"
                      sx={{ 
                        '& .MuiInputBase-root': { 
                          fontSize: '0.75rem',
                          padding: '4px 8px'
                        }
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              color="primary" 
                              onClick={handleSendComment}
                              disabled={!newComment.trim()}
                              size="small"
                            >
                              <SendIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </>
              )}
            </Box>
            
            {/* Tab Tệp đính kèm */}
            <Box
              role="tabpanel"
              hidden={expandedTab !== 1}
              id="task-tabpanel-1"
              aria-labelledby="task-tab-1"
              sx={{ py: 1.5 }}
            >
              {loadingAttachments ? (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <>
                  <List sx={{ width: '100%', p: 0 }} dense>
                    {(!attachments || !Array.isArray(attachments) || attachments.length === 0) ? (
                      <Box display="flex" justifyContent="center" my={1}>
                        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                          Chưa có tệp đính kèm nào.
                        </Typography>
                      </Box>
                    ) : (
                      Array.isArray(attachments) && attachments.map((attachment, index) => (
                        <ListItem
                          key={attachment._id || `attachment-${index}`}
                          alignItems="center"
                          sx={{ 
                            py: 0.5,
                            px: 0,
                            borderBottom: index < attachments.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <InsertDriveFileIcon color="primary" sx={{ fontSize: '1.2rem' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" fontSize="0.75rem">
                                {attachment.filename || "Tệp đính kèm"}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : ''}
                                {attachment.createdAt ? ` · ${format(new Date(attachment.createdAt), "dd/MM/yyyy", { locale: vi })}` : ''}
                              </Typography>
                            }
                          />
                          <Button
                            variant="outlined"
                            size="small"
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ fontSize: '0.7rem', py: 0, px: 1, minHeight: '24px' }}
                          >
                            Tải xuống
                          </Button>
                        </ListItem>
                      ))
                    )}
                  </List>
                  
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                    <input
                      accept="*/*"
                      style={{ display: 'none' }}
                      id={`task-file-upload-${enhancedTask._id}`}
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <label htmlFor={`task-file-upload-${enhancedTask._id}`}>
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon sx={{ fontSize: '1rem' }} />}
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Tải lên
                      </Button>
                    </label>
                  </Box>
                </>
              )}
            </Box>
            
            {/* Tab Lịch sử */}
            <Box
              role="tabpanel"
              hidden={expandedTab !== 2}
              id="task-tabpanel-2"
              aria-labelledby="task-tab-2"
              sx={{ py: 1.5 }}
            >
              {loadingHistory ? (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List sx={{ width: '100%', p: 0 }} dense>
                  {(!history || !Array.isArray(history) || history.length === 0) ? (
                    <Box display="flex" justifyContent="center" my={1}>
                      <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                        Chưa có lịch sử thay đổi.
                      </Typography>
                    </Box>
                  ) : (
                    Array.isArray(history) && history.map((item, index) => (
                      <ListItem
                        key={item._id || `history-${index}`}
                        alignItems="flex-start"
                        sx={{ 
                          py: 0.5,
                          px: 0,
                          borderBottom: index < history.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30, mt: 0.5 }}>
                          <HistoryIcon color="primary" sx={{ fontSize: '1.2rem' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" component="span" fontSize="0.75rem">
                                {item.user?.name || "Người dùng"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                {item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Typography
                              variant="body2"
                              color="text.primary"
                              sx={{ mt: 0.5, fontSize: '0.75rem' }}
                            >
                              {item.action || "Đã thực hiện một hành động"}
                              {item.details && `: ${item.details}`}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              )}
            </Box>
          </Box>
        </CardContent>
      </Collapse>
    </TaskCardContainer>
  );
};

export default TaskCard;
