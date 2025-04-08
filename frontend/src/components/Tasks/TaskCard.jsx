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
  DragIndicator as DragIndicatorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  getTaskHistory,
} from "../../api/taskApi";
import UserAvatar from "../common/UserAvatar";
import DateTimeDisplay from "../common/DateTimeDisplay";
import { 
  getTaskStatusColor, 
  getTaskStatusLabel, 
  getTaskPriorityLabel, 
  getTaskPriorityColor 
} from "../../config/constants";
import { useNavigate } from "react-router-dom";

import TaskAuditLog from "./TaskAuditLog";

// Styled components
const TaskCardContainer = styled(Card)(({ theme, status }) => {
  // Get the color based on task status
  const statusColor = (() => {
    switch (status) {
      case "todo":
        return "rgba(25, 118, 210, 0.6)"; // Nhạt hơn cho todo
      case "inProgress":
        return "rgba(245, 124, 0, 0.6)"; // Nhạt hơn cho in progress
      case "review":
        return "rgba(123, 31, 162, 0.6)"; // Nhạt hơn cho review
      case "done":
        return "rgba(46, 125, 50, 0.6)"; // Nhạt hơn cho done
      default:
        return "rgba(25, 118, 210, 0.6)"; // Default nhạt hơn
    }
  })();

  const statusColorLight = (() => {
    switch (status) {
      case "todo":
        return "rgba(25, 118, 210, 0.05)"; // Nhạt hơn cho todo
      case "inProgress":
        return "rgba(245, 124, 0, 0.05)"; // Nhạt hơn cho in progress
      case "review":
        return "rgba(123, 31, 162, 0.05)"; // Nhạt hơn cho review
      case "done":
        return "rgba(46, 125, 50, 0.05)"; // Nhạt hơn cho done
      default:
        return "rgba(25, 118, 210, 0.05)"; // Default nhạt hơn
    }
  })();

  return {
    marginBottom: theme.spacing(1),
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    border: "1px solid rgba(0,0,0,0.06)",
    backgroundColor: statusColorLight,
    backgroundImage: `linear-gradient(145deg, ${statusColorLight}, #ffffff)`,
    padding: "1px",
    "&:hover": {
      boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
      transform: "translateY(-4px)",
      backgroundImage: `linear-gradient(145deg, ${statusColorLight}, #ffffff)`,
      backgroundColor: statusColorLight,
      border: "1px solid rgba(0,0,0,0.08)",
    },
  };
});

const PriorityIndicator = styled(Box)(({ priority, theme }) => ({
  position: "absolute",
  top: "10px",
  right: "10px",
  width: "12px",
  height: "12px",
  borderRadius: "50%", // Tạo hình tròn
  backgroundColor: 
    priority === "high" ? "#f44336" : // Đỏ tươi hơn
    priority === "medium" ? "#ff9800" : // Cam rõ ràng hơn
    "#4caf50", // Xanh lá
  boxShadow: 
    priority === "high" ? "0 0 4px rgba(244, 67, 54, 0.4)" : 
    priority === "medium" ? "0 0 4px rgba(255, 152, 0, 0.4)" : 
    "0 0 4px rgba(76, 175, 80, 0.4)",
  zIndex: 10,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "scale(1.2)",
  }
}));

const TaskTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "0.95rem",
  lineHeight: 1.3,
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  color: theme.palette.text.primary,
  letterSpacing: "-0.01em",
  maxWidth: "calc(100% - 120px)",
}));

const TaskDescription = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: "0.85rem",
  marginBottom: theme.spacing(1),
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  lineHeight: 1.4,
}));

const TaskInfoSection = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: theme.spacing(2),
  paddingTop: theme.spacing(1.5),
  borderTop: "1px solid rgba(0,0,0,0.05)",
}));

// Thêm styled component mới cho Tags
const TagChip = styled(Chip)(({ theme }) => ({
  height: "20px",
  fontSize: "0.65rem",
  fontWeight: 500,
  borderRadius: "10px",
  margin: "0 2px",
  backgroundColor: "rgba(74, 20, 140, 0.1)",
  color: "rgba(74, 20, 140, 0.8)",
  border: "1px solid rgba(74, 20, 140, 0.2)",
  "& .MuiChip-icon": {
    fontSize: "0.75rem",
    color: "inherit"
  },
  "& .MuiChip-label": {
    padding: "0 4px"
  }
}));

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'colorData'
})(({ theme, colorData }) => ({
  backgroundColor: colorData?.bg || theme.palette.grey[200],
  color: colorData?.color || theme.palette.grey[700],
  height: "20px", // Giảm kích cỡ từ 24px xuống 20px
  fontSize: "0.65rem", // Giảm font size
  fontWeight: 500,
  borderRadius: "10px", // Bo tròn hơn
  padding: "0 6px",
  "& .MuiChip-label": {
    padding: "0 4px",
  }
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
  onViewDetail,
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
  const navigate = useNavigate();
  
  // Tính toán màu dựa trên status
  const getStatusColorLight = (status) => {
    switch (status) {
      case "todo":
        return "rgba(25, 118, 210, 0.05)"; // Nhạt hơn cho todo
      case "inProgress":
        return "rgba(245, 124, 0, 0.05)"; // Nhạt hơn cho in progress
      case "review":
        return "rgba(123, 31, 162, 0.05)"; // Nhạt hơn cho review
      case "done":
        return "rgba(46, 125, 50, 0.05)"; // Nhạt hơn cho done
      default:
        return "rgba(25, 118, 210, 0.05)"; // Default nhạt hơn
    }
  };

  const statusColorLight = getStatusColorLight(task.status);

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
      type: "Task",
      task,
      container,
      index,
    },
  });

  // Lưu listeners vào ref để đảm bảo ổn định tham chiếu
  const listenersRef = useRef(listeners);
  const attributesRef = useRef(attributes);
  
  // Cập nhật ref khi listeners/attributes thay đổi
  useEffect(() => {
    listenersRef.current = listeners;
    attributesRef.current = attributes;
  }, [listeners, attributes]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    width: '100%',
    position: 'relative',
    touchAction: 'none', // Thêm để ngăn các hành động touch mặc định
    cursor: isDragging ? 'grabbing' : 'inherit',
  };

  // Handle card click for viewing details
  const handleCardClick = (e) => {
    // Không thực hiện click khi đang kéo
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    console.log('[DEBUG] TaskCard handleCardClick called, will call onViewDetail with task:', task._id);
    // Call onViewDetail to open task detail dialog
    if (onViewDetail) {
      console.log('[DEBUG] Calling onViewDetail function with delay');
      
      // Gọi với delay nhỏ để đảm bảo không xung đột với các sự kiện khác
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => {
        onViewDetail(task);
      }, 50);
    } else {
      console.log('[DEBUG] onViewDetail function is not defined');
    }
  };

  // Handle edit button click
  const handleEditClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) {
      onEdit(task);
    }
  };

  // Handle delete button click
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(task._id);
    }
  };

  // Handle tab change in expanded card view
  const handleTabChange = (event, newValue) => {
    event.stopPropagation(); // Ngăn chặn sự kiện click lan truyền
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
      
      const result = await getTaskHistory(taskProjectId, taskSprintId, enhancedTask._id);
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

  // Fallback cho kéo thả bằng native HTML5 drag events
  const handleNativeDragStart = (e) => {
    // Chỉ sử dụng fallback khi dnd-kit không hoạt động
    if (!listeners || Object.keys(listeners).length === 0) {
      console.log("Using fallback drag start");
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: task._id,
        container,
        index
      }));
      
      // Gọi callback nếu có
      if (onDragStart && typeof onDragStart === 'function') {
        onDragStart(e, task, container);
      }
    }
  };

  return (
    <TaskCardContainer
      status={task.status}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      id={`task-${task._id}`}
      data-task-id={task._id}
      data-status={task.status}
      data-position={task.position}
      data-index={index}
      className="task-card"
      elevation={0}
      onClick={handleCardClick}
      sx={{
        position: "relative",
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Transform.toString({
          ...transform,
          scaleX: 1,
          scaleY: 1,
        }),
        zIndex: isDragging ? 999 : 1,
        transition: !isDragging
          ? "transform 250ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1)"
          : undefined,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "pointer",
        "&:hover": {
          cursor: "pointer",
        },
        "&:active": {
          cursor: isDragging ? "grabbing" : "pointer",
        },
        ...(isDragging && {
          boxShadow: "0 16px 32px rgba(0,0,0,0.2)",
        }),
      }}
    >
      {/* Priority indicator as a small dot at top-right corner with tooltip */}
      <Tooltip 
        title={`Độ ưu tiên: ${getTaskPriorityLabel(task.priority)}`}
        placement="top-end"
      >
        <PriorityIndicator priority={task.priority} />
      </Tooltip>
      
      {/* Status and Due Date */}
      <Box 
        display="flex" 
        justifyContent="flex-start" 
        alignItems="center" 
        pl={0}
        pr={3}
        pt={0}
        pb={0}
        ml={0}
        sx={{
          position: "absolute",
          top: "10px",
          left: "0px",
          zIndex: 1,
          height: "20px"
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          {/* Tags moved here */}
          {Array.isArray(task.tags) && task.tags.length > 0 && (
            <Box display="flex" alignItems="center" gap={0.5}>
              {task.tags.map((tag, index) => (
                <TagChip
                  key={`${task._id}-tag-${index}`}
                  icon={<LabelIcon />}
                  label={tag}
                  size="small"
                />
              ))}
            </Box>
          )}
          
          {task.dueDate && (
            <Tooltip title="Ngày hết hạn">
              <Box display="flex" alignItems="center" sx={{ 
                backgroundColor: "rgba(0,0,0,0.03)", 
                borderRadius: "10px", 
                padding: "2px 6px",
                fontSize: "0.65rem",
                height: "20px"
              }}>
                <CalendarTodayIcon 
                  fontSize="small" 
                  sx={{ 
                    fontSize: "0.75rem", 
                    mr: 0.3, 
                    color: "text.secondary" 
                  }} 
                />
                <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                  {formatDate(task.dueDate)}
                </Typography>
              </Box>
            </Tooltip>
          )}

          {/* Estimated time moved here */}
          {task.estimatedTime && (
            <Tooltip title="Thời gian ước tính">
              <Box display="flex" alignItems="center" sx={{ 
                backgroundColor: "rgba(0,0,0,0.03)", 
                borderRadius: "10px", 
                padding: "2px 6px",
                fontSize: "0.65rem",
                height: "20px"
              }}>
                <AccessTimeIcon 
                  fontSize="small" 
                  sx={{ 
                    fontSize: "0.75rem", 
                    mr: 0.3, 
                    color: "text.secondary" 
                  }} 
                />
                <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
                  {task.estimatedTime}h
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>
      
      <CardContent sx={{ 
        pt: 1,
        pb: 1,
        px: 2,
        position: "relative",
        "&:last-child": {
          pb: 1
        }
      }}>
        {/* Task header with title and chips in same row */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mt:4,
          mb: 1,
          gap: 1
        }}>
          <TaskTitle variant="h6" sx={{ flex: 1 }}>
            {task.title.length > 20 ? `${task.title.substring(0, 20)}...` : task.title}
          </TaskTitle>
          
          <Box display="flex" alignItems="center" gap={1}>
            {comments.length > 0 && (
              <Tooltip title={`${comments.length} bình luận`}>
                <Box 
                  display="flex" 
                  alignItems="center"
                  sx={{ 
                    opacity: 0.7,
                    backgroundColor: "rgba(25, 118, 210, 0.08)",
                    borderRadius: "12px",
                    padding: "2px 6px",
                  }}
                >
                  <CommentIcon sx={{ fontSize: '0.8rem', mr: 0.3 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                    {comments.length}
                  </Typography>
                </Box>
              </Tooltip>
            )}
            
            {attachments.length > 0 && (
              <Tooltip title={`${attachments.length} tệp đính kèm`}>
                <Box 
                  display="flex" 
                  alignItems="center"
                  sx={{ 
                    opacity: 0.7,
                    backgroundColor: "rgba(76, 175, 80, 0.08)", 
                    borderRadius: "12px",
                    padding: "2px 6px",
                  }}
                >
                  <AttachFileIcon sx={{ fontSize: '0.8rem', mr: 0.3 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                    {attachments.length}
                  </Typography>
                </Box>
              </Tooltip>
            )}

            <IconButton 
              size="small" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              sx={{ 
                padding: 0.5,
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                color: "text.secondary",
                ml: 0.5,
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.04)",
                  color: "text.primary"
                }
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        {/* Expanded card details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <CardContent sx={{ 
            pt: 2, 
            pb: 2,
            px: 3,
            mt: 1,
            backgroundColor: statusColorLight,
            backgroundImage: `linear-gradient(145deg, ${statusColorLight}, #ffffff)`,
            borderRadius: "12px",
            border: "1px solid rgba(0,0,0,0.08)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            position: "relative",
            "&::before": {
              content: '""',
              position: "absolute",
              top: "-8px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: `8px solid ${statusColorLight}`,
            },
            "&::after": {
              content: '""',
              position: "absolute",
              top: "-7px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: `8px solid ${statusColorLight}`,
            }
          }}
          onClick={(e) => {
            e.stopPropagation(); // Ngăn chặn sự kiện click lan truyền lên TaskCardContainer
          }}>

            {/* Task description */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Mô tả:
              </Typography>
              <TaskDescription variant="body2" color="text.secondary" sx={{ 
                WebkitLineClamp: 'unset',
                display: 'block'
              }}>
                {task.description || "Không có mô tả"}
              </TaskDescription>
            </Box>
            
            {/* Project info and assignees section */}
            <Box sx={{ mb: 2 }}>
              {/* Project info */}
              <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                <Box display="flex" alignItems="center" gap={1}>
                  {(project?.name || task.project?.name) && (
                    <Box display="flex" alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ 
                        fontSize: '0.75rem', 
                        display: 'flex', 
                        alignItems: 'center',
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        borderRadius: '10px',
                        py: 0.5,
                        px: 1,
                        width: 'fit-content'
                      }}>
                        <strong>Dự án:</strong> {project?.name || task.project?.name}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              
              {/* Assignees section */}
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="caption" sx={{ 
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: "text.secondary"
                }}>
                  <strong>Người thực hiện:</strong>
                </Typography>
                
                {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
                  <AvatarGroup 
                    max={3} 
                    sx={{ 
                      '& .MuiAvatar-root': { 
                        width: 24, 
                        height: 24, 
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
                          sx={{ width: 24, height: 24 }}
                        >
                          {((assignee?.name || assignee?.email || "?") || "?").charAt(0).toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                ) : (
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.75rem" }}>
                    Chưa có người thực hiện
                  </Typography>
                )}
              </Box>
            </Box>
            
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider', 
              mb: 2,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.85rem",
                minHeight: "40px",
                "&.Mui-selected": {
                  fontWeight: 600
                }
              }
            }}>
              <Tabs 
                value={expandedTab}
                onChange={handleTabChange}
                variant="fullWidth"
                textColor="primary"
                indicatorColor="primary"
                aria-label="task details tabs"
              >
                <Tab label="Bình luận" />
                <Tab label="Tệp đính kèm" />
                <Tab label="Lịch sử" />
              </Tabs>
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
      </CardContent>
    </TaskCardContainer>
  );
};

export default TaskCard;
