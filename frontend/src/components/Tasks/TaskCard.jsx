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
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  transition: "all 0.2s ease-in-out",
  position: "relative",
  "&:hover": {
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    transform: "translateY(-2px)",
  }
}));

const DragHandle = styled(Box)(({ theme, isDragging }) => ({
  display: "flex",
  alignItems: "center",
  cursor: isDragging ? "grabbing" : "grab",
  color: theme.palette.text.secondary,
  width: "100%",
  padding: "10px 12px",
  borderTopLeftRadius: "12px",
  borderTopRightRadius: "12px",
  backgroundColor: isDragging ? theme.palette.primary.light + '10' : 'transparent',
  borderBottom: `1px solid ${theme.palette.grey[200]}`,
  transition: "all 0.2s ease",
  "&:hover": {
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.grey[50],
  },
  "&:active": {
    cursor: "grabbing",
    backgroundColor: theme.palette.primary.light + '20',
  }
}));

const PriorityIndicator = styled(Box)(({ priority, theme }) => ({
  position: "absolute",
  top: 0,
  right: 0,
  width: "80px",
  height: "40px",
  borderRadius: "0 12px 0 25px",
  backgroundColor: 
    priority === "high" ? theme.palette.error.main :
    priority === "medium" ? theme.palette.warning.main : 
    theme.palette.success.main,
  zIndex: 10,
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
}));

const TaskTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "0.95rem",
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task._id,
    data: { task, index, container }
  });

  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1
  };
  
  // Chi tiết button click handler
  const handleDetailClick = (e) => {
    // Ensure the event doesn't trigger card behavior
    e.stopPropagation();
    
    // Call onEdit directly
    if (typeof onEdit === 'function') {
      onEdit(task);
    }
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
      
      // Load comments when first expanded
      fetchComments();
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setExpandedTab(newValue);
    
    // Tải dữ liệu tương ứng với tab
    if (newValue === 0 && comments.length === 0) {
      fetchComments();
    } else if (newValue === 1 && attachments.length === 0) {
      fetchAttachments();
    } else if (newValue === 2 && history.length === 0) {
      fetchHistory();
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const result = await getTaskComments(task._id);
      if (result.success) {
        setComments(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };
  
  const fetchAttachments = async () => {
    try {
      setLoadingAttachments(true);
      const result = await getTaskAttachments(task._id);
      if (result.success) {
        setAttachments(result.data || []);
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
      const result = await getTaskAuditLogs(task._id);
      if (result.success) {
        setHistory(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const handleSendComment = async () => {
    if (!newComment.trim() || !task._id) return;
    
    try {
      const result = await addTaskComment(task._id, newComment);
      if (result.success) {
        setComments([...comments, result.data]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Error sending comment:", error);
    }
  };
  
  const handleFileUpload = async (event) => {
    if (!event.target.files || !event.target.files[0] || !task._id) return;
    
    const file = event.target.files[0];
    try {
      const result = await addTaskAttachment(task._id, file);
      if (result.success) {
        setAttachments([...attachments, result.data]);
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
  const statusColor = getStatusColor(task.status);

  return (
    <TaskCardContainer
        ref={setNodeRef}
      style={cardStyle}
    >
      <CardContent sx={{ p: 0 }}>
        {/* Drag handle header */}
        <DragHandle 
          isDragging={isDragging} 
        {...attributes}
        {...listeners}
      >
          <DragIndicatorIcon 
            sx={{ 
              fontSize: '1.3rem', 
              mr: 1.5,
              color: isDragging ? 'primary.main' : 'inherit',
              animation: isDragging ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 0.6 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.6 }
              }
            }} 
          />
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'bold', 
              flexGrow: 1,
              wordBreak: 'break-word',
              color: isDragging ? 'primary.main' : 'text.primary',
            }}
          >
            {task.title}
          </Typography>
        </DragHandle>
        
        {/* Priority indicator */}
        <Tooltip 
          title={`Mức độ: ${getPriorityLabel(task.priority)}`} 
          arrow 
          placement="top-start"
          enterDelay={400}
          enterNextDelay={400}
        >
          <PriorityIndicator priority={task.priority} />
        </Tooltip>
        
        {/* Task content */}
        <Box 
          sx={{
            px: 2, 
            pt: 2, 
            pb: 2, 
            position: 'relative',
          }}
        >
          {/* Task description */}
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              my: 1,
            }}
          >
            {task.description ? task.description.substring(0, 100) + (task.description.length > 100 ? '...' : '') : 'No description'}
          </Typography>
          
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <Box
              display="flex"
              flexWrap="wrap" 
              gap={0.5} 
              mb={1.5}
            >
              {task.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  icon={<LabelIcon />}
                  sx={{
                    borderRadius: "4px",
                    height: "22px",
                    fontSize: "0.7rem",
                    backgroundColor: "#f0f4f7",
                    "& .MuiChip-icon": {
                      fontSize: "0.75rem",
                    },
                  }}
                />
              ))}
            </Box>
          )}
          
          {/* Action buttons */}
          {actionButtons && (
            <Box 
              sx={{
                position: "absolute", 
                top: 8, 
                right: 8, 
                zIndex: 50,
              }}
            >
              {actionButtons}
            </Box>
          )}
          
          {/* Task metadata */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
            }}
          >
            {/* User assigned to task */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {task.assignedTo ? (
                <Tooltip title={task.assignedTo.name || task.assignedTo.username || "Người dùng"}>
                  <Avatar
                    src={task.assignedTo.avatar}
                    alt={task.assignedTo.name || task.assignedTo.username}
                    sx={{ width: 24, height: 24 }}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Chưa phân công">
                  <Avatar
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      fontSize: '0.8rem',
                      bgcolor: 'grey.300',
                      color: 'grey.700'
                    }}
                  >
                    <PersonOffIcon sx={{ fontSize: '0.9rem' }} />
                  </Avatar>
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {/* Due date with days remaining */}
          {task.dueDate && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mt: 1,
                mb: 1,
                color: "text.secondary",
                fontSize: "0.75rem",
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: "0.8rem", mr: 0.5 }} />
              {formatDate(task.dueDate)}
              <Box
                component="span"
                sx={{
                  ml: 1,
                  color: new Date(task.dueDate) < new Date() ? "error.main" : "inherit",
                  fontWeight: "medium",
                }}
              >
                ({getDaysRemaining(task.dueDate)})
              </Box>
            </Box>
          )}
          
          {/* Bottom actions */}
          <Box 
            sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
            }}
          >
            {/* Project name at the bottom left */}
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.7rem",
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
                  borderRadius: "4px",
                  textTransform: "none",
                  fontSize: "0.7rem",
                  py: 0.5,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
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
                    {comments.length === 0 ? (
                      <Box display="flex" justifyContent="center" my={1}>
                        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                          Chưa có bình luận nào.
                    </Typography>
                      </Box>
                    ) : (
                      comments.map((comment, index) => (
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
                    {attachments.length === 0 ? (
                      <Box display="flex" justifyContent="center" my={1}>
                        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                          Chưa có tệp đính kèm nào.
                        </Typography>
                      </Box>
                    ) : (
                      attachments.map((attachment, index) => (
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
                      id={`task-file-upload-${task._id}`}
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <label htmlFor={`task-file-upload-${task._id}`}>
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
                  {history.length === 0 ? (
                    <Box display="flex" justifyContent="center" my={1}>
                      <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                        Chưa có lịch sử thay đổi nào.
                      </Typography>
                    </Box>
                  ) : (
                    history.map((historyItem, index) => (
                      <ListItem
                        key={historyItem._id || `history-${index}`}
                        alignItems="flex-start"
                        sx={{ 
                          py: 0.5,
                          px: 0,
                          borderBottom: index < history.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar 
                            src={historyItem.user?.avatar}
                            sx={{ width: 24, height: 24 }}
                          >
                            {(historyItem.user?.name || "?").charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle2" component="span" fontSize="0.75rem">
                                {historyItem.user?.name || "Người dùng"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                                {historyItem.timestamp ? format(new Date(historyItem.timestamp), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                    </Typography>
                  </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, fontSize: '0.75rem' }}>
                              {historyItem.field ? (
                                <>
                                  Đã thay đổi <strong>{historyItem.field}</strong> từ "<em>{historyItem.oldValue}</em>" thành "<em>{historyItem.newValue}</em>"
                                </>
                              ) : (
                                historyItem.action || "Đã thực hiện thay đổi"
                              )}
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
