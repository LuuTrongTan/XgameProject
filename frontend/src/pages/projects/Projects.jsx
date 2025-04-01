import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Avatar,
  Tabs,
  Tab,
  Stack,
  CircularProgress,
  Alert,
  CardMedia,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  Unarchive as UnarchiveIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { getProjects, archiveProject, restoreProject } from "../../api/projectApi";
import CreateProjectDialog from "./CreateProjectDialog";
import CustomAvatar from "../../components/common/Avatar";
import { ROLES, getRoleName, PROJECT_STATUS, getStatusColor, getStatusLabel } from "../../config/constants";
import { useSnackbar } from "notistack";

const ProjectColumn = ({ title, tasks, addButton, columnId }) => (
  <Droppable droppableId={columnId}>
    {(provided, snapshot) => (
      <Card
        ref={provided.innerRef}
        {...provided.droppableProps}
        sx={{
          height: "100%",
          minHeight: "70vh",
          bgcolor: snapshot.isDraggingOver ? "#f0f0f0" : "#f8f9fa",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          transition: "background-color 0.2s ease",
        }}
      >
        <Box
          sx={{
            p: 2,
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ p: 2, flexGrow: 1 }}>
          {tasks.map((task, index) => (
            <Draggable
              key={task.id}
              draggableId={task.id.toString()}
              index={index}
            >
              {(provided, snapshot) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  sx={{
                    mb: 2,
                    cursor: "pointer",
                    boxShadow: snapshot.isDragging
                      ? "0 8px 16px rgba(0,0,0,0.1)"
                      : "0 2px 4px rgba(0,0,0,0.05)",
                    transition: "all 0.3s ease",
                    transform: snapshot.isDragging ? "rotate(3deg)" : "none",
                    "&:hover": {
                      transform: snapshot.isDragging
                        ? "rotate(3deg)"
                        : "translateY(-2px)",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 500, flexGrow: 1 }}
                      >
                        {task.title}
                      </Typography>
                      <Avatar
                        sx={{ width: 24, height: 24, fontSize: "0.875rem" }}
                      >
                        {task.assignee?.charAt(0)}
                      </Avatar>
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Chip
                        label={task.status}
                        size="small"
                        sx={{
                          bgcolor: task.statusColor,
                          color: "#fff",
                          fontSize: "0.75rem",
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {task.date}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </Box>
        {addButton && (
          <Box sx={{ p: 2, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
            <Button
              fullWidth
              startIcon={<AddIcon />}
              sx={{
                color: "text.secondary",
                justifyContent: "flex-start",
                "&:hover": { bgcolor: "rgba(0,0,0,0.05)" },
              }}
            >
              Thêm thẻ
            </Button>
          </Box>
        )}
      </Card>
    )}
  </Droppable>
);

const Projects = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchProjects();
  }, [filter, showArchived]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await getProjects({
        isArchived: showArchived,
      });
      console.log("API Response:", response);

      // Kiểm tra và xử lý dữ liệu từ response
      let projectsData = [];
      if (response?.success && response?.data) {
        projectsData = response.data;

        // Log project statuses to help debug filtering
        console.log(
          "Project statuses:",
          projectsData.map((p) => p.status)
        );
      }

      setProjects(projectsData);
      setError(null);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.response?.data?.message || "Không thể tải danh sách dự án");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event, newValue) => {
    setFilter(newValue);
  };

  const handleCreateSuccess = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const getAvatarSrc = (project) => {
    if (!project) return "/placeholder.png";
    if (project.avatarBase64) return project.avatarBase64;
    if (project.avatar && project.avatar.startsWith("http"))
      return project.avatar;
    return "/placeholder.png";
  };

  const handleMenuOpen = (event, project) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = (event) => {
    if (event) event.stopPropagation();
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const handleArchiveProject = async (event) => {
    if (event) event.stopPropagation();
    try {
      if (!selectedProject) return;
      
      const response = await archiveProject(selectedProject._id);
      if (response.success) {
        // Cập nhật danh sách dự án sau khi lưu trữ
        fetchProjects();
        enqueueSnackbar("Dự án đã được lưu trữ thành công", { variant: "success" });
      } else {
        enqueueSnackbar(response.message || "Không thể lưu trữ dự án", { variant: "error" });
      }
    } catch (error) {
      console.error("Error archiving project:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi lưu trữ dự án", { variant: "error" });
    }
    handleMenuClose();
  };
  
  const handleRestoreProject = async (event) => {
    if (event) event.stopPropagation();
    try {
      if (!selectedProject) return;
      
      const response = await restoreProject(selectedProject._id);
      if (response.success) {
        // Cập nhật danh sách dự án sau khi khôi phục
        fetchProjects();
        enqueueSnackbar("Dự án đã được khôi phục thành công", { variant: "success" });
      } else {
        enqueueSnackbar(response.message || "Không thể khôi phục dự án", { variant: "error" });
      }
    } catch (error) {
      console.error("Error restoring project:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi khôi phục dự án", { variant: "error" });
    }
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "calc(100vh - 100px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={fetchProjects} sx={{ mt: 2 }}>
          Thử lại
        </Button>
      </Box>
    );
  }

  // Đảm bảo projects luôn là một mảng và các project có đủ thông tin cần thiết
  const safeProjects = Array.isArray(projects) ? projects : [];

  const filteredProjects = safeProjects.filter((project) => {
    if (!project) return false;
    if (filter === "all") return true;
    if (filter === "active")
      return project.status?.toLowerCase() === "đang hoạt động";
    if (filter === "completed")
      return project.status?.toLowerCase() === "hoàn thành";
    if (filter === "closed") return project.status?.toLowerCase() === "đóng";
    return project.status?.toLowerCase() === filter.toLowerCase();
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          Dự án của bạn
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant={showArchived ? "outlined" : "contained"}
            startIcon={showArchived ? <UnarchiveIcon /> : <ArchiveIcon />}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Khôi phục dự án" : "Dự án lưu trữ"}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Tạo dự án mới
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Tabs
        value={filter}
        onChange={handleFilterChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab value="all" label="TẤT CẢ" />
        <Tab value="active" label="ĐANG HOẠT ĐỘNG" />
        <Tab value="completed" label="HOÀN THÀNH" />
        <Tab value="closed" label="ĐÓNG" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : projects.length === 0 ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" mb={2}>
            {showArchived
              ? "Không có dự án nào đã được lưu trữ"
              : "Bạn chưa có dự án nào"}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Tạo dự án mới
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow:
                      "0 12px 20px -10px rgba(0,0,0,0.2), 0 4px 20px 0px rgba(0,0,0,0.12), 0 7px 8px -5px rgba(0,0,0,0.1)",
                    "& .project-image": {
                      transform: "scale(1.03)",
                      filter: "contrast(1.05) brightness(1.02)",
                    },
                  },
                  transition:
                    "transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out",
                  borderRadius: "8px",
                  overflow: "hidden",
                  maxWidth: "100%",
                }}
                onClick={() => navigate(`/projects/${project._id}`)}
              >
                <CardMedia
                  component="div"
                  sx={{
                    height: project.avatarBase64 ? 200 : 200,
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "height 0.3s ease, box-shadow 0.3s ease",
                    padding: 0,
                    margin: 0,
                    overflow: "hidden",
                    boxShadow: project.avatarBase64
                      ? "inset 0 -10px 10px -10px rgba(0,0,0,0.2)"
                      : "none",
                    position: "relative",
                    "&::before": project.avatarBase64
                      ? {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundImage:
                            "linear-gradient(to bottom, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)",
                          zIndex: 1,
                          pointerEvents: "none",
                        }
                      : {},
                  }}
                >
                  {project.avatarBase64 ? (
                    <CustomAvatar
                      project={project}
                      className="project-image"
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        maxWidth: "100%",
                        display: "block",
                        margin: 0,
                        padding: 0,
                        borderRadius: 0,
                        animation: "fadeInZoom 0.5s ease-out",
                        "@keyframes fadeInZoom": {
                          "0%": {
                            opacity: 0,
                            transform: "scale(0.95)",
                          },
                          "100%": {
                            opacity: 1,
                            transform: "scale(1)",
                          },
                        },
                        filter: "contrast(1.03)",
                        transition: "transform 0.5s ease, filter 0.5s ease",
                      }}
                      variant="square"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có ảnh đại diện
                    </Typography>
                  )}
                </CardMedia>
                <CardContent sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Chip
                        label={getStatusLabel(project.status)}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(project.status)}20`,
                          color: getStatusColor(project.status),
                          mb: 1,
                        }}
                      />
                      <Typography variant="h6" noWrap gutterBottom>
                        {project.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          height: '40px'
                        }}
                      >
                        {project.description}
                      </Typography>
                    </Box>
                    
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, project)}
                      sx={{ ml: 1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {project.members?.slice(0, 3).map((member, index) => (
                        <Tooltip 
                          key={member.user._id} 
                          title={`${member.user.name || member.user.email} (${getRoleName(member.role)})`}
                        >
                          <Avatar
                            src={member.user.avatar}
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: "#1976D2",
                              display: "inline-flex",
                              marginLeft: index > 0 ? -1 : 0,
                              fontSize: '0.875rem'
                            }}
                          >
                            {member.user.name?.[0] || member.user.email?.[0]}
                          </Avatar>
                        </Tooltip>
                      ))}
                      {project.members?.length > 3 && (
                        <Tooltip title={`Còn ${project.members.length - 3} thành viên khác`}>
                          <Avatar 
                            sx={{ 
                              bgcolor: "grey.500", 
                              marginLeft: -1,
                              width: 28,
                              height: 28,
                              fontSize: '0.875rem'
                            }}
                          >
                            +{project.members.length - 3}
                          </Avatar>
                        </Tooltip>
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(project.createdAt).toLocaleDateString("vi-VN")}
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<VisibilityIcon />}
                    size="medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project._id}`);
                    }}
                    sx={{ mt: 'auto' }}
                  >
                    Xem chi tiết
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={(e) => {
          e.stopPropagation();
          if (selectedProject) navigate(`/projects/${selectedProject._id}`);
          handleMenuClose(e);
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          Xem chi tiết
        </MenuItem>
        
        <MenuItem onClick={(e) => {
          e.stopPropagation();
          // Logic chỉnh sửa dự án ở đây
          handleMenuClose(e);
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Chỉnh sửa
        </MenuItem>
        
        {selectedProject && !selectedProject.isArchived && (
          <MenuItem onClick={handleArchiveProject}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            Lưu trữ
          </MenuItem>
        )}
        
        {selectedProject && selectedProject.isArchived && (
          <MenuItem onClick={handleRestoreProject}>
            <ListItemIcon>
              <UnarchiveIcon fontSize="small" />
            </ListItemIcon>
            Khôi phục
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default Projects;
