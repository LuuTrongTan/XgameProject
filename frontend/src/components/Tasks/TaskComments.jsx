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
  Paper,
  Divider,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Send as SendIcon,
  MoreVert as MoreVertIcon,
  DeleteOutline as DeleteIcon,
  Edit as EditIcon,
  PersonAdd as MentionIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import API from "../../api/api";

const TaskComments = ({ taskId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [mentionMenuAnchor, setMentionMenuAnchor] = useState(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [cursorPosition, setCursorPosition] = useState(0);

  useEffect(() => {
    fetchComments();
    fetchUsers();
  }, [taskId]);

  useEffect(() => {
    if (mentionQuery) {
      const filtered = users.filter(
        (user) =>
          user.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [mentionQuery, users]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/tasks/${taskId}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await API.get("/users");
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setLoading(true);

      // Trích xuất mentions từ nội dung
      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions = [];
      let match;

      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[2]); // Lấy userId
      }

      const response = await API.post(`/tasks/${taskId}/comments`, {
        content: newComment,
        mentions: mentions,
      });

      // Cập nhật danh sách bình luận
      setComments((prevComments) => [...prevComments, response.data]);
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await API.delete(`/comments/${commentId}`);
      setComments((prevComments) =>
        prevComments.filter((comment) => comment._id !== commentId)
      );
      handleCloseMenu();
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleEditComment = async () => {
    if (!editText.trim() || !editingCommentId) return;

    try {
      const response = await API.put(`/comments/${editingCommentId}`, {
        content: editText,
      });

      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment._id === editingCommentId ? response.data : comment
        )
      );

      setEditingCommentId(null);
      setEditText("");
      handleCloseMenu();
    } catch (error) {
      console.error("Error updating comment:", error);
    }
  };

  const handleOpenMenu = (event, commentId) => {
    setAnchorEl(event.currentTarget);
    setSelectedCommentId(commentId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedCommentId(null);
  };

  const handleOpenEditMode = (comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.content);
    handleCloseMenu();
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleOpenMentionMenu = (event) => {
    const textarea = event.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);

    // Kiểm tra xem có đang gõ @ không
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      // Nếu không có khoảng trắng sau @ và đang nhập sau @
      if (
        !textAfterAt.includes(" ") &&
        lastAtSymbol === cursorPos - textAfterAt.length - 1
      ) {
        setMentionQuery(textAfterAt);
        setMentionMenuAnchor(event.target);
        setCursorPosition(cursorPos);
        return;
      }
    }

    setMentionMenuAnchor(null);
  };

  const handleCloseMentionMenu = () => {
    setMentionMenuAnchor(null);
    setMentionQuery("");
  };

  const handleSelectMention = (user) => {
    const textarea = mentionMenuAnchor;
    const cursorPos = cursorPosition;
    const textBeforeMention = textarea.value.substring(
      0,
      cursorPos - mentionQuery.length - 1
    );
    const textAfterMention = textarea.value.substring(cursorPos);

    // Format: @[Full Name](userId)
    const mentionText = `@[${user.fullName}](${user._id})`;

    const newText = textBeforeMention + mentionText + " " + textAfterMention;
    setNewComment(newText);

    // Đóng menu
    handleCloseMentionMenu();

    // Focus lại vào textarea và di chuyển con trỏ sau mention
    setTimeout(() => {
      textarea.focus();
      const newPosition = textBeforeMention.length + mentionText.length + 1;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 50);
  };

  const formatMentions = (text) => {
    // Chuyển đổi format @[Full Name](userId) thành chip hoặc text highlight
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      parts.push(
        <Chip
          key={`mention-${match[2]}-${match.index}`}
          size="small"
          label={match[1]}
          color="primary"
          variant="outlined"
          sx={{ height: 24, fontSize: "0.8rem", mx: 0.5 }}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <Box display="inline">{parts}</Box>;
  };

  const renderComment = (comment) => {
    if (editingCommentId === comment._id) {
      return (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Chỉnh sửa bình luận..."
            variant="outlined"
            size="small"
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button size="small" onClick={handleCancelEdit} sx={{ mr: 1 }}>
              Hủy
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleEditComment}
              disabled={!editText.trim()}
            >
              Lưu
            </Button>
          </Box>
        </Box>
      );
    }

    return (
      <Paper sx={{ p: 2, mt: 1, bgcolor: "#f9f9f9" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              src={comment.user?.avatar}
              alt={comment.user?.fullName}
              sx={{ width: 32, height: 32, mr: 1 }}
            >
              {comment.user?.fullName?.charAt(0) || "?"}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" color="text.primary">
                {comment.user?.fullName || "User"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {comment.createdAt
                  ? format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", {
                      locale: vi,
                    })
                  : ""}
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={(e) => handleOpenMenu(e, comment._id)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
          {formatMentions(comment.content)}
        </Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Bình luận ({comments.length})
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {loading && comments.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {comments.map((comment) => (
            <ListItem
              key={comment._id}
              alignItems="flex-start"
              sx={{ px: 0, py: 1 }}
            >
              {renderComment(comment)}
            </ListItem>
          ))}
        </List>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Thêm bình luận
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyUp={handleOpenMentionMenu}
          placeholder="Viết bình luận... (Nhập @ để đề cập đến người dùng)"
          variant="outlined"
          InputProps={{
            endAdornment: (
              <Tooltip title="Đề cập người dùng">
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    const textarea = e.currentTarget
                      .closest(".MuiInputBase-root")
                      .querySelector("textarea");
                    if (textarea) {
                      const curPos = textarea.selectionStart;
                      const text = textarea.value;
                      const newText =
                        text.substring(0, curPos) +
                        "@" +
                        text.substring(curPos);
                      setNewComment(newText);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.selectionStart = textarea.selectionEnd =
                          curPos + 1;
                      }, 0);
                    }
                  }}
                >
                  <MentionIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            endIcon={<SendIcon />}
            onClick={handleAddComment}
            disabled={!newComment.trim() || loading}
          >
            Gửi
          </Button>
        </Box>
      </Box>

      {/* Menu cho comments */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem
          onClick={() => {
            const comment = comments.find((c) => c._id === selectedCommentId);
            if (comment) handleOpenEditMode(comment);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Chỉnh sửa
        </MenuItem>
        <MenuItem onClick={() => handleDeleteComment(selectedCommentId)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Xóa
        </MenuItem>
      </Menu>

      {/* Menu cho mentions */}
      <Menu
        anchorEl={mentionMenuAnchor}
        open={Boolean(mentionMenuAnchor)}
        onClose={handleCloseMentionMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        {filteredUsers.length > 0 ? (
          filteredUsers.slice(0, 5).map((user) => (
            <MenuItem key={user._id} onClick={() => handleSelectMention(user)}>
              <ListItemAvatar>
                <Avatar
                  src={user.avatar}
                  alt={user.fullName}
                  sx={{ width: 24, height: 24 }}
                >
                  {user.fullName.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.fullName}
                secondary={`@${user.username || ""}`}
                primaryTypographyProps={{ variant: "body2" }}
                secondaryTypographyProps={{ variant: "caption" }}
              />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2">Không tìm thấy người dùng</Typography>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default TaskComments;
