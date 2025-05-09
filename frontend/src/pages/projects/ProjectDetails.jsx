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
  removeMemberFromProject,
  addMultipleMembers,
} from "../../api/projectApi";
import { getSprints } from "../../api/sprintApi";
import { useSnackbar } from "notistack";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import CustomAvatar from "../../components/common/Avatar";
import BackButton from "../../components/common/BackButton";
import ActionButtons from "../../components/common/ActionButtons";
import SprintFormDialog from "../../components/sprints/SprintFormDialog";
import MemberSelection from "../../components/common/MemberSelection";
import MemberItem from "../../components/common/MemberItem";
import ProjectMemberSelector from "../../components/projects/ProjectMemberSelector";
import ProjectForm from "../../components/projects/ProjectForm";

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
  const [sprints, setSprints] = useState([]);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const [openCreateSprintDialog, setOpenCreateSprintDialog] = useState(false);
  const [members, setMembers] = useState([]);

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
      fetchProjectSprints();
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
        setMembers(response.data.members);
      }
    } catch (err) {
      console.error("Error fetching project details:", err);
      setError(err.response?.data?.message || "Không thể tải thông tin dự án");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSprints = async () => {
    try {
      // Kiểm tra xem projectId đã có trước khi gọi API
      if (!projectId) {
        console.error("fetchProjectSprints: projectId is undefined or null");
        setSprints([]);
        setLoadingSprints(false);
        return;
      }
      
      setLoadingSprints(true);
      const response = await getSprints(projectId);
      if (response?.success && response?.data) {
        setSprints(response.data);
      } else {
        console.error("No sprints found or error in response:", response);
        setSprints([]);
      }
    } catch (err) {
      console.error("Error fetching sprints:", err);
      setSprints([]);
    } finally {
      setLoadingSprints(false);
    }
  };

  const handleEditProject = async (projectData) => {
    try {
      if (!canEditProject(project)) {
        enqueueSnackbar("Bạn không có quyền chỉnh sửa dự án này", {
          variant: "error",
          autoHideDuration: 5000,
        });
        setEditDialogOpen(false);
        return;
      }

      setLoading(true);
      const response = await updateProject(projectId, projectData);
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
    } finally {
      setLoading(false);
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

  const handleOpenCreateSprintDialog = () => {
    setOpenCreateSprintDialog(true);
  };

  const handleCloseCreateSprintDialog = () => {
    setOpenCreateSprintDialog(false);
  };

  const handleSprintCreated = () => {
    fetchProjectSprints();
    handleCloseCreateSprintDialog();
  };

  const handleMembersChange = async (newMembers) => {
    try {
      // So sánh danh sách cũ và mới để xác định thao tác
      const currentMemberIds = new Set(members.map(member => 
        member.user ? member.user._id : (member.id || member._id)
      ));
      
      // Lấy id của các thành viên mới
      const newMemberIds = new Set(newMembers.map(member => member.id || member._id));
      
      // Kiểm tra xem có phải đang xóa thành viên không
      const isRemoving = members.length > newMembers.length;
      
      if (isRemoving) {
        console.log("Đang xóa thành viên...");
        // Tìm id của thành viên đã bị xóa
        const removedMemberIds = [...currentMemberIds].filter(id => !newMemberIds.has(id));
        
        if (removedMemberIds.length > 0) {
          // Cập nhật UI trước
          setMembers(newMembers);
          // Gọi API để xóa từng thành viên
          for (const memberId of removedMemberIds) {
            await removeMemberFromProject(projectId, memberId);
          }
          
          // Cập nhật lại thông tin project sau khi xóa thành công
          const updatedProject = await getProjectById(project._id);
          setProject(updatedProject.data);
          setMembers(updatedProject.data.members);
          
          enqueueSnackbar('Đã xóa thành viên khỏi dự án', { variant: 'success' });
        }
        return;
      }
      
      // Xử lý trường hợp thêm thành viên
      // Lọc ra các thành viên mới được thêm vào
      const existingMemberIds = members.map(member => 
        member.user ? member.user._id : (member.id || member._id)
      );
      const existingMemberEmails = members.map(member => 
        member.user ? member.user.email : member.email
      );
      
      const addedMembers = newMembers.filter(
        newMember => {
          const memberId = newMember.id || newMember._id;
          // Kiểm tra cả id và email để tránh trùng lặp
          return !existingMemberIds.includes(memberId) && 
                !existingMemberEmails.includes(newMember.email);
        }
      );

      if (addedMembers.length === 0) {
        console.log("Không có thành viên mới nào được thêm vào");
        enqueueSnackbar('Không có thành viên mới nào được thêm vào', { variant: 'info' });
        return;
      }

      // Thêm nhiều thành viên cùng lúc
      console.log("Thêm thành viên mới:", addedMembers);
      
      const preparedMembers = addedMembers.map(member => ({
        email: member.email,
        role: member.role,
        status: member.status
      }));
      
      const response = await addMultipleMembers(project._id, preparedMembers);
      
      // Cập nhật lại thông tin project
      const updatedProject = await getProjectById(project._id);
      setProject(updatedProject.data);
      setMembers(updatedProject.data.members);
      
      setInviteDialogOpen(false); // Đóng dialog sau khi thêm thành công
      enqueueSnackbar('Thêm thành viên thành công', { variant: 'success' });
    } catch (error) {
      console.error('Error updating members:', error);
      enqueueSnackbar(error.message || 'Có lỗi xảy ra khi cập nhật thành viên', { variant: 'error' });
    }
  };

  // Thêm hàm canRemoveProjectMember
  const canRemoveProjectMember = (project, memberId) => {
    if (!project || !user) return false;
    
    // Không thể xóa owner
    if (project.owner === memberId) return false;
    
    // Admin hoặc Project Manager có thể xóa thành viên
    if (project.owner === user._id) return true;
    
    const currentUserMember = project.members.find(m => m.user._id === user._id);
    return currentUserMember && (currentUserMember.role === ROLES.PROJECT_MANAGER || currentUserMember.role === ROLES.ADMIN);
  };
  
  // Thêm hàm handleRemoveMember
  const handleRemoveMember = async (memberId) => {
    try {
      // Gọi API xóa thành viên
      await removeMemberFromProject(projectId, memberId);
      
      // Cập nhật UI - lấy lại thông tin dự án sau khi xóa thành viên
      fetchProjectDetails();
      
      enqueueSnackbar("Đã xóa thành viên khỏi dự án", { variant: "success" });
    } catch (error) {
      console.error("Error removing member:", error);
      enqueueSnackbar(error.message || "Không thể xóa thành viên", { variant: "error" });
    }
  };

  // Chuẩn bị dữ liệu members cho ProjectMemberSelector
  const formatMembersForSelector = (projectMembers) => {
    if (!projectMembers || !Array.isArray(projectMembers)) return [];
    
    return projectMembers.map(member => {
      // Format theo cấu trúc mà ProjectMemberSelector mong đợi
      if (member.user) {
        return {
          id: member.user._id,
          _id: member.user._id,
          email: member.user.email,
          name: member.user.name || member.user.username || (member.user.email ? member.user.email.split('@')[0] : "Người dùng"),
          avatar: member.user.avatar,
          role: member.role,
          status: 'active'
        };
      }
      
      // Nếu đã có dạng chuẩn
      return {
        id: member._id || member.id,
        _id: member._id || member.id,
        email: member.email,
        name: member.name || member.username || (member.email ? member.email.split('@')[0] : "Người dùng"),
        avatar: member.avatar,
        role: member.role || 'member',
        status: member.status || 'active'
      };
    });
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
        <Box sx={{ mt: 2 }}>
          <ProjectMemberSelector
            members={formatMembersForSelector(members)}
            onMembersChange={handleMembersChange}
            title="Thêm thành viên vào dự án"
            excludeCurrentUser={true}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setInviteDialogOpen(false)}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <BackButton label="Quay lại" onClick={() => navigate('/projects')} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<TimelineIcon />}
            onClick={() => navigate(`/projects/${projectId}/sprints`)}
          >
            Danh sách Sprint
          </Button>
          
          {/* Status change and action buttons */}
          <Stack direction="row" spacing={1}>
            {project.isArchived ? (
              <Tooltip
                title={
                  canArchiveProject(project)
                    ? "Khôi phục dự án"
                    : "Bạn không có quyền khôi phục dự án này"
                }
              >
                <Button
                  startIcon={<UnarchiveIcon />}
                  variant="outlined"
                  color="success"
                  onClick={() => setRestoreDialogOpen(true)}
                  disabled={!canArchiveProject(project)}
                >
                  Khôi phục
                </Button>
              </Tooltip>
            ) : (
              <Tooltip
                title={
                  canArchiveProject(project)
                    ? "Lưu trữ dự án"
                    : "Bạn không có quyền lưu trữ dự án này"
                }
              >
                <Button
                  startIcon={<ArchiveIcon />}
                  variant="outlined"
                  color="warning"
                  onClick={() => setArchiveDialogOpen(true)}
                  disabled={!canArchiveProject(project)}
                >
                  Lưu trữ
                </Button>
              </Tooltip>
            )}

            <ActionButtons
              canEdit={canEditProject(project)}
              canDelete={canDeleteProject(project)}
              onEdit={() => setEditDialogOpen(true)}
              onDelete={() => setDeleteDialogOpen(true)}
              editTooltip="Bạn không có quyền chỉnh sửa dự án này"
              deleteTooltip="Bạn không có quyền xóa dự án này"
              variant="outlined"
            >
              <Tooltip title="Lưu trữ">
                <UnarchiveIcon />
              </Tooltip>
            </ActionButtons>
          </Stack>
        </Box>
      </Box>

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

                  {/* Sprint Buttons Section - Replace the XEM DỰ ÁN and CÔNG VIỆC buttons */}
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Sprints của dự án
                    </Typography>

                    {loadingSprints ? (
                      <CircularProgress size={24} sx={{ mt: 2 }} />
                    ) : sprints && sprints.length > 0 ? (
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ flexWrap: "wrap", gap: 2 }}
                      >
                        {sprints.map((sprint) => (
                          <Button
                            key={sprint._id}
                            variant="outlined"
                            color="primary"
                            onClick={() =>
                              navigate(
                                `/projects/${projectId}/sprints/${sprint._id}`
                              )
                            }
                            startIcon={<TimelineIcon />}
                            sx={{ mt: 1 }}
                          >
                            {sprint.name}
                          </Button>
                        ))}
                        <Tooltip
                          title={
                            !canEditProject(project)
                              ? "Bạn không có quyền tạo sprint mới"
                              : ""
                          }
                        >
                          <span>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<AddIcon />}
                              onClick={handleOpenCreateSprintDialog}
                              disabled={!canEditProject(project)}
                              sx={{ mt: 1 }}
                            >
                              Tạo Sprint mới
                            </Button>
                          </span>
                        </Tooltip>
                      </Stack>
                    ) : (
                      <Box sx={{ mt: 2 }}>
                        <Typography color="text.secondary" gutterBottom>
                          Dự án chưa có sprint nào.
                        </Typography>
                        <Tooltip
                          title={
                            !canEditProject(project)
                              ? "Bạn không có quyền tạo sprint mới"
                              : ""
                          }
                        >
                          <span>
                            <Button
                              variant="contained"
                              color="primary"
                              startIcon={<AddIcon />}
                              onClick={handleOpenCreateSprintDialog}
                              disabled={!canEditProject(project)}
                              sx={{ mt: 1 }}
                            >
                              Tạo Sprint đầu tiên
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
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
                      <MemberItem
                        key={member.user._id}
                        user={member.user}
                        member={member}
                        canRemove={canRemoveProjectMember(project, member.user._id)}
                        onRemove={(userId) => handleRemoveMember(userId)}
                        creatorId={project.owner}
                      />
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
            maxWidth="md"
            fullWidth
          >
            <ProjectForm
              project={project}
              onSubmit={handleEditProject}
              onCancel={() => setEditDialogOpen(false)}
            />
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

          {/* Sprint Form Dialog */}
          <SprintFormDialog
            open={openCreateSprintDialog}
            onClose={handleCloseCreateSprintDialog}
            projectId={projectId}
            onSuccess={handleSprintCreated}
          />
        </>
      )}
    </Box>
  );
};

export default ProjectDetails;
