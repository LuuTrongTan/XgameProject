import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ListItemAvatar,
  Avatar,
  Autocomplete,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TaskIcon from "@mui/icons-material/Task";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import {
  getSprintById,
  deleteSprint,
  removeTaskFromSprint,
  getProjectById,
  getSprintMembers,
  addMemberToSprint,
  removeMemberFromSprint,
  getAvailableUsersForSprint,
} from "../../api/sprintApi";
import SprintFormDialog from "../../components/sprints/SprintFormDialog";
import TaskSelectionDialog from "../../components/sprints/TaskSelectionDialog";
import { useSnackbar } from "notistack";
import BackButton from "../../components/common/BackButton";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import ActionButtons from "../../components/common/ActionButtons";
import { getRoleName } from "../../config/constants";
import MemberItem from "../../components/common/MemberItem";
import SprintMemberSelection from "../../components/sprints/SprintMemberSelection";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getStatusColor = (status) => {
  switch (status) {
    case "planning":
      return "info";
    case "active":
      return "success";
    case "completed":
      return "secondary";
    default:
      return "default";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "planning":
      return "Lên kế hoạch";
    case "active":
      return "Đang thực hiện";
    case "completed":
      return "Hoàn thành";
    default:
      return status;
  }
};

const getTaskStatusIcon = (status) => {
  switch (status) {
    case "todo":
      return <PendingIcon color="info" />;
    case "in_progress":
      return <AccessTimeIcon color="warning" />;
    case "done":
      return <CheckCircleIcon color="success" />;
    default:
      return <TaskIcon />;
  }
};

const getTaskStatusText = (status) => {
  switch (status) {
    case "todo":
      return "Cần làm";
    case "in_progress":
      return "Đang làm";
    case "done":
      return "Hoàn thành";
    default:
      return status;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "error";
    default:
      return "default";
  }
};

const getPriorityText = (priority) => {
  switch (priority) {
    case "low":
      return "Thấp";
    case "medium":
      return "Trung bình";
    case "high":
      return "Cao";
    default:
      return priority;
  }
};

const SprintDetail = () => {
  const { projectId, sprintId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddTaskDialog, setOpenAddTaskDialog] = useState(false);
  const [openRemoveTaskDialog, setOpenRemoveTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const { user } = useAuth();
  const {
    canEditSprint,
    canDeleteSprint,
    canManageSprintMembers,
    canViewSprint,
  } = usePermissions();

  // Thêm state quản lý thành viên
  const [sprintMembers, setSprintMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Thêm state lưu danh sách thành viên project
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);

  useEffect(() => {
    const fetchSprintDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Lấy thông tin project trước
        const projectResponse = await getProjectById(projectId);
        if (!projectResponse.success) {
          throw new Error(
            projectResponse.message || "Không thể tải thông tin dự án"
          );
        }

        // Lưu project data để sử dụng sau này
        const projectData = projectResponse.data;
        
        // Kiểm tra quyền truy cập dự án
        if (!projectData) {
          throw new Error("Không thể tải thông tin dự án");
        }

        // Lấy thông tin sprint
        const response = await getSprintById(projectId, sprintId);

        if (!response.success || !response.data) {
          throw new Error(response.message || "Không thể tải thông tin sprint");
        }

        // Gắn thông tin project vào sprint để kiểm tra phân quyền
        const sprintData = {
          ...response.data,
          project: projectData // Đảm bảo sprint có đủ thông tin project
        };
        
        // Kiểm tra quyền truy cập sử dụng usePermissions hook
        const hasViewPermission = canViewSprint(sprintData);
        const isSprintMember = sprintData.members?.some(
          (member) => member.user?._id === user?._id
        );

        if (!hasViewPermission && !isSprintMember) {
          enqueueSnackbar("Bạn không có quyền xem sprint này", {
            variant: "error",
          });
          navigate(`/projects/${projectId}/sprints`);
          return;
        }

        setSprint(sprintData);
      } catch (err) {
        console.error("Error fetching sprint details:", err);
        setError(err.message || "Có lỗi xảy ra khi tải thông tin sprint");
      } finally {
        setLoading(false);
      }
    };

    fetchSprintDetails();
  }, [projectId, sprintId, refresh]);

  // Fetch danh sách thành viên của sprint
  useEffect(() => {
    if (sprint) {
      fetchSprintMembers();
    }
  }, [sprint, refresh]);

  // Fetch danh sách thành viên của sprint
  const fetchSprintMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await getSprintMembers(projectId, sprintId);
      if (response.success) {
        setSprintMembers(response.data);
      } else {
        console.error("Lỗi khi lấy danh sách thành viên:", response.message);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Kiểm tra và trả về danh sách thành viên hiện có
  const getCurrentMembers = () => {
    // Nếu đã load được từ API riêng
    if (sprintMembers && sprintMembers.length > 0) {
      return sprintMembers;
    }
    
    // Nếu có từ thông tin sprint
    if (sprint && sprint.members && sprint.members.length > 0) {
      return sprint.members;
    }
    
    return [];
  };
  
  // Lấy thông tin người dùng từ cấu trúc thành viên 
  // (có thể khác nhau giữa sprintMembers và sprint.members)
  const getMemberUser = (member) => {
    if (!member) return null;
    
    // Nếu đã có thuộc tính user
    if (member.user) {
      return member.user;
    }
    
    // Nếu member là user object
    if (member._id || member.id) {
      return member;
    }
    
    return null;
  };

  // Thêm hàm fetch project members
  const fetchProjectMembers = async () => {
    try {
      setLoadingProjectMembers(true);
      
      // Lấy thông tin project trước (endpoint này đã hoạt động theo logs)
      const { getProjectById } = await import("../../api/sprintApi");
      const projectResponse = await getProjectById(projectId);
      
      if (projectResponse.success && projectResponse.data) {
        // Sử dụng danh sách thành viên từ project data
        if (projectResponse.data.members) {
          setProjectMembers(projectResponse.data.members);
        } else {
          setProjectMembers([]);
        }
      } else {
        console.error("Lỗi khi lấy thông tin dự án:", projectResponse.message);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên dự án:", error);
    } finally {
      setLoadingProjectMembers(false);
    }
  };

  // Thêm useEffect để fetch project members
  useEffect(() => {
    if (projectId) {
      fetchProjectMembers();
    }
  }, [projectId]);

  // Cập nhật hàm mở dialog thêm thành viên
  const handleOpenAddMemberDialog = () => {
    setOpenAddMemberDialog(true);
  };

  // Đóng dialog thêm thành viên
  const handleCloseAddMemberDialog = () => {
    setOpenAddMemberDialog(false);
    setSelectedUser(null);
  };

  // Thêm thành viên vào sprint
  const handleAddMember = async () => {
    if (!selectedUser) {
      enqueueSnackbar("Vui lòng chọn người dùng", { variant: "warning" });
      return;
    }

    try {
      const response = await addMemberToSprint(
        projectId,
        sprintId,
        { userId: selectedUser._id }
      );
      
      if (response.success) {
        enqueueSnackbar("Thêm thành viên thành công", { variant: "success" });
        
        // Thêm thành viên vào state nếu API trả về thông tin
        if (response.data && response.data.member) {
          // Tạo một bản sao của thành viên hiện tại
          const updatedMembers = [...getCurrentMembers()];
          
          // Thêm thành viên mới nếu chưa tồn tại
          const existingMemberIndex = updatedMembers.findIndex(
            m => getMemberUser(m)?._id === selectedUser._id
          );
          
          if (existingMemberIndex === -1) {
            // Cập nhật state trước khi API refresh
            setSprintMembers(prev => prev ? [...prev, response.data.member] : [response.data.member]);
            
            // Cập nhật sprint.members nếu đang được sử dụng
            if (sprint && sprint.members) {
              setSprint(prev => ({
                ...prev,
                members: [...(prev.members || []), response.data.member]
              }));
            }
          }
        } else {
          // Nếu API không trả về chi tiết thành viên, làm mới toàn bộ dữ liệu
          setRefresh((prev) => prev + 1);
        }
        
        // Gọi lại API để cập nhật dữ liệu từ server
        setTimeout(() => {
          fetchSprintMembers();
        }, 500);
        
        handleCloseAddMemberDialog();
      } else {
        enqueueSnackbar(response.message || "Không thể thêm thành viên", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error adding member:", error);
      enqueueSnackbar(error.response?.data?.message || "Không thể thêm thành viên", { 
        variant: "error" 
      });
    }
  };

  // Xóa thành viên khỏi sprint
  const handleRemoveMember = async (userId) => {
    try {
      const response = await removeMemberFromSprint(
        projectId,
        sprintId,
        userId
      );
      if (response.success) {
        enqueueSnackbar("Đã xóa thành viên khỏi sprint", {
          variant: "success",
        });
        setRefresh((prev) => prev + 1);
      } else {
        enqueueSnackbar(response.message || "Không thể xóa thành viên", {
          variant: "error",
        });
      }
    } catch (error) {
      enqueueSnackbar("Không thể xóa thành viên", { variant: "error" });
    }
  };

  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleOpenAddTaskDialog = () => {
    setOpenAddTaskDialog(true);
  };

  const handleCloseAddTaskDialog = () => {
    setOpenAddTaskDialog(false);
  };

  const handleOpenRemoveTaskDialog = (task) => {
    setSelectedTask(task);
    setOpenRemoveTaskDialog(true);
  };

  const handleCloseRemoveTaskDialog = () => {
    setOpenRemoveTaskDialog(false);
    setSelectedTask(null);
  };

  const handleDeleteSprint = async () => {
    try {
      // Kiểm tra quyền xóa
      if (!canDeleteSprint(sprint.project)) {
        enqueueSnackbar("Bạn không có quyền xóa sprint này", {
          variant: "error",
        });
        handleCloseDeleteDialog();
        return;
      }

      await deleteSprint(projectId, sprintId);
      enqueueSnackbar("Sprint đã được xóa thành công", { variant: "success" });
      navigate(`/projects/${projectId}/sprints`);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể xóa sprint", {
        variant: "error",
      });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleRemoveTask = async () => {
    if (!selectedTask) return;

    try {
      await removeTaskFromSprint(projectId, sprintId, selectedTask._id);
      enqueueSnackbar("Task đã được gỡ khỏi sprint thành công", {
        variant: "success",
      });
      setRefresh((prev) => prev + 1);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể gỡ task khỏi sprint", {
        variant: "error",
      });
    } finally {
      handleCloseRemoveTaskDialog();
    }
  };

  const handleFormSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleTaskClick = (taskId) => {
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  };

  const goBack = () => {
    navigate(`/projects/${projectId}/sprints`);
  };

  // Xử lý thêm thành viên vào cả project
  const handleAddToProject = async (newMembers) => {
    try {
      // Thêm từng thành viên vào project
      for (const member of newMembers) {
        if (!member.email) {
          console.error("Thiếu thông tin email cho thành viên:", member);
          continue;
        }
        
        // Đảm bảo role là "member" (chữ thường) cho phù hợp với API
        const role = member.role || "member";
        
        await addMember(projectId, member.email, role);
      }
      
      // Cập nhật danh sách thành viên project
      await fetchProjectMembers();
      
      enqueueSnackbar("Đã thêm thành viên mới vào dự án", { variant: "success" });
    } catch (error) {
      console.error("Lỗi khi thêm thành viên vào project:", error);
      enqueueSnackbar(`Không thể thêm thành viên vào dự án: ${error.message || 'Lỗi không xác định'}`, { variant: "error" });
    }
  };
  
  // Xử lý khi thay đổi danh sách thành viên của sprint
  const handleSprintMembersChange = async (newMembers) => {
    try {
      // Lấy danh sách thành viên hiện tại
      const currentMembers = getCurrentMembers();
      
      // Tìm các thành viên mới được thêm vào
      const addedMembers = newMembers.filter(
        newMember => !currentMembers.some(
          currentMember => 
            (getMemberUser(currentMember)?._id || getMemberUser(currentMember)?.id) === 
            (newMember._id || newMember.id)
        )
      );
      
      // Thêm từng thành viên mới vào sprint
      for (const member of addedMembers) {
        const userId = member._id || member.id;
        if (userId) {
          await addMemberToSprint(projectId, sprintId, { userId });
        }
      }
      
      setRefresh(prev => prev + 1);
      enqueueSnackbar("Đã cập nhật thành viên sprint", { variant: "success" });
    } catch (error) {
      console.error("Lỗi khi cập nhật thành viên sprint:", error);
      enqueueSnackbar("Không thể cập nhật thành viên", { variant: "error" });
    }
  };

  // Render ActionButtons trong Return
  const renderActionButtons = () => {
    // Kiểm tra quyền chỉnh sửa và xóa sprint
    const canEdit = canEditSprint(sprint?.project);
    const canDelete = canDeleteSprint(sprint?.project);
    
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<TaskIcon />}
          onClick={() => navigate(`/projects/${projectId}/tasks?sprint=${sprintId}`)}
        >
          XEM CÔNG VIỆC
        </Button>
        <ActionButtons
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={handleOpenEditDialog}
          onDelete={handleOpenDeleteDialog}
          editTooltip="Bạn không có quyền chỉnh sửa sprint này"
          deleteTooltip="Bạn không có quyền xóa sprint này"
          useIcons={false}
          variant="outlined"
        />
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <BackButton
          label="Quay lại danh sách sprint"
          onClick={goBack}
          sx={{ mt: 2 }}
        />
      </Box>
    );
  }

  if (!sprint) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Không tìm thấy thông tin sprint</Alert>
        <BackButton
          label="Quay lại danh sách sprint"
          onClick={goBack}
          sx={{ mt: 2 }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <BackButton label="Quay lại" onClick={goBack} />
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {sprint.name}
        </Typography>
        {renderActionButtons()}
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Mô tả
            </Typography>
            <Typography variant="body1" paragraph>
              {sprint.description}
            </Typography>

            {sprint.goal && (
              <>
                <Typography variant="h6" gutterBottom>
                  Mục tiêu
                </Typography>
                <Typography variant="body1" paragraph>
                  {sprint.goal}
                </Typography>
              </>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thông tin Sprint
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Trạng thái
                    </Typography>
                    <Chip
                      label={getStatusLabel(sprint.status)}
                      color={getStatusColor(sprint.status)}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Thời gian
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(sprint.startDate)} -{" "}
                      {formatDate(sprint.endDate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Số lượng task
                    </Typography>
                    <Typography variant="body1">
                      {sprint.tasks ? sprint.tasks.length : 0} nhiệm vụ
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Phần Thành viên Sprint */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" fontWeight="500">Thành viên Sprint</Typography>
          {canManageSprintMembers(sprint) && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenAddMemberDialog}
            >
              THÊM THÀNH VIÊN
            </Button>
          )}
        </Box>

        {loadingMembers ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : getCurrentMembers().length > 0 ? (
          <List>
            {getCurrentMembers().map((member) => {
              const userInfo = getMemberUser(member);
              return (
                <MemberItem
                  key={userInfo?._id || userInfo?.id}
                  user={userInfo}
                  member={member}
                  canRemove={canManageSprintMembers(sprint)}
                  onRemove={handleRemoveMember}
                  creatorId={sprint.createdBy}
                />
              );
            })}
          </List>
        ) : (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body1" color="text.secondary">
              Chưa có thành viên nào trong sprint này. Hãy thêm thành viên!
            </Typography>
          </Box>
        )}
      </Paper>

      {sprint && (
        <SprintFormDialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          projectId={projectId}
          onSuccess={handleFormSuccess}
          sprint={sprint}
          isEditing
          disabled={!canEditSprint(sprint?.project)}
        />
      )}

      {/* Dialog thêm thành viên */}
      <Dialog 
        open={openAddMemberDialog} 
        onClose={handleCloseAddMemberDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>Thêm thành viên vào Sprint</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Chọn thành viên để thêm vào sprint. Người dùng chưa thuộc dự án sẽ tự động được thêm vào dự án với vai trò Thành viên.
          </Typography>
          
          {loadingProjectMembers ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <SprintMemberSelection
              sprintMembers={[]}
              onSprintMembersChange={handleSprintMembersChange}
              projectMembers={projectMembers}
              onAddToProject={handleAddToProject}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddMemberDialog} color="inherit">Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xóa Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa sprint "{sprint?.name}"? Tất cả các nhiệm
            vụ sẽ được gỡ khỏi sprint này, nhưng không bị xóa. Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Hủy</Button>
          <Button
            onClick={handleDeleteSprint}
            color="error"
            disabled={!canDeleteSprint(sprint?.project)}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SprintDetail;
