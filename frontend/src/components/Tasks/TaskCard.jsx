import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  History as HistoryIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
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

const TaskCard = ({ task, projectId, sprintId, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const { canDeleteTask } = usePermissions();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddComment, setShowAddComment] = useState(false);
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateTaskStatus(projectId, sprintId, task._id, newStatus);
      onUpdate({ ...task, status: newStatus });
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTask(projectId, sprintId, task._id);
      onDelete(task._id);
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleAssign = async (assigneeId) => {
    try {
      await assignTask(projectId, sprintId, task._id, assigneeId);
      onUpdate({ ...task, assignee: assigneeId });
    } catch (error) {
      console.error("Error assigning task:", error);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      const response = await addTaskAttachment(projectId, sprintId, task._id, file);
      setAttachments([...attachments, response]);
    } catch (error) {
      console.error("Error uploading attachment:", error);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteTaskAttachment(projectId, sprintId, task._id, attachmentId);
      setAttachments(attachments.filter((att) => att._id !== attachmentId));
    } catch (error) {
      console.error("Error deleting attachment:", error);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {task.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {task.description}
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Chip
                label={task.status}
                color={
                  task.status === "completed"
                    ? "success"
                    : task.status === "in_progress"
                    ? "primary"
                    : "default"
                }
                size="small"
              />
              {task.priority && (
                <Chip
                  label={task.priority}
                  color={
                    task.priority === "high"
                      ? "error"
                      : task.priority === "medium"
                      ? "warning"
                      : "default"
                  }
                  size="small"
                />
              )}
            </Box>
          </Box>
          <Box>
            <IconButton onClick={handleExpandClick}>
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </IconButton>
            {canDeleteTask && (
              <IconButton onClick={handleDelete}>
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent>
          <Box display="flex" gap={2} mb={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Ngày tạo
              </Typography>
              <DateTimeDisplay date={task.createdAt} />
            </Box>
            {task.dueDate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Hạn hoàn thành
                </Typography>
                <DateTimeDisplay date={task.dueDate} format="dd/MM/yyyy" />
              </Box>
            )}
            {task.estimatedHours && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Thời gian ước tính
                </Typography>
                <Typography variant="body2">{task.estimatedHours} giờ</Typography>
              </Box>
            )}
          </Box>

          <Box display="flex" gap={1} mb={2}>
            <Button
              size="small"
              startIcon={<CommentIcon />}
              onClick={() => setShowComments(!showComments)}
            >
              Bình luận
            </Button>
            <Button
              size="small"
              startIcon={<AttachFileIcon />}
              onClick={() => setShowAttachments(!showAttachments)}
            >
              Tệp đính kèm
            </Button>
            <Button
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => setShowHistory(!showHistory)}
            >
              Lịch sử
            </Button>
          </Box>

          {showComments && (
            <Box mb={2}>
              <TaskComments taskId={task._id} projectId={projectId} sprintId={sprintId} />
            </Box>
          )}

          {showAttachments && (
            <Box mb={2}>
              <List>
                {attachments.map((attachment) => (
                  <ListItem key={attachment._id}>
                    <ListItemIcon>
                      <AttachFileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={attachment.fileName}
                      secondary={
                        <DateTimeDisplay date={attachment.uploadedAt} />
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteAttachment(attachment._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
              <Button
                startIcon={<CloudUploadIcon />}
                onClick={() => setShowAddAttachment(true)}
              >
                Thêm tệp đính kèm
              </Button>
            </Box>
          )}

          {showHistory && (
            <Box>
              <TaskAuditLog taskId={task._id} projectId={projectId} sprintId={sprintId} />
            </Box>
          )}
        </CardContent>
      </Collapse>

      <Dialog open={showAddAttachment} onClose={() => setShowAddAttachment(false)}>
        <DialogTitle>Thêm tệp đính kèm</DialogTitle>
        <DialogContent>
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            style={{ display: "none" }}
            id="attachment-input"
          />
          <label htmlFor="attachment-input">
            <Button
              component="span"
              startIcon={<CloudUploadIcon />}
              variant="outlined"
            >
              Chọn tệp
            </Button>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {selectedFile.name}
              </Typography>
            )}
          </label>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddAttachment(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => handleFileUpload(selectedFile)}
            disabled={!selectedFile}
          >
            Tải lên
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TaskCard;
