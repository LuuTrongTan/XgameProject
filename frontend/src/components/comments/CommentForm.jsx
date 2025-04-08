import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  Avatar,
  Stack,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from "../../api/api";
import ActivityService from "../../services/activityService";

const CommentForm = ({ comment, taskId, projectId, onSubmit, onCancel, isCurrentUser }) => {
  const [content, setContent] = useState(comment?.content || "");
  const [isEditing, setIsEditing] = useState(!comment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Nội dung bình luận không được để trống");
      return;
    }

    setLoading(true);
    try {
      if (comment?._id) {
        await api.put(
          `/projects/${projectId}/tasks/${taskId}/comments/${comment._id}`,
          {
            content,
          }
        );
        await ActivityService.logCommentUpdated(content);
      } else {
        await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, {
          content,
        });
        await ActivityService.logCommentCreated(content);
      }
      onSubmit();
      if (comment) {
        setIsEditing(false);
      } else {
        setContent("");
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      setError("Có lỗi xảy ra khi lưu bình luận");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
      setLoading(true);
      try {
        await api.delete(
          `/projects/${projectId}/tasks/${taskId}/comments/${comment._id}`
        );
        await ActivityService.logCommentDeleted(content);
        onSubmit();
      } catch (error) {
        console.error("Error deleting comment:", error);
        setError("Có lỗi xảy ra khi xóa bình luận");
      } finally {
        setLoading(false);
      }
    }
  };

  // Format the timestamp
  const formatDate = (dateString) => {
    if (!dateString) return "Không có thông tin";
    try {
      return format(new Date(dateString), 'HH:mm - dd/MM/yyyy', { locale: vi });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Không có thông tin";
    }
  };

  if (comment && !isEditing) {
    // Nếu là bình luận của người dùng hiện tại, hiển thị căn phải
    const isCurrentUserComment = isCurrentUser || (comment.user && comment.user.isCurrentUser);
    
    return (
      <Paper 
        sx={{ 
          p: 2, 
          mb: 2, 
          borderRadius: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          ml: isCurrentUserComment ? 'auto' : 0,
          mr: isCurrentUserComment ? 0 : 'auto',
          maxWidth: '85%',
          bgcolor: isCurrentUserComment ? 'primary.lighter' : 'background.paper',
        }}
      >
        {/* Comment header with user info */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          mb: 2,
          flexDirection: isCurrentUserComment ? 'row-reverse' : 'row' 
        }}>
          <Avatar 
            src={comment?.author?.avatar || comment?.user?.avatar} 
            alt={comment?.author?.name || comment?.user?.name || 'User'}
            sx={{ 
              width: 40, 
              height: 40, 
              ml: isCurrentUserComment ? 2 : 0,
              mr: isCurrentUserComment ? 0 : 2,
              bgcolor: isCurrentUserComment ? 'secondary.main' : 'primary.main',
              fontSize: '1rem',
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
            }}
          >
            {(comment?.author?.name || comment?.user?.name || 'U').charAt(0).toUpperCase()}
          </Avatar>
          
          <Box sx={{ 
            flexGrow: 1,
            textAlign: isCurrentUserComment ? 'right' : 'left'
          }}>
            <Typography variant="subtitle1" fontWeight="600" color="text.primary">
              {comment?.author?.name || comment?.user?.name || 'Người dùng'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(comment?.createdAt || comment?.timestamp)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            order: isCurrentUserComment ? -1 : 1,
            ml: isCurrentUserComment ? 0 : 'auto',
            mr: isCurrentUserComment ? 'auto' : 0
          }}>
            <IconButton
              size="small"
              onClick={() => setIsEditing(true)}
              title="Chỉnh sửa"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              title="Xóa"
              disabled={loading}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Comment content */}
        <Typography 
          variant="body1" 
          sx={{ 
            whiteSpace: 'pre-wrap', 
            pt: 1,
            textAlign: isCurrentUserComment ? 'right' : 'left'
          }}
        >
          {content}
        </Typography>
        
        {/* Show edited indicator if comment was updated */}
        {comment?.updatedAt && comment.updatedAt !== comment.createdAt && (
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              display: 'block', 
              mt: 1, 
              fontStyle: 'italic',
              textAlign: isCurrentUserComment ? 'right' : 'left'
            }}
          >
            Đã chỉnh sửa {formatDate(comment.updatedAt)}
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập bình luận của bạn..."
          error={!!error}
          helperText={error}
          disabled={loading}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px'
            }
          }}
        />
        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            {loading ? "Đang lưu..." : comment ? "Cập nhật" : "Gửi bình luận"}
          </Button>
          {comment && (
            <Button
              variant="outlined"
              onClick={() => {
                setIsEditing(false);
                setContent(comment.content);
                setError("");
                if (onCancel) onCancel();
              }}
              disabled={loading}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              Hủy
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default CommentForm;
