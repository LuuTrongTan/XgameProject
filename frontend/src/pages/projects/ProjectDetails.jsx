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
  IconButton,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  AvatarGroup,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Group as GroupIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProjectById,
  updateProject,
  deleteProject,
  inviteMember,
} from "../../api/projectApi";

const ROLES = {
  PROJECT_MANAGER: "Project Manager",
  MEMBER: "Member",
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: ROLES.MEMBER,
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "",
  });

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await getProjectById(projectId);
      if (response?.success && response?.data) {
        setProject(response.data);
        setEditForm({
          name: response.data.name,
          description: response.data.description,
          status: response.data.status || "Active",
        });
      }
    } catch (err) {
      console.error("Error fetching project details:", err);
      setError(err.response?.data?.message || "Không thể tải thông tin dự án");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = async () => {
    try {
      const response = await updateProject(projectId, editForm);
      if (response?.success) {
        setProject(response.data);
        setEditDialogOpen(false);
      }
    } catch (err) {
      console.error("Error updating project:", err);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject(projectId);
      navigate("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleInviteMember = async () => {
    try {
      const response = await inviteMember(projectId, inviteForm);
      if (response?.success) {
        setProject(response.data);
        setInviteDialogOpen(false);
        setInviteForm({ email: "", role: ROLES.MEMBER });
      }
    } catch (err) {
      console.error("Error inviting member:", err);
      setError(err.response?.data?.message || "Không thể thêm thành viên");
    }
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "hoàn thành":
        return "#2196F3";
      case "đóng":
        return "#9E9E9E";
      case "đang hoạt động":
        return "#4CAF50";
      default:
        return "#4CAF50";
    }
  };

  const getStatusLabel = (status) => {
    if (!status) return "Đang hoạt động";
    return status; // Trả về đúng status từ backend
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "400px",
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
        <Button
          variant="contained"
          onClick={fetchProjectDetails}
          sx={{ mt: 2 }}
        >
          Thử lại
        </Button>
      </Box>
    );
  }

  if (!project) return null;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {project.name}
            </Typography>
            <Chip
              label={getStatusLabel(project.status)}
              sx={{
                bgcolor: getStatusColor(project.status),
                color: "white",
                fontWeight: "medium",
              }}
            />
          </Box>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {project.description}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AssignmentIcon />}
            onClick={() => navigate(`/projects/${projectId}/tasks`)}
          >
            Xem công việc
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditDialogOpen(true)}
          >
            Chỉnh sửa dự án
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Xóa dự án
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Project Info */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Thông tin dự án
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">Người tạo</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar
                        src={project.owner?.avatar}
                        alt={project.owner?.name}
                      >
                        {project.owner?.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography>{project.owner?.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {project.owner?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1}>
                    <Typography color="text.secondary">Ngày tạo</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CalendarIcon color="action" />
                      <Typography>
                        {new Date(project.createdAt).toLocaleDateString(
                          "vi-VN",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Project Members */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Thành viên dự án</Typography>
                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => setInviteDialogOpen(true)}
                >
                  Thêm thành viên
                </Button>
              </Box>
              <Stack spacing={2}>
                {project.members?.map((member) => (
                  <Box
                    key={member.user._id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar src={member.user.avatar} alt={member.user.name}>
                        {member.user.name?.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography>{member.user.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.user.email}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={member.role}
                      size="small"
                      sx={{ bgcolor: "#f5f5f5" }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa dự án</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Tên dự án"
              fullWidth
              value={editForm.name}
              onChange={(e) =>
                setEditForm({ ...editForm, name: e.target.value })
              }
            />
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              rows={4}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
            <TextField
              select
              label="Trạng thái"
              fullWidth
              value={editForm.status}
              onChange={(e) =>
                setEditForm({ ...editForm, status: e.target.value })
              }
            >
              <MenuItem value="Đang hoạt động">Đang hoạt động</MenuItem>
              <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
              <MenuItem value="Đóng">Đóng</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleEditProject}>
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm thành viên</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Email"
              fullWidth
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              error={Boolean(
                inviteForm.email && !validateEmail(inviteForm.email)
              )}
              helperText={
                inviteForm.email && !validateEmail(inviteForm.email)
                  ? "Email không hợp lệ"
                  : ""
              }
            />
            <TextField
              select
              label="Vai trò"
              fullWidth
              value={inviteForm.role}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, role: e.target.value })
              }
            >
              {Object.values(ROLES).map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleInviteMember}
            disabled={!inviteForm.email || !validateEmail(inviteForm.email)}
          >
            Thêm thành viên
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Xác nhận xóa dự án</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa dự án "{project.name}"? Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteProject}
          >
            Xóa dự án
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectDetails;
