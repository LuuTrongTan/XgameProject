import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
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
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const priorityColors = {
  LOW: "#4caf50",
  MEDIUM: "#ff9800",
  HIGH: "#f44336",
};

const priorityLabels = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

const statusColors = {
  TODO: "#42a5f5",
  IN_PROGRESS: "#ff9800",
  REVIEWING: "#ab47bc",
  DONE: "#4caf50",
};

const statusLabels = {
  TODO: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  REVIEWING: "Đang kiểm tra",
  DONE: "Hoàn thành",
};

const TaskCard = ({
  task,
  index,
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

  return (
    <>
      <Draggable draggableId={task._id.toString()} index={index}>
        {(provided, snapshot) => (
          <Card
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            sx={{
              mb: 1,
              backgroundColor: "white",
              "&:hover": {
                boxShadow: 3,
              },
              ...(snapshot.isDragging && {
                boxShadow: 3,
              }),
            }}
          >
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Typography variant="h6" component="div" gutterBottom>
                  {task.name}
                </Typography>
                <IconButton size="small" onClick={handleMenuClick}>
                  <MoreVertIcon />
                </IconButton>
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
                    backgroundColor: `${statusColors[task.status]}20`,
                    color: statusColors[task.status],
                    fontWeight: 500,
                  }}
                />
                <Chip
                  size="small"
                  label={priorityLabels[task.priority] || task.priority}
                  sx={{
                    backgroundColor: `${priorityColors[task.priority]}20`,
                    color: priorityColors[task.priority],
                    fontWeight: 500,
                  }}
                />
                {task.tags?.map((tag, idx) => (
                  <Chip
                    key={idx}
                    size="small"
                    label={tag}
                    sx={{
                      backgroundColor: "#e0e0e0",
                      color: "text.secondary",
                    }}
                  />
                ))}
              </Box>

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
                    {format(new Date(task.dueDate), "dd/MM/yyyy", {
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
                          <Avatar
                            alt={assignee.fullName}
                            src={assignee.avatar}
                          />
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Draggable>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleAddComment}>
          <CommentIcon fontSize="small" sx={{ mr: 1 }} />
          Thêm bình luận
        </MenuItem>
        <MenuItem onClick={handleAddAttachment}>
          <AttachFileIcon fontSize="small" sx={{ mr: 1 }} />
          Đính kèm tệp
        </MenuItem>
        <MenuItem onClick={() => onEdit && onEdit(task)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Chỉnh sửa
        </MenuItem>
        <MenuItem onClick={() => onDelete && onDelete(task._id)}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Xóa
        </MenuItem>
      </Menu>

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
          <Button onClick={handleCommentSubmit} variant="contained">
            Gửi
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openAttachmentDialog}
        onClose={() => setOpenAttachmentDialog(false)}
      >
        <DialogTitle>Đính kèm tệp</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{ display: "none" }}
              id="attachment-input"
            />
            <label htmlFor="attachment-input">
              <Button variant="outlined" component="span">
                Chọn tệp
              </Button>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {selectedFile.name}
                </Typography>
              )}
            </label>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAttachmentDialog(false)}>Hủy</Button>
          <Button onClick={handleAttachmentSubmit} variant="contained">
            Đính kèm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;
