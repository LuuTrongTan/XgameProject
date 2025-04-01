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
  Grid,
  Link,
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
    
    // Combine all sources of info
    return {
      ...task,
      projectId: task.projectId || pathProjectId || (project ? project._id : null),
      sprintId: task.sprintId || pathSprintId || sprintIdFromUrl
    };
  }, [task, project]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      task,
      container,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Open card in edit mode
  const handleDetailClick = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  // Toggle card expand state
  const handleExpandClick = (e) => {
    e.stopPropagation();
    
    // If we're expanding, load data
    if (!expanded) {
      fetchAllData();
    }
    
    setExpanded(!expanded);
  };

  // Handle tab change in expanded card view
  const handleTabChange = (event, newValue) => {
    setExpandedTab(newValue);
    
    // Load data if not already loaded
    if (newValue === 0 && comments.length === 0 && !loadingComments) {
      fetchComments();
    } else if (newValue === 1 && attachments.length === 0 && !loadingAttachments) {
      fetchAttachments();
    } else if (newValue === 2 && history.length === 0 && !loadingHistory) {
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
        return { bg: "rgba(66, 165, 245, 0.1)", color: "#1976d2" };
      case "inProgress":
        return { bg: "rgba(255, 152, 0, 0.1)", color: "#f57c00" };
      case "review":
        return { bg: "rgba(171, 71, 188, 0.1)", color: "#7b1fa2" };
      case "done":
        return { bg: "rgba(76, 175, 80, 0.1)", color: "#2e7d32" };
      default:
        return { bg: "rgba(66, 165, 245, 0.1)", color: "#1976d2" };
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
  
  // Get priority color for display
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "low":
        return { bg: "rgba(76, 175, 80, 0.1)", color: "#2e7d32" };
      case "medium":
        return { bg: "rgba(255, 152, 0, 0.1)", color: "#f57c00" };
      case "high":
        return { bg: "rgba(244, 67, 54, 0.1)", color: "#d32f2f" };
      default:
        return { bg: "rgba(158, 158, 158, 0.1)", color: "#757575" };
    }
  };

  // Format date with localization
  const formatDate = (dateString) => {
    if (!dateString) return "Không có";
    
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: vi });
    } catch (error) {
      console.error("Date format error:", error);
      return "Không hợp lệ";
    }
  };

  // Calculate days remaining until due date
  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    
    try {
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      console.error("Date calculation error:", error);
      return null;
    }
  };

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
    <div ref={setNodeRef} style={style}>
      <TaskCardContainer 
        elevation={3}
        onClick={handleDetailClick}
        sx={isDragging ? { cursor: "grabbing" } : {}}
      >
        {/* Priority indicator at top-right corner */}
        <PriorityIndicator priority={task.priority} />
        
        {/* Drag handle */}
        <Box 
          sx={{ 
            position: "absolute", 
            top: "10px", 
            left: "10px", 
            cursor: "grab",
            color: "text.secondary", 
            opacity: 0.5,
            "&:hover": { opacity: 0.8 } 
          }}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
        
        <CardContent sx={{ pt: 3.5, pb: 1.5 }}>
          {/* Task title */}
          <TaskTitle variant="h6">
            {task.title}
          </TaskTitle>
          
          {/* Task description (truncated) */}
          <TaskDescription variant="body2" color="text.secondary">
            {task.description}
          </TaskDescription>
          
          {/* Status chip */}
          <StatusChip 
            label={getStatusLabel(task.status)} 
            size="small"
            colorData={getStatusColor(task.status)}
          />
          
          {/* Due date & assignees */}
          <TaskInfoSection>
            <Box display="flex" alignItems="center">
              {task.dueDate && (
                <Tooltip title="Ngày hết hạn">
                  <Box display="flex" alignItems="center" mr={1.5}>
                    <CalendarTodayIcon 
                      fontSize="small" 
                      sx={{ 
                        fontSize: "0.85rem", 
                        mr: 0.5, 
                        color: "text.secondary" 
                      }} 
                    />
                    <Typography variant="caption">
                      {formatDate(task.dueDate)}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </Box>
            
            <Box display="flex" alignItems="center">
              {/* Assignees */}
              {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                <AvatarGroup 
                  max={2} 
                  sx={{ 
                    '& .MuiAvatar-root': { 
                      width: 22, 
                      height: 22, 
                      fontSize: '0.75rem', 
                      border: '1px solid #fff' 
                    } 
                  }}
                >
                  {task.assignees.map((assignee, index) => (
                    <Tooltip 
                      key={assignee?._id || `${task._id}-assignee-${index}`} 
                      title={assignee?.name || assignee?.email || "Người dùng không xác định"}
                    >
                      <Avatar 
                        src={assignee?.avatar} 
                        alt={assignee?.name}
                        sx={{ width: 22, height: 22 }}
                      >
                        {((assignee?.name || assignee?.email || "?") || "?").charAt(0).toUpperCase()}
                      </Avatar>
                    </Tooltip>
                  ))}
                </AvatarGroup>
              ) : (
                <Tooltip title="Chưa có người thực hiện">
                  <PersonOffIcon 
                    fontSize="small" 
                    sx={{ 
                      fontSize: "0.85rem", 
                      color: "text.disabled" 
                    }} 
                  />
                </Tooltip>
              )}
            </Box>
          </TaskInfoSection>
          
          {/* Task meta info */}
          <Box 
            display="flex" 
            justifyContent="space-between"
            alignItems="center"
            mt={1}
          >
            {/* Comments, attachments, estimated time */}
            <Box display="flex" alignItems="center">
              <Tooltip title="Bình luận">
                <Box 
                  display="flex" 
                  alignItems="center" 
                  mr={1.5}
                  sx={{ opacity: 0.6 }}
                >
                  <Badge 
                    badgeContent={task.stats?.totalComments || 0} 
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}
                  >
                    <CommentIcon sx={{ fontSize: '0.9rem' }} />
                  </Badge>
                </Box>
              </Tooltip>
              
              <Tooltip title="Tệp đính kèm">
                <Box 
                  display="flex" 
                  alignItems="center" 
                  mr={1.5}
                  sx={{ opacity: 0.6 }}
                >
                  <Badge 
                    badgeContent={task.stats?.totalAttachments || task.attachments?.length || 0} 
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}
                  >
                    <AttachFileIcon sx={{ fontSize: '0.9rem' }} />
                  </Badge>
                </Box>
              </Tooltip>
              
              {task.estimatedTime && (
                <Tooltip title="Thời gian ước tính">
                  <Box 
                    display="flex" 
                    alignItems="center"
                    sx={{ opacity: 0.6 }}
                  >
                    <AccessTimeIcon sx={{ fontSize: '0.9rem', mr: 0.3 }} />
                    <Typography variant="caption">
                      {task.estimatedTime}h
                    </Typography>
                  </Box>
                </Tooltip>
              )}
            </Box>
            
            {/* Expand button */}
            <IconButton 
              size="small" 
              onClick={handleExpandClick}
              sx={{ 
                padding: 0.5, 
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </CardContent>
        
        {/* Expanded card details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ pt: 0, pb: 2 }}>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs 
                value={expandedTab}
                onChange={handleTabChange}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                aria-label="task details tabs"
                sx={{ '& .MuiTab-root': { fontSize: '0.8rem', py: 1 } }}
              >
                <Tab label="Bình luận" />
                <Tab label="Tệp đính kèm" />
                <Tab label="Lịch sử" />
              </Tabs>
            </Box>
            
            {/* Thông tin chi tiết */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Độ ưu tiên
                  </Typography>
                  <Chip 
                    label={getPriorityLabel(task.priority)}
                    size="small"
                    sx={{
                      backgroundColor: getPriorityColor(task.priority).bg,
                      color: getPriorityColor(task.priority).color,
                    }}
                  />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Ngày hết hạn
                  </Typography>
                  <Typography variant="body2">
                    {task.dueDate ? formatDate(task.dueDate) : 'Chưa có hạn'}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Thời gian ước tính
                  </Typography>
                  <Typography variant="body2">
                    {task.estimatedTime ? `${task.estimatedTime} giờ` : 'Chưa có ước tính'}
                  </Typography>
                </Grid>
                
                {task.tags?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tags
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                      {task.tags.map((tag, index) => (
                        <Chip
                          key={`tag-${index}`}
                          label={tag}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: '20px', fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
            
            {/* Tab content */}
            <Box>
              {/* Comments tab */}
              {expandedTab === 0 && (
                <Box>
                  {loadingComments ? (
                    <Box display="flex" justifyContent="center" my={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : comments.length > 0 ? (
                    <List disablePadding>
                      {comments.map((comment) => (
                        <ListItem
                          key={comment._id}
                          alignItems="flex-start"
                          sx={{ px: 0, py: 1 }}
                        >
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar
                              src={comment.user?.avatar}
                              sx={{ width: 30, height: 30 }}
                            >
                              {comment.user?.name?.charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" component="span">
                                {comment.user?.name || "Người dùng"}
                              </Typography>
                            }
                            secondary={
                              <React.Fragment>
                                <Typography
                                  variant="body2"
                                  component="span"
                                  sx={{ display: 'block', whiteSpace: 'pre-wrap' }}
                                >
                                  {comment.content}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  component="span"
                                  color="text.secondary"
                                >
                                  {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                                </Typography>
                              </React.Fragment>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      Chưa có bình luận nào
                    </Typography>
                  )}
                  
                  {/* Add comment input */}
                  <Box display="flex" mt={2}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Thêm bình luận..."
                      variant="outlined"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton 
                              edge="end" 
                              disabled={!newComment.trim()}
                              onClick={handleSendComment}
                              size="small"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                </Box>
              )}
              
              {/* Attachments tab */}
              {expandedTab === 1 && (
                <Box>
                  {loadingAttachments ? (
                    <Box display="flex" justifyContent="center" my={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : attachments.length > 0 ? (
                    <List disablePadding>
                      {attachments.map((attachment) => (
                        <ListItem
                          key={attachment._id || attachment.id}
                          alignItems="flex-start"
                          sx={{ px: 0, py: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <InsertDriveFileIcon />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" component="span">
                                <Link 
                                  href={attachment.url} 
                                  target="_blank" 
                                  rel="noopener"
                                  underline="hover"
                                >
                                  {attachment.name}
                                </Link>
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(attachment.uploadedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      Chưa có tệp đính kèm nào
                    </Typography>
                  )}
                  
                  {/* Upload file button */}
                  <Box display="flex" justifyContent="center" mt={2}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      style={{ display: "none" }}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      size="small"
                      onClick={() => fileInputRef.current.click()}
                    >
                      Tải lên tệp đính kèm
                    </Button>
                  </Box>
                </Box>
              )}
              
              {/* History tab */}
              {expandedTab === 2 && (
                <Box>
                  {loadingHistory ? (
                    <Box display="flex" justifyContent="center" my={2}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : history.length > 0 ? (
                    <List disablePadding>
                      {history.map((entry, index) => (
                        <ListItem
                          key={entry._id || `history-${index}`}
                          alignItems="flex-start"
                          sx={{ px: 0, py: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <HistoryIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" component="span">
                                {entry.user?.name || "Người dùng"} {entry.action}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary">
                                {format(new Date(entry.timestamp || entry.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center">
                      Chưa có lịch sử thay đổi nào
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </CardContent>
        </Collapse>
      </TaskCardContainer>
    </div>
  );
};

export default TaskCard;
