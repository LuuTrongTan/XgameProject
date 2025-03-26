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
} from "@mui/material";
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Archive as ArchiveIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { getProjects } from "../../api/projectApi";
import CreateProjectDialog from "./CreateProjectDialog";

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

  useEffect(() => {
    fetchProjects();
  }, [filter, showArchived]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await getProjects();
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

        // Lọc dự án theo trạng thái archived
        if (!showArchived) {
          projectsData = projectsData.filter((project) => !project.isArchived);
        }
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

  const getStatusColor = (status) => {
    if (!status) return "#4CAF50";
    switch (status.toLowerCase()) {
      case "đang hoạt động":
        return "#4CAF50";
      case "hoàn thành":
        return "#2196F3";
      case "đóng":
        return "#9E9E9E";
      default:
        return "#4CAF50";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Đang hoạt động";
    switch (status.toLowerCase()) {
      case "đang hoạt động":
        return "Đang hoạt động";
      case "hoàn thành":
        return "Hoàn thành";
      case "đóng":
        return "Đóng";
      default:
        return "Đang hoạt động";
    }
  };

  const handleCreateSuccess = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            color={showArchived ? "primary" : "inherit"}
            startIcon={<ArchiveIcon />}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Ẩn dự án đã lưu trữ" : "Hiện dự án đã lưu trữ"}
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

      <Tabs
        value={filter}
        onChange={handleFilterChange}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab value="all" label="Tất cả" />
        <Tab value="active" label="Đang hoạt động" />
        <Tab value="completed" label="Hoàn thành" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

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
                  bgcolor: "#F8FAFF",
                  "&:hover": { boxShadow: 3 },
                }}
              >
                <CardContent>
                  <Chip
                    label={getStatusLabel(project.status)}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor(project.status)}20`,
                      color: getStatusColor(project.status),
                      mb: 2,
                    }}
                  />
                  <Typography variant="h6" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {project.description}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Tạo{" "}
                    {new Date(project.createdAt).toLocaleDateString("vi-VN")}
                  </Typography>

                  <Box sx={{ mt: 2, mb: 2 }}>
                    {project.members?.slice(0, 3).map((member, index) => (
                      <Avatar
                        key={member.user._id}
                        sx={{
                          bgcolor: "#1976D2",
                          display: "inline-flex",
                          marginLeft: index > 0 ? -1 : 0,
                        }}
                      >
                        {member.user.name?.[0] || member.user.email?.[0]}
                      </Avatar>
                    ))}
                    {project.members?.length > 3 && (
                      <Avatar sx={{ bgcolor: "grey.500", marginLeft: -1 }}>
                        +{project.members.length - 3}
                      </Avatar>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      size="small"
                      sx={{ flex: 1 }}
                      onClick={() => navigate(`/projects/${project._id}`)}
                    >
                      Xem dự án
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<AssignmentIcon />}
                      size="small"
                      sx={{ flex: 1 }}
                      onClick={() => navigate(`/projects/${project._id}/tasks`)}
                    >
                      Công việc
                    </Button>
                  </Stack>
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
    </Box>
  );
};

export default Projects;
