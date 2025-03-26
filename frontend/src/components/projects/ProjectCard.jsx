import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  Flag as FlagIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "notistack";
import { archiveProject, restoreProject } from "../../api/projectApi";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";

const statusColors = {
  active: "success",
  pending: "warning",
  completed: "info",
  archived: "default",
};

const statusLabels = {
  active: "Đang hoạt động",
  pending: "Chờ xử lý",
  completed: "Hoàn thành",
  archived: "Đã lưu trữ",
};

const ProjectCard = ({ project, onEdit, onDelete, onViewDetails }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleArchive = async (event) => {
    event.stopPropagation();
    try {
      const response = await archiveProject(project._id);
      if (response.success) {
        enqueueSnackbar("Dự án đã được lưu trữ", {
          variant: "success",
          autoHideDuration: 10000,
        });
        // Trở về trang danh sách dự án
        setTimeout(() => {
          navigate("/projects");
        }, 500);
      }
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi lưu trữ dự án",
        {
          variant: "error",
          autoHideDuration: 10000,
        }
      );
    }
    handleMenuClose();
  };

  const handleRestore = async (event) => {
    event.stopPropagation();
    try {
      const response = await restoreProject(project._id);
      if (response.success) {
        enqueueSnackbar("Dự án đã được khôi phục", {
          variant: "success",
          autoHideDuration: 10000,
        });
        // Trở về trang danh sách dự án
        setTimeout(() => {
          navigate("/projects");
        }, 500);
      }
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message || "Lỗi khi khôi phục dự án",
        {
          variant: "error",
          autoHideDuration: 10000,
        }
      );
    }
    handleMenuClose();
  };

  // Fallback data for preview
  const fallbackProject = {
    _id: "123",
    name: "Sample Project",
    description: "This is a sample project description.",
    status: "active",
    progress: 75,
    dueDate: new Date(),
    members: new Array(5).fill({ avatar: "", name: "User" }),
    tasksCount: { total: 10, completed: 7 },
  };

  const p = project || fallbackProject;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        opacity: p.isArchived ? 0.7 : 1,
        filter: p.isArchived ? "grayscale(30%)" : "none",
        borderLeft: p.isArchived ? "4px solid #9e9e9e" : "none",
        "&:hover": {
          boxShadow: 3,
        },
      }}
      onClick={() => navigate(`/projects/${p._id}`)}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Chip
              label={statusLabels[p.status] || "Unknown"}
              color={statusColors[p.status] || "default"}
              size="small"
              sx={{ mb: 1 }}
            />
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              <TimeIcon
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />
              {new Date(p.dueDate).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" component="div" gutterBottom noWrap>
          {p.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            height: "40px",
          }}
        >
          {p.description}
        </Typography>

        <Box sx={{ mt: 2, mb: 1 }}>
          <Grid container justifyContent="space-between">
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Tiến độ
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                {p.progress}%
              </Typography>
            </Grid>
          </Grid>
          <LinearProgress
            variant="determinate"
            value={p.progress}
            sx={{ mt: 1, mb: 1, height: 8, borderRadius: 5 }}
          />
        </Box>

        <Grid container justifyContent="space-between" sx={{ mt: 2 }}>
          <Grid item>
            <AvatarGroup max={4}>
              {p.members.map((member, index) => (
                <Avatar
                  key={index}
                  alt={member.name}
                  src={member.avatar}
                  sx={{ width: 30, height: 30 }}
                />
              ))}
            </AvatarGroup>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              <FlagIcon
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />
              {p.tasksCount.completed}/{p.tasksCount.total} công việc
            </Typography>
          </Grid>
        </Grid>
      </CardContent>

      <CardActions sx={{ justifyContent: "flex-end", p: 1 }}>
        <IconButton
          onClick={handleMenuClick}
          size="small"
          sx={{
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
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={onViewDetails}>
            <ListItemIcon>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            Xem chi tiết
          </MenuItem>
          {!p.isArchived &&
            (user?.role === "admin" ||
              p.members?.some(
                (m) =>
                  m.user._id === user?._id &&
                  ["admin", "project_manager"].includes(m.role)
              )) && (
              <MenuItem onClick={onEdit}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                Chỉnh sửa
              </MenuItem>
            )}
          {!p.isArchived && user?.role === "admin" && (
            <MenuItem onClick={onDelete}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              Xóa
            </MenuItem>
          )}
          {!p.isArchived &&
            (user?.role === "admin" ||
              p.members?.some(
                (m) =>
                  m.user._id === user?._id &&
                  ["admin", "project_manager"].includes(m.role)
              )) && (
              <MenuItem onClick={handleArchive}>
                <ListItemIcon>
                  <ArchiveIcon fontSize="small" />
                </ListItemIcon>
                Lưu trữ
              </MenuItem>
            )}
          {p.isArchived &&
            (user?.role === "admin" ||
              p.members?.some(
                (m) =>
                  m.user._id === user?._id &&
                  ["admin", "project_manager"].includes(m.role)
              )) && (
              <MenuItem onClick={handleRestore}>
                <ListItemIcon>
                  <UnarchiveIcon fontSize="small" />
                </ListItemIcon>
                Khôi phục
              </MenuItem>
            )}
        </Menu>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
