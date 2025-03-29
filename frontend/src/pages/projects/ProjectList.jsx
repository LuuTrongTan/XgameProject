import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api/api";
import ProjectFormDialog from "../../components/projects/ProjectFormDialog";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await API.get("/projects");
      setProjects(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setLoading(false);
      enqueueSnackbar("Không thể tải danh sách dự án", { variant: "error" });
    }
  };

  const handleOpenDialog = (project = null) => {
    setSelectedProject(project);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setSelectedProject(null);
    setOpenDialog(false);
  };

  const handleSubmit = async (formData) => {
    try {
      if (selectedProject) {
        // Cập nhật dự án
        await API.put(`/projects/${selectedProject._id}`, formData);
        enqueueSnackbar("Cập nhật dự án thành công", { variant: "success" });
      } else {
        // Tạo dự án mới
        await API.post("/projects", formData);
        enqueueSnackbar("Tạo dự án thành công", { variant: "success" });
      }
      fetchProjects();
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving project:", error);
      enqueueSnackbar(error.response?.data?.message || "Không thể lưu dự án", {
        variant: "error",
      });
    }
  };

  const handleDelete = async (projectId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dự án này?")) {
      try {
        await API.delete(`/projects/${projectId}`);
        enqueueSnackbar("Xóa dự án thành công", { variant: "success" });
        fetchProjects();
      } catch (error) {
        console.error("Error deleting project:", error);
        enqueueSnackbar(
          error.response?.data?.message || "Không thể xóa dự án",
          { variant: "error" }
        );
      }
    }
  };

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4">Danh sách dự án</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Tạo dự án mới
        </Button>
      </Box>
      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project._id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {project.name}
                </Typography>
                <Typography color="textSecondary" gutterBottom>
                  {project.description}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Thành viên: {project.members?.length || 0}
                  </Typography>
                </Box>
              </CardContent>
              <CardActions>
                <Tooltip title="Xem chi tiết">
                  <Button
                    size="small"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    Chi tiết
                  </Button>
                </Tooltip>
                <Tooltip title="Chỉnh sửa">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(project)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Xóa">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(project._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <ProjectFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
        project={selectedProject}
      />
    </Container>
  );
};

export default ProjectList;
