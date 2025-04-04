import React, { useState, useEffect, useRef } from "react";
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
  CircularProgress,
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
import { useSnackbar } from "notistack";
import {
  getTaskComments,
  addTaskComment,
  deleteTaskComment,
  updateTaskComment,
} from "../../api/taskApi";

// Thêm cờ hiệu để xác định xem có nên sử dụng socket không
const USE_WEBSOCKET = false; // Tắt tạm thời socket để tránh lỗi

// Import socket chỉ khi USE_WEBSOCKET = true
let socket = null;
if (USE_WEBSOCKET) {
  try {
    // Động import socket
    const socketModule = await import("../../socket");
    socket = socketModule.socket;
  } catch (error) {
    console.error("Error importing socket:", error);
  }
}

// Mock socket an toàn để sử dụng khi socket.io không khả dụng
const mockSocket = {
  on: () => {},
  off: () => {},
  emit: () => {},
  id: null,
  connected: false
};

const TaskComments = ({ taskId, projectId, sprintId }) => {
  const { user } = useAuth();
  const { canDeleteTask } = usePermissions();
  const { enqueueSnackbar } = useSnackbar();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const commentInputRef = useRef(null);
  
  // Lắng nghe sự kiện comment mới từ WebSocket nếu được bật
  useEffect(() => {
    // Bỏ qua nếu không sử dụng socket hoặc taskId không hợp lệ
    if (!USE_WEBSOCKET || !taskId) return;
    
    // Khi nhận comment mới qua socket
    const handleNewComment = (data) => {
      try {
        if (data && data.taskId === taskId) {
          // Thêm comment mới vào state nếu chưa tồn tại
          setComments(prevComments => {
            // Kiểm tra xem comment đã tồn tại chưa
            const exists = prevComments.some(comment => comment._id === data.comment._id);
            if (!exists) {
              return [...prevComments, data.comment];
            }
            return prevComments;
          });
        }
      } catch (error) {
        console.error("Error handling new comment:", error);
      }
    };

    try {
      // Sử dụng socket thực hoặc mock socket
      const socketInstance = socket || mockSocket;
      // Lắng nghe sự kiện từ socket
      socketInstance.on("new_comment", handleNewComment);
      
      // Cleanup function
      return () => {
        socketInstance.off("new_comment", handleNewComment);
      };
    } catch (error) {
      console.error("Error setting up socket listener:", error);
      return () => {}; // Return empty cleanup function
    }
  }, [taskId]);

  // Fetch comments khi component mount hoặc taskId thay đổi
  useEffect(() => {
    if (taskId && projectId && sprintId) {
      fetchComments();
    }
  }, [taskId, projectId, sprintId]);

  const fetchComments = async () => {
    if (!taskId || !projectId || !sprintId) return;
    
    setIsLoading(true);
    try {
      const response = await getTaskComments(projectId, sprintId, taskId);
      if (response && response.data) {
        setComments(response.data || []);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      enqueueSnackbar("Không thể tải bình luận", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newComment.trim() || isSending) return;

    setIsSending(true);
    try {
      const result = await addTaskComment(projectId, sprintId, taskId, newComment);
      
      if (result && result.success) {
        // Xóa comment sau khi gửi thành công
        setNewComment("");
        
        // Thêm comment mới vào danh sách hiện tại nếu không dùng socket
        if (!USE_WEBSOCKET && result.data) {
          setComments(prev => [...prev, result.data]);
        }
        
        // Focus lại vào input sau khi gửi
        if (commentInputRef.current) {
          commentInputRef.current.focus();
        }
      } else {
        enqueueSnackbar(result?.message || "Không thể gửi bình luận", { variant: "error" });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      enqueueSnackbar("Không thể gửi bình luận", { variant: "error" });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Gửi comment khi nhấn Ctrl+Enter hoặc Command+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteTaskComment(projectId, sprintId, taskId, commentId);
      setComments(comments.filter((comment) => comment._id !== commentId));
      enqueueSnackbar("Đã xóa bình luận", { variant: "success" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      enqueueSnackbar("Không thể xóa bình luận", { variant: "error" });
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
      if (response && response.data) {
        setComments(
          comments.map((comment) =>
            comment._id === editingComment._id ? response.data : comment
          )
        );
        setEditingComment(null);
        setEditText("");
        enqueueSnackbar("Đã cập nhật bình luận", { variant: "success" });
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      enqueueSnackbar("Không thể cập nhật bình luận", { variant: "error" });
    }
  };

  return (
    <Box>
      {isLoading ? (
        <Box display="flex" justifyContent="center" my={3}>
          <CircularProgress size={30} />
        </Box>
      ) : comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" my={3}>
          Chưa có bình luận nào
        </Typography>
      ) : (
        <List>
          {comments.map((comment) => (
            <React.Fragment key={comment._id}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar alt={comment.user?.fullName || comment.user?.name} src={comment.user?.avatar} />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2">
                        {comment.user?.fullName || comment.user?.name || "Người dùng"}
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
                {user && comment.user && comment.user._id === user._id && (
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
      )}

      <Box component="form" onSubmit={handleSubmit} display="flex" gap={1} mt={2}>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Thêm bình luận... (Ctrl+Enter để gửi nhanh)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          variant="outlined"
          size="small"
          inputRef={commentInputRef}
          disabled={isSending}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSending}
          sx={{ alignSelf: "flex-end", minWidth: 'auto', padding: '8px' }}
        >
          {isSending ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </Button>
      </Box>
    </Box>
  );
};

export default TaskComments;