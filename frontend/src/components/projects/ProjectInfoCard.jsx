import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Chip,
  Dialog,
  CircularProgress,
} from "@mui/material";
import api from "../../utils/api";
import ProjectForm from "./ProjectForm";
import TaskList from "../tasks/TaskList";
import { format } from "date-fns";

const ProjectInfoCard = ({ projectId }) => {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error("Error fetching project:", error);
      setError("Không thể tải thông tin dự án");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async (updatedProject) => {
    try {
      const response = await api.put(
        `/projects/${projectId}`,
        updatedProject
      );
      if (response.data) {
        setProject(response.data);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating project:", error);
      setError("Không thể cập nhật dự án");
    }
  };

  const handleArchiveToggle = async () => {
    try {
      const endpoint = project.isArchived ? '/unarchive' : '/archive';
      await api.post(
        `/projects/${projectId}${endpoint}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      fetchProject();
    } catch (error) {
      console.error("Error archiving project:", error);
      setError("Không thể thực hiện thao tác này");
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box p={3}>
        <Typography>Không tìm thấy dự án</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h4" component="h1">
            {project.name}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsEditing(true)}
          >
            Chỉnh sửa
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="body1" paragraph>
              {project.description}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Trạng thái:
            </Typography>
            <Chip
              label={
                {
                  active: "Đang hoạt động",
                  pending: "Chờ xử lý",
                  completed: "Hoàn thành",
                  archived: "Đã lưu trữ",
                }[project.status] || project.status
              }
              color={
                {
                  active: "primary",
                  pending: "warning",
                  completed: "success",
                  archived: "default",
                }[project.status]
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" gutterBottom>
              Thời gian:
            </Typography>
            <Typography>
              {format(new Date(project.startDate), "dd/MM/yyyy")} -{" "}
              {format(new Date(project.dueDate), "dd/MM/yyyy")}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Thành viên:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {project.members?.map((member) => (
                <Chip key={member._id} label={member.name} variant="outlined" />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <TaskList projectId={projectId} />

      <Dialog
        open={isEditing}
        onClose={() => setIsEditing(false)}
        maxWidth="md"
        fullWidth
      >
        <ProjectForm
          project={project}
          onSubmit={handleEditProject}
          onCancel={() => setIsEditing(false)}
        />
      </Dialog>
    </Box>
  );
};

export default ProjectInfoCard;
