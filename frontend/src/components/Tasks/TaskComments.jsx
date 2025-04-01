import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskComment,
} from "../../api/taskApi";

const TaskComments = ({ taskId, projectId, sprintId }) => {
  const { user } = useAuth();
  const { canDeleteTask } = usePermissions();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    fetchComments();
  }, [taskId, projectId, sprintId]);

  const fetchComments = async () => {
    try {
      const response = await getTaskComments(projectId, sprintId, taskId);
      setComments(response);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await addTaskComment(projectId, sprintId, taskId, newComment);
      setComments([...comments, response]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteTaskComment(projectId, sprintId, taskId, commentId);
      setComments(comments.filter((comment) => comment._id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleEdit = async (comment) => {
    setEditingComment(comment);
    setEditText(comment.content);
  };

  const handleUpdate = async () => {
    if (!editText.trim()) return;

    try {
      const response = await updateTaskComment(
        projectId,
        sprintId,
        taskId,
        editingComment._id,
        editText
      );
      setComments(
        comments.map((comment) =>
          comment._id === editingComment._id ? response : comment
        )
      );
      setEditingComment(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  return (
    <Box>
      <List>
        {comments.map((comment) => (
          <React.Fragment key={comment._id}>
            <ListItem alignItems="flex-start">
              <ListItemAvatar>
                <Avatar alt={comment.user.fullName} src={comment.user.avatar} />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">
                      {comment.user.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: vi,
                      })}
                    </Typography>
                  </Box>
                }
                secondary={
                  editingComment?._id === comment._id ? (
                    <Box mt={1}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        variant="outlined"
                        size="small"
                      />
                      <Box display="flex" justifyContent="flex-end" gap={1} mt={1}>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingComment(null);
                            setEditText("");
                          }}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleUpdate}
                          disabled={!editText.trim()}
                        >
                          Cập nhật
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                    >
                      {comment.content}
                    </Typography>
                  )
                }
              />
              {comment.user._id === user._id && (
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(comment)}
                    sx={{ mr: 0.5 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(comment._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </ListItem>
            <Divider variant="inset" component="li" />
          </React.Fragment>
        ))}
      </List>

      <Box display="flex" gap={1} mt={2}>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Thêm bình luận..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          variant="outlined"
          size="small"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          sx={{ alignSelf: "flex-end" }}
        >
          <SendIcon />
        </Button>
      </Box>
    </Box>
  );
};

export default TaskComments;
