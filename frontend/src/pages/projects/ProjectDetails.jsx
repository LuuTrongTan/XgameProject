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
  ToggleButton,
  ToggleButtonGroup,
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
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import {
  getProjectById,
  updateProject,
  deleteProject,
  inviteMember,
  addMember,
  archiveProject,
  restoreProject,
} from "../../api/projectApi";
import { useSnackbar } from "notistack";
import { useAuth } from "../../contexts/AuthContext";

const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  MEMBER: "member",
};

const getRoleName = (roleValue) => {
  switch (roleValue) {
    case ROLES.ADMIN:
      return "Admin";
    case ROLES.PROJECT_MANAGER:
      return "Project Manager";
    case ROLES.MEMBER:
      return "Member";
    default:
      return roleValue;
  }
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: ROLES.MEMBER,
    method: "direct", // "direct" or "email"
  });
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "",
  });
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

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

  const canEditProject = () => {
    if (!project || !user) {
      console.log("No project or user data");
      return false;
    }

    console.log("=== DEBUG: EDIT PROJECT PERMISSION ===");
    console.log("User data:", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    console.log("Project data:", {
      id: project._id,
      name: project.name,
      owner: project.owner,
      members: project.members,
    });

    // Admin có thể sửa bất kỳ dự án nào
    if (user.role === ROLES.ADMIN) {
      console.log("User is ADMIN - Can edit project");
      return true;
    }

    // Chủ dự án có thể sửa dự án của mình
    if (project.owner && project.owner._id === user._id) {
      console.log("User is PROJECT OWNER - Can edit project");
      return true;
    }

    // Kiểm tra quyền thành viên trong dự án
    const userMembership = project.members?.find(
      (m) => m.user._id === user._id
    );
    console.log("User membership found:", userMembership);

    if (userMembership) {
      console.log("User role in project:", userMembership.role);
      console.log("Expected PM role:", ROLES.PROJECT_MANAGER);
      console.log(
        "Role comparison:",
        userMembership.role === ROLES.PROJECT_MANAGER
      );

      // Kiểm tra role project manager
      if (userMembership.role === ROLES.PROJECT_MANAGER) {
        console.log("User is PROJECT MANAGER - Can edit project");
        return true;
      }
    }

    console.log("User does not have permission to edit project");
    console.log("=== END DEBUG ===");
    return false;
  };

  const canArchiveProject = () => {
    if (!project || !user) {
      console.log("No project or user data");
      return false;
    }

    console.log("=== DEBUG: ARCHIVE PROJECT PERMISSION ===");
    console.log("User data:", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    console.log("Project data:", {
      id: project._id,
      name: project.name,
      owner: project.owner,
      members: project.members,
    });

    // Admin có thể lưu trữ bất kỳ dự án nào
    if (user.role === ROLES.ADMIN) {
      console.log("User is ADMIN - Can archive project");
      return true;
    }

    // Chủ dự án có thể lưu trữ dự án của mình
    if (project.owner && project.owner._id === user._id) {
      console.log("User is PROJECT OWNER - Can archive project");
      return true;
    }

    // Kiểm tra quyền thành viên trong dự án
    const userMembership = project.members?.find(
      (m) => m.user._id === user._id
    );
    console.log("User membership found:", userMembership);

    if (userMembership) {
      console.log("User role in project:", userMembership.role);
      console.log("Expected PM role:", ROLES.PROJECT_MANAGER);
      console.log(
        "Role comparison:",
        userMembership.role === ROLES.PROJECT_MANAGER
      );

      // Kiểm tra role project manager
      if (userMembership.role === ROLES.PROJECT_MANAGER) {
        console.log("User is PROJECT MANAGER - Can archive project");
        return true;
      }
    }

    console.log("User does not have permission to archive project");
    console.log("=== END DEBUG ===");
    return false;
  };

  const canDeleteProject = () => {
    if (!project || !user) {
      console.log("No project or user data");
      return false;
    }

    console.log("=== DEBUG: DELETE PROJECT PERMISSION ===");
    console.log("User data:", {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    console.log("Project data:", {
      id: project._id,
      name: project.name,
      owner: project.owner,
      members: project.members,
    });

    // Admin có thể xóa bất kỳ dự án nào
    if (user.role === ROLES.ADMIN) {
      console.log("User is ADMIN - Can delete project");
      return true;
    }

    // Chủ dự án có thể xóa dự án của mình
    if (project.owner && project.owner._id === user._id) {
      console.log("User is PROJECT OWNER - Can delete project");
      return true;
    }

    // Kiểm tra quyền thành viên trong dự án
    const userMembership = project.members?.find(
      (m) => m.user._id === user._id
    );
    console.log("User membership found:", userMembership);

    if (userMembership) {
      console.log("User role in project:", userMembership.role);
      console.log("Expected PM role:", ROLES.PROJECT_MANAGER);
      console.log(
        "Role comparison:",
        userMembership.role === ROLES.PROJECT_MANAGER
      );

      // Kiểm tra role project manager
      if (userMembership.role === ROLES.PROJECT_MANAGER) {
        console.log("User is PROJECT MANAGER - Can delete project");
        return true;
      }
    }

    console.log("User does not have permission to delete project");
    console.log("=== END DEBUG ===");
    return false;
  };

  const handleDeleteProject = async () => {
    try {
      if (!canDeleteProject()) {
        enqueueSnackbar("Bạn không có quyền xóa dự án này", {
          variant: "error",
          autoHideDuration: 5000,
        });
        setDeleteDialogOpen(false);
        return;
      }

      setLoading(true);
      const response = await deleteProject(projectId);

      enqueueSnackbar("Dự án đã được xóa thành công", {
        variant: "success",
        autoHideDuration: 5000,
      });

      navigate("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
      enqueueSnackbar(err.response?.data?.message || "Không thể xóa dự án", {
        variant: "error",
        autoHideDuration: 5000,
      });
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setInviteForm((prev) => ({
        ...prev,
        method: newMethod,
      }));
    }
  };

  const handleInviteMember = async () => {
    try {
      let response;

      if (inviteForm.method === "direct") {
        // Thêm thành viên trực tiếp
        response = await addMember(
          projectId,
          inviteForm.email,
          inviteForm.role
        );
      } else {
        // Gửi lời mời qua email
        response = await inviteMember(
          projectId,
          inviteForm.email,
          inviteForm.role
        );
      }

      if (response?.success) {
        // Nếu thêm trực tiếp thì cập nhật dự án
        if (inviteForm.method === "direct" && response.data) {
          setProject(response.data);
        }
        setInviteDialogOpen(false);
        setInviteForm({
          email: "",
          role: ROLES.MEMBER,
          method: inviteForm.method,
        });
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

  const handleArchive = async () => {
    try {
      if (!canArchiveProject()) {
        enqueueSnackbar("Bạn không có quyền lưu trữ dự án này", {
          variant: "error",
          autoHideDuration: 5000,
        });
        setArchiveDialogOpen(false);
        return;
      }

      setLoading(true);
      const response = await archiveProject(projectId);
      if (response.success) {
        // Đóng dialog
        setArchiveDialogOpen(false);
        // Hiển thị thông báo thành công
        enqueueSnackbar("Dự án đã được lưu trữ thành công", {
          variant: "success",
          autoHideDuration: 10000,
        });
        // Chuyển hướng về trang danh sách dự án
        setTimeout(() => {
          navigate("/projects");
        }, 500);
      }
    } catch (err) {
      console.error("Error archiving project:", err);
      setArchiveDialogOpen(false);
      enqueueSnackbar(
        err.response?.data?.message || "Không thể lưu trữ dự án",
        {
          variant: "error",
          autoHideDuration: 10000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      if (!canArchiveProject()) {
        enqueueSnackbar("Bạn không có quyền khôi phục dự án này", {
          variant: "error",
          autoHideDuration: 5000,
        });
        setRestoreDialogOpen(false);
        return;
      }

      setLoading(true);
      const response = await restoreProject(projectId);
      if (response.success) {
        // Đóng dialog
        setRestoreDialogOpen(false);
        // Hiển thị thông báo thành công
        enqueueSnackbar("Dự án đã được khôi phục thành công", {
          variant: "success",
          autoHideDuration: 10000,
        });
        // Chuyển hướng về trang danh sách dự án
        setTimeout(() => {
          navigate("/projects");
        }, 500);
      }
    } catch (err) {
      console.error("Error restoring project:", err);
      setRestoreDialogOpen(false);
      enqueueSnackbar(
        err.response?.data?.message || "Không thể khôi phục dự án",
        {
          variant: "error",
          autoHideDuration: 10000,
        }
      );
    } finally {
      setLoading(false);
    }
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
        <Typography color="error">{error.message}</Typography>
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

  const renderInviteDialog = () => (
    <Dialog
      open={inviteDialogOpen}
      onClose={() => setInviteDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Thêm thành viên</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <ToggleButtonGroup
            value={inviteForm.method}
            exclusive
            onChange={handleInviteMethodChange}
            sx={{ mb: 2, width: "100%" }}
          >
            <ToggleButton value="direct" sx={{ width: "50%" }}>
              <PersonAddIcon sx={{ mr: 1 }} />
              Thêm trực tiếp
            </ToggleButton>
            <ToggleButton value="email" sx={{ width: "50%" }}>
              <EmailIcon sx={{ mr: 1 }} />
              Gửi lời mời
            </ToggleButton>
          </ToggleButtonGroup>

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
                {getRoleName(role)}
              </MenuItem>
            ))}
          </TextField>

          {inviteForm.method === "direct" && (
            <Typography variant="body2" color="text.secondary">
              * Người dùng sẽ được thêm trực tiếp vào dự án nếu đã có tài khoản
              trong hệ thống.
            </Typography>
          )}

          {inviteForm.method === "email" && (
            <Typography variant="body2" color="text.secondary">
              * Một email mời sẽ được gửi đến địa chỉ này với liên kết để tham
              gia dự án.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setInviteDialogOpen(false)}>Hủy</Button>
        <Button
          variant="contained"
          onClick={handleInviteMember}
          disabled={!inviteForm.email || !validateEmail(inviteForm.email)}
        >
          {inviteForm.method === "direct" ? "Thêm thành viên" : "Gửi lời mời"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert
          severity={error.type || "error"}
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error.message || error}
        </Alert>
      )}

      {project && (
        <>
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
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}
              >
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
                {project.isArchived && (
                  <Chip
                    label="Đã lưu trữ"
                    color="default"
                    icon={<ArchiveIcon fontSize="small" />}
                  />
                )}
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

              {!project.isArchived ? (
                canArchiveProject() ? (
                  <Button
                    startIcon={<ArchiveIcon />}
                    variant="outlined"
                    color="warning"
                    onClick={() => setArchiveDialogOpen(true)}
                  >
                    Lưu trữ
                  </Button>
                ) : (
                  <Tooltip title="Bạn không có quyền lưu trữ dự án này">
                    <span>
                      <Button
                        startIcon={<ArchiveIcon />}
                        variant="outlined"
                        color="warning"
                        disabled
                      >
                        Lưu trữ
                      </Button>
                    </span>
                  </Tooltip>
                )
              ) : canArchiveProject() ? (
                <Button
                  startIcon={<UnarchiveIcon />}
                  variant="outlined"
                  color="success"
                  onClick={() => setRestoreDialogOpen(true)}
                >
                  Khôi phục
                </Button>
              ) : (
                <Tooltip title="Bạn không có quyền khôi phục dự án này">
                  <span>
                    <Button
                      startIcon={<UnarchiveIcon />}
                      variant="outlined"
                      color="success"
                      disabled
                    >
                      Khôi phục
                    </Button>
                  </span>
                </Tooltip>
              )}

              {canEditProject() ? (
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={() => setEditDialogOpen(true)}
                >
                  Chỉnh sửa
                </Button>
              ) : (
                <Tooltip title="Bạn không có quyền chỉnh sửa dự án này">
                  <span>
                    <Button
                      startIcon={<EditIcon />}
                      variant="outlined"
                      disabled
                    >
                      Chỉnh sửa
                    </Button>
                  </span>
                </Tooltip>
              )}

              {canDeleteProject() ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Xóa
                </Button>
              ) : (
                <Tooltip title="Bạn không có quyền xóa dự án này">
                  <span>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      disabled
                    >
                      Xóa
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Stack>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Thông tin dự án
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Stack spacing={1}>
                        <Typography color="text.secondary">
                          Người tạo
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
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
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            src={member.user.avatar}
                            alt={member.user.name}
                          >
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
                          label={getRoleName(member.role)}
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
                disabled={!canDeleteProject()}
              >
                {loading ? <CircularProgress size={24} /> : "Xóa dự án"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Invite Member Dialog */}
          {renderInviteDialog()}

          {/* Archive Dialog */}
          <Dialog
            open={archiveDialogOpen}
            onClose={() => setArchiveDialogOpen(false)}
          >
            <DialogTitle>Lưu trữ dự án</DialogTitle>
            <DialogContent>
              <Typography>
                Bạn có chắc chắn muốn lưu trữ dự án "{project?.name}"? Dự án sẽ
                không hiển thị trong danh sách dự án hoạt động.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setArchiveDialogOpen(false)}>Hủy</Button>
              <Button
                onClick={handleArchive}
                color="warning"
                variant="contained"
                disabled={!canArchiveProject() || loading}
              >
                {loading ? <CircularProgress size={24} /> : "Lưu trữ"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Restore Dialog */}
          <Dialog
            open={restoreDialogOpen}
            onClose={() => setRestoreDialogOpen(false)}
          >
            <DialogTitle>Khôi phục dự án</DialogTitle>
            <DialogContent>
              <Typography>
                Bạn có chắc chắn muốn khôi phục dự án "{project?.name}"? Dự án
                sẽ được chuyển về trạng thái hoạt động.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setRestoreDialogOpen(false)}>Hủy</Button>
              <Button
                onClick={handleRestore}
                color="success"
                variant="contained"
                disabled={!canArchiveProject() || loading}
              >
                {loading ? <CircularProgress size={24} /> : "Khôi phục"}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default ProjectDetails;
