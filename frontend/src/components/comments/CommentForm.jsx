import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import api from "../../utils/api";
import ActivityService from "../../services/activityService";

const CommentForm = ({ comment, taskId, projectId, onSubmit, onCancel }) => {
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

  if (comment && !isEditing) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Typography variant="body1">{content}</Typography>
          <Box>
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
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
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
        />
        <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
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
