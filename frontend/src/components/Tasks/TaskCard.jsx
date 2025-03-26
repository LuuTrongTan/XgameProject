import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Box,
  IconButton,
  Tooltip,
  AvatarGroup,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Collapse,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import TaskComments from "./TaskComments";
import TaskAuditLog from "./TaskAuditLog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const priorityColors = {
  LOW: "#4caf50",
  MEDIUM: "#ff9800",
  HIGH: "#f44336",
  low: "#4caf50",
  medium: "#ff9800",
  high: "#f44336",
};

const priorityLabels = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const statusColors = {
  TODO: "#42a5f5",
  IN_PROGRESS: "#ff9800",
  REVIEWING: "#ab47bc",
  DONE: "#4caf50",
  todo: "#42a5f5",
  inProgress: "#ff9800",
  review: "#ab47bc",
  done: "#4caf50",
};

const statusLabels = {
  TODO: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  REVIEWING: "Đang kiểm tra",
  DONE: "Hoàn thành",
  todo: "Chưa bắt đầu",
  inProgress: "Đang thực hiện",
  review: "Đang kiểm tra",
  done: "Hoàn thành",
};

const TaskCard = ({
  task,
  container,
  onEdit,
  onDelete,
  onAddComment,
  onAddAttachment,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [detailView, setDetailView] = useState("comments");

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
      container,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "8px",
    boxShadow: isDragging
      ? "0 8px 16px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)"
      : "0 1px 3px rgba(0,0,0,0.1)",
    border: "1px solid #e9ecef",
    position: "relative",
    zIndex: isDragging ? 999 : 1,
    "&:hover": {
      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    },
  };

  if (!task) return null;

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddComment = () => {
    setOpenCommentDialog(true);
    handleMenuClose();
  };

  const handleAddAttachment = () => {
    setOpenAttachmentDialog(true);
    handleMenuClose();
  };

  const handleCommentSubmit = () => {
    if (onAddComment) {
      onAddComment(task._id, newComment);
      setNewComment("");
      setOpenCommentDialog(false);
    }
  };

  const handleAttachmentSubmit = () => {
    if (onAddAttachment && selectedFile) {
      onAddAttachment(task._id, selectedFile);
      setSelectedFile(null);
      setOpenAttachmentDialog(false);
    }
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(task);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    if (
      onDelete &&
      window.confirm("Bạn có chắc chắn muốn xóa công việc này?")
    ) {
      onDelete(task._id);
    }
    handleMenuClose();
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const getStatusColor = (status) => {
    return statusColors[status] || "#757575";
  };

  const getPriorityColor = (priority) => {
    return priorityColors[priority] || "#757575";
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        sx={{
          p: 1,
          mb: 1,
          position: "relative",
          "&:hover": {
            "& .edit-button": {
              opacity: 1,
            },
          },
        }}
      >
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Box
              {...attributes}
              {...listeners}
              display="flex"
              alignItems="center"
              flex={1}
              sx={{
                cursor: "grab",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.02)",
                },
                borderRadius: "4px",
                p: 1,
              }}
            >
              <Typography variant="h6" component="div">
                {task.title || task.name}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" sx={{ ml: 1 }}>
              <IconButton
                size="small"
                onClick={toggleExpand}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                  },
                }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton
                size="small"
                onClick={handleMenuClick}
                sx={{
                  cursor: "pointer",
                  color: isDragging ? "primary.main" : "text.secondary",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                  },
                }}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                sx={{ zIndex: 9999 }}
              >
                <MenuItem onClick={handleEditClick}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  Chỉnh sửa
                </MenuItem>
                <MenuItem onClick={handleAddComment}>
                  <CommentIcon fontSize="small" sx={{ mr: 1 }} />
                  Thêm bình luận
                </MenuItem>
                <MenuItem onClick={handleAddAttachment}>
                  <AttachFileIcon fontSize="small" sx={{ mr: 1 }} />
                  Thêm tệp đính kèm
                </MenuItem>
                <MenuItem
                  onClick={handleDeleteClick}
                  sx={{ color: "error.main" }}
                >
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  Xóa
                </MenuItem>
              </Menu>
            </Box>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.description}
          </Typography>

          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Chip
              size="small"
              label={statusLabels[task.status] || task.status}
              sx={{
                backgroundColor: `${getStatusColor(task.status)}20`,
                color: getStatusColor(task.status),
                fontWeight: 500,
              }}
            />
            <Chip
              size="small"
              label={priorityLabels[task.priority] || task.priority}
              sx={{
                backgroundColor: `${getPriorityColor(task.priority)}20`,
                color: getPriorityColor(task.priority),
                fontWeight: 500,
              }}
            />
            {task.syncWithCalendar && (
              <Tooltip title="Đã đồng bộ với lịch">
                <Chip
                  size="small"
                  icon={<CalendarIcon sx={{ fontSize: "1rem !important" }} />}
                  label={task.calendarType === "google" ? "Google" : "Outlook"}
                  sx={{
                    backgroundColor: "#e3f2fd",
                    color: "#2196f3",
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {task.tags?.length > 0 && (
            <Box display="flex" gap={0.5} mb={2} flexWrap="wrap">
              {task.tags.map((tag, idx) => (
                <Chip
                  key={idx}
                  size="small"
                  label={tag}
                  sx={{
                    backgroundColor: "#e0e0e0",
                    color: "text.secondary",
                    height: 20,
                    fontSize: "0.7rem",
                  }}
                />
              ))}
            </Box>
          )}

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center">
              <TimeIcon
                fontSize="small"
                sx={{ mr: 0.5, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                {task.dueDate &&
                  format(new Date(task.dueDate), "dd/MM/yyyy", {
                    locale: vi,
                  })}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              {task.comments?.length > 0 && (
                <Tooltip title={`${task.comments.length} bình luận`}>
                  <Box display="flex" alignItems="center">
                    <CommentIcon fontSize="small" color="action" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {task.comments.length}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
              {task.attachments?.length > 0 && (
                <Tooltip title={`${task.attachments.length} tệp đính kèm`}>
                  <Box display="flex" alignItems="center">
                    <AttachFileIcon fontSize="small" color="action" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      {task.attachments.length}
                    </Typography>
                  </Box>
                </Tooltip>
              )}
              {task.assignees && task.assignees.length > 0 && (
                <AvatarGroup
                  max={3}
                  sx={{
                    "& .MuiAvatar-root": {
                      width: 24,
                      height: 24,
                      fontSize: "0.75rem",
                    },
                  }}
                >
                  {task.assignees.map((assignee) => (
                    <Tooltip key={assignee._id} title={assignee.fullName}>
                      <Avatar alt={assignee.fullName} src={assignee.avatar} />
                    </Tooltip>
                  ))}
                </AvatarGroup>
              )}
            </Box>
          </Box>

          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #eee" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <Button
                  size="small"
                  variant={detailView === "comments" ? "contained" : "text"}
                  startIcon={<CommentIcon />}
                  onClick={() => setDetailView("comments")}
                  sx={{ mr: 1 }}
                >
                  Bình luận
                </Button>
                <Button
                  size="small"
                  variant={detailView === "attachments" ? "contained" : "text"}
                  startIcon={<AttachFileIcon />}
                  onClick={() => setDetailView("attachments")}
                  sx={{ mr: 1 }}
                >
                  Tệp đính kèm
                </Button>
                <Button
                  size="small"
                  variant={detailView === "history" ? "contained" : "text"}
                  startIcon={<HistoryIcon />}
                  onClick={() => setDetailView("history")}
                >
                  Lịch sử
                </Button>
              </Box>

              {detailView === "comments" && <TaskComments taskId={task._id} />}

              {detailView === "history" && <TaskAuditLog taskId={task._id} />}

              {detailView === "attachments" && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Tệp đính kèm
                  </Typography>
                  {task.attachments && task.attachments.length > 0 ? (
                    <List dense>
                      {task.attachments.map((attachment, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            border: "1px solid #eee",
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar>
                              <AttachFileIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={attachment.name}
                            secondary={`${(attachment.size / 1024).toFixed(
                              2
                            )} KB • ${attachment.type}`}
                          />
                          <Tooltip title="Tải xuống">
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => {
                                window.open(attachment.path, "_blank");
                              }}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                    >
                      Chưa có tệp đính kèm
                    </Typography>
                  )}
                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AttachFileIcon />}
                      onClick={handleAddAttachment}
                    >
                      Thêm tệp đính kèm
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Dialog thêm bình luận */}
      <Dialog
        open={openCommentDialog}
        onClose={() => setOpenCommentDialog(false)}
      >
        <DialogTitle>Thêm bình luận</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nội dung bình luận"
            fullWidth
            multiline
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCommentDialog(false)}>Hủy</Button>
          <Button
            onClick={handleCommentSubmit}
            variant="contained"
            disabled={!newComment.trim()}
          >
            Gửi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm tệp đính kèm */}
      <Dialog
        open={openAttachmentDialog}
        onClose={() => setOpenAttachmentDialog(false)}
      >
        <DialogTitle>Thêm tệp đính kèm</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" component="label">
              Chọn tệp
              <input type="file" hidden onChange={handleFileChange} />
            </Button>
            {selectedFile && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Tệp đã chọn:</Typography>
                <Paper sx={{ p: 1, mt: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <AttachFileIcon sx={{ mr: 1 }} />
                    <Typography variant="body2">
                      {selectedFile.name} (
                      {(selectedFile.size / 1024).toFixed(2)} KB)
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAttachmentDialog(false)}>Hủy</Button>
          <Button
            onClick={handleAttachmentSubmit}
            variant="contained"
            disabled={!selectedFile}
          >
            Tải lên
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;
