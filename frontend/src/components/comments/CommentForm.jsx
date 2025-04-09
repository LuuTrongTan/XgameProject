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
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from "../../api/api";
import ActivityService from "../../services/activityService";

const CommentForm = ({ comment, taskId, projectId, onSubmit, onCancel, isCurrentUser, userRole, userId, sprintId }) => {
  const [content, setContent] = useState(comment?.content || "");
  const [isEditing, setIsEditing] = useState(!comment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Kiểm tra quyền chỉnh sửa/xóa comment
  const canModifyComment = () => {
    // Là tác giả của comment
    const isAuthor = comment?.author?._id === userId || comment?.user?._id === userId;
    // Là project manager hoặc admin
    const hasAdminRights = userRole === 'admin' || userRole === 'project_manager';
    
    return isAuthor || hasAdminRights;
  };

  const handleMenuClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    handleMenuClose();
    setIsEditing(true);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    handleDelete();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Nội dung bình luận không được để trống");
      return;
    }

    setLoading(true);
    try {
      console.log('[DEBUG] Comment content before sending:', content);
      
      // Không gọi API trực tiếp, chỉ gọi onSubmit callback để component cha xử lý
      onSubmit(content.trim());
      
      if (comment) {
        setIsEditing(false);
      } else {
        setContent("");
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      setError("Có lỗi xảy ra khi lưu bình luận");
      setLoading(false);
      return;
    }
    setLoading(false);
    setError("");
  };

  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) {
      setLoading(true);
      try {
        await api.delete(
          `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments/${comment._id}`
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
      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: isCurrentUserComment ? 'flex-end' : 'flex-start',
          mb: 2,
          maxWidth: '100%',
        }}
      >
        <Paper 
          sx={{ 
            p: 2,
            maxWidth: '70%',
            borderRadius: isCurrentUserComment ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
            bgcolor: isCurrentUserComment ? 'primary.lighter' : 'grey.50',
            boxShadow: 'none',
            border: '1px solid',
            borderColor: isCurrentUserComment ? 'primary.light' : 'grey.200',
            position: 'relative',
          }}
        >
          {/* Comment content first */}
          <Typography 
            variant="body2" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              color: isCurrentUserComment ? 'primary.dark' : 'text.primary',
              lineHeight: 1.5,
              mb: 2
            }}
          >
            {content}
          </Typography>

          {/* Show edited indicator if comment was updated */}
          {comment?.updatedAt && comment.updatedAt !== comment.createdAt && (
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                fontStyle: 'italic',
                color: isCurrentUserComment ? 'primary.dark' : 'text.secondary',
                opacity: 0.7,
                textAlign: isCurrentUserComment ? 'right' : 'left',
                mb: 1,
                fontSize: '0.75rem'
              }}
            >
              Đã chỉnh sửa {formatDate(comment.updatedAt)}
            </Typography>
          )}

          <Divider sx={{ mb: 1.5 }} />

          {/* Comment header with user info at bottom */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            flexDirection: isCurrentUserComment ? 'row-reverse' : 'row',
          }}>
            <Avatar 
              src={comment?.author?.avatar || comment?.user?.avatar} 
              alt={comment?.author?.name || comment?.user?.name || 'User'}
              sx={{ 
                width: 28, 
                height: 28,
                bgcolor: isCurrentUserComment ? 'primary.main' : 'secondary.main',
                fontSize: '0.875rem',
                border: '2px solid white',
                boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
              }}
            >
              {(comment?.author?.name || comment?.user?.name || 'U').charAt(0).toUpperCase()}
            </Avatar>
            
            <Box sx={{ 
              flexGrow: 1,
              textAlign: isCurrentUserComment ? 'right' : 'left',
              display: 'flex',
              alignItems: 'baseline',
              gap: 1,
              flexDirection: isCurrentUserComment ? 'row-reverse' : 'row'
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  color: isCurrentUserComment ? 'primary.dark' : 'text.primary',
                  fontSize: '0.875rem'
                }}
              >
                {comment?.author?.name || comment?.user?.name || 'Người dùng'}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isCurrentUserComment ? 'primary.dark' : 'text.secondary',
                  opacity: 0.8,
                  fontSize: '0.75rem'
                }}
              >
                {formatDate(comment?.createdAt || comment?.timestamp)}
              </Typography>
            </Box>
          </Box>

          {/* Action buttons */}
          {canModifyComment() && (
            <Box 
              sx={{ 
                position: 'absolute',
                top: 8,
                right: 8,
                opacity: 0,
                transition: 'opacity 0.2s',
                '.MuiPaper-root:hover &': {
                  opacity: 1
                },
                zIndex: 1400
              }}
            >
              <IconButton
                size="small"
                onClick={handleMenuClick}
                aria-label="more"
                aria-controls={open ? 'comment-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
                sx={{ 
                  bgcolor: 'transparent',
                  boxShadow: 'none',
                  width: 24,
                  height: 24,
                  '&:hover': {
                    bgcolor: isCurrentUserComment ? 'primary.main' : 'grey.200'
                  },
                  '&.Mui-focusVisible': {
                    bgcolor: isCurrentUserComment ? 'primary.main' : 'grey.200'
                  }
                }}
              >
                <MoreVertIcon sx={{ 
                  fontSize: 16,
                  color: isCurrentUserComment ? 'primary.dark' : 'text.secondary'
                }} />
              </IconButton>
              <Menu
                id="comment-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleMenuClose}
                onClick={(e) => e.stopPropagation()}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    sx: {
                      zIndex: 1500,
                      mt: 0.5,
                      boxShadow: '0px 2px 8px rgba(0,0,0,0.15)'
                    }
                  }
                }}
                MenuListProps={{
                  dense: true,
                  sx: { py: 0.5 }
                }}
              >
                <MenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick();
                  }}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Chỉnh sửa</ListItemText>
                </MenuItem>
                <MenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick();
                  }}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Xóa</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Paper 
      sx={{ 
        p: 2.5, 
        mb: 2, 
        borderRadius: '12px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
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
              borderRadius: '12px',
              backgroundColor: 'grey.50',
              '&:hover': {
                backgroundColor: 'grey.100',
              },
              '&.Mui-focused': {
                backgroundColor: 'background.paper',
              }
            }
          }}
        />
        <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: 'flex-end' }}>
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
              sx={{ 
                textTransform: 'none', 
                borderRadius: '10px',
                px: 3
              }}
            >
              Hủy
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ 
              textTransform: 'none', 
              borderRadius: '10px',
              px: 3,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: 'none',
                bgcolor: 'primary.dark'
              }
            }}
          >
            {loading ? "Đang lưu..." : comment ? "Cập nhật" : "Gửi bình luận"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CommentForm;

