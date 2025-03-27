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
  Login as LoginIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { usePermissions } from "../../hooks/usePermissions";
import CustomAvatar from "../../components/common/Avatar";

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, authError, checkAuth } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Debug log - Kiểm tra user
  console.log("ProjectDetails - user từ useAuth:", user);
  console.log("ProjectDetails - authLoading:", authLoading);
  console.log("ProjectDetails - authError:", authError);

  // Sử dụng hook usePermissions để kiểm tra quyền
  const {
    ROLES,
    getRoleName,
    canEditProject,
    canDeleteProject,
    canArchiveProject,
    canAddMembers,
    toggleDebugMode,
    debugMode,
  } = usePermissions();

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
  const [reloadKey, setReloadKey] = useState(0);

  // Kiểm tra xác thực khi mount và khi thay đổi user
  useEffect(() => {
    if (!user && !authLoading) {
      // Thử làm mới phiên đăng nhập nếu chưa đăng nhập
      checkAuth();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      fetchProjectDetails();
    }
  }, [projectId, authLoading, reloadKey]);

  const handleReloadData = () => {
    setReloadKey((prev) => prev + 1);
  };

  const handleLogin = () => {
    navigate("/login", { state: { returnUrl: `/projects/${projectId}` } });
  };

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
      if (!canEditProject(project)) {
        enqueueSnackbar("Bạn không có quyền chỉnh sửa dự án này", {
          variant: "error",
          autoHideDuration: 5000,
        });
        setEditDialogOpen(false);
        return;
      }

      const response = await updateProject(projectId, editForm);
      if (response?.success) {
        setProject(response.data);
        setEditDialogOpen(false);
        enqueueSnackbar("Cập nhật dự án thành công", {
          variant: "success",
          autoHideDuration: 5000,
        });
      }
    } catch (err) {
      console.error("Error updating project:", err);
      enqueueSnackbar(
        err.response?.data?.message || "Không thể cập nhật dự án",
        {
          variant: "error",
          autoHideDuration: 5000,
        }
      );
    }
  };

  const handleDeleteProject = async () => {
    try {
      // Log debug info
      console.log("Deleting project:", project._id);
      console.log("User:", user);
      console.log("User permission:", canDeleteProject(project));

      if (!canDeleteProject(project)) {
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
      if (!canAddMembers(project)) {
        enqueueSnackbar("Bạn không có quyền thêm thành viên vào dự án này", {
          variant: "error",
          autoHideDuration: 5000,
        });
        setInviteDialogOpen(false);
        return;
      }

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
      if (!canArchiveProject(project)) {
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
      if (!canArchiveProject(project)) {
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

  if (authLoading || loading) {
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

  // Hiển thị thông báo đăng nhập nếu chưa đăng nhập
  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ maxWidth: 600, mx: "auto", p: 3 }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
              Bạn cần đăng nhập để xem chi tiết dự án
            </Typography>

            {authError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {authError}
              </Alert>
            )}

            <Typography sx={{ mb: 3, textAlign: "center" }}>
              Vui lòng đăng nhập để tiếp tục xem và quản lý dự án.
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<LoginIcon />}
                onClick={handleLogin}
              >
                Đăng nhập
              </Button>

              <Button variant="outlined" onClick={handleReloadData}>
                Thử lại
              </Button>
            </Box>
          </CardContent>
        </Card>
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
            <MenuItem value={ROLES.PROJECT_MANAGER}>
              {getRoleName(ROLES.PROJECT_MANAGER)}
            </MenuItem>
            <MenuItem value={ROLES.MEMBER}>
              {getRoleName(ROLES.MEMBER)}
            </MenuItem>
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
          disabled={
            !canAddMembers(project) ||
            !validateEmail(inviteForm.email) ||
            loading
          }
        >
          {loading ? <CircularProgress size={24} /> : "Thêm thành viên"}
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
          {/* Back Button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/projects")}
            sx={{ mb: 2 }}
          >
            Quay lại
          </Button>

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
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 3,
                  mb: 2,
                }}
              >
                {project.avatarBase64 ||
                (project.avatar && project.avatar.startsWith("http")) ? (
                  <CustomAvatar
                    project={project}
                    sx={{
                      width: 360,
                      height: 360,
                      borderRadius: 2,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}
                    variant="rounded"
                  />
                ) : null}
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: "bold", mb: 1 }}>
                    {project.name}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
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
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    {project.description}
                  </Typography>
                </Box>
              </Box>
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
                canArchiveProject(project) ? (
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
              ) : canArchiveProject(project) ? (
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

              {canEditProject(project) ? (
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

              {canDeleteProject(project) ? (
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
                    {canAddMembers(project) ? (
                      <Button
                        startIcon={<AddIcon />}
                        size="small"
                        onClick={() => setInviteDialogOpen(true)}
                      >
                        Thêm thành viên
                      </Button>
                    ) : (
                      <Tooltip title="Bạn không có quyền thêm thành viên vào dự án này">
                        <span>
                          <Button startIcon={<AddIcon />} size="small" disabled>
                            Thêm thành viên
                          </Button>
                        </span>
                      </Tooltip>
                    )}
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
              <Button
                variant="contained"
                onClick={handleEditProject}
                disabled={!canEditProject(project) || loading}
              >
                {loading ? <CircularProgress size={24} /> : "Lưu thay đổi"}
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
                disabled={!canDeleteProject(project)}
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
                disabled={!canArchiveProject(project) || loading}
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
                disabled={!canArchiveProject(project) || loading}
              >
                {loading ? <CircularProgress size={24} /> : "Khôi phục"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Debug Info Section - Commented out
          {debugMode && (
            <Card sx={{ mb: 3, bgcolor: "#f9f9f9" }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: "red" }}>
                  DEBUG INFO
                </Typography>

                <Typography variant="subtitle2">
                  Permission Check Results:
                </Typography>
                <ul>
                  <li>
                    canEditProject:{" "}
                    {canEditProject(project) ? "✅ YES" : "❌ NO"}
                  </li>
                  <li>
                    canDeleteProject:{" "}
                    {canDeleteProject(project) ? "✅ YES" : "❌ NO"}
                  </li>
                  <li>
                    canArchiveProject:{" "}
                    {canArchiveProject(project) ? "✅ YES" : "❌ NO"}
                  </li>
                  <li>
                    canAddMembers: {canAddMembers(project) ? "✅ YES" : "❌ NO"}
                  </li>
                </ul>

                <Typography variant="subtitle2">Current User:</Typography>
                <pre
                  style={{
                    background: "#eee",
                    padding: "8px",
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(
                    user
                      ? {
                          id: user._id,
                          name: user.name,
                          email: user.email,
                          role: user.role,
                        }
                      : "Không có user",
                    null,
                    2
                  )}
                </pre>

                <Typography variant="subtitle2">Auth State:</Typography>
                <pre
                  style={{
                    background: "#eee",
                    padding: "8px",
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(
                    {
                      isLoggedIn: !!user,
                      loading: authLoading,
                      error: authError,
                    },
                    null,
                    2
                  )}
                </pre>

                <Typography variant="subtitle2">Project Members:</Typography>
                <pre
                  style={{
                    background: "#eee",
                    padding: "8px",
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(
                    project?.members?.map((member) => ({
                      id: member.user._id,
                      name: member.user.name,
                      email: member.user.email,
                      role: member.role,
                    })),
                    null,
                    2
                  )}
                </pre>
              </CardContent>
            </Card>
          )}
          */}

          {!debugMode && (
            <Button
              variant="outlined"
              size="small"
              onClick={toggleDebugMode}
              sx={{ mt: 2 }}
            >
              Show Debug
            </Button>
          )}
        </>
      )}
    </Box>
  );
};

export default ProjectDetails;
