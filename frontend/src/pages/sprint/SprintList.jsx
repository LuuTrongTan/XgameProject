import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  MenuItem,
  LinearProgress,
  InputAdornment,
  Avatar,
  AvatarGroup,
  CardActionArea,
  Paper,
  Badge,
  OutlinedInput,
  Select,
  FormControl,
  InputLabel,
  CardActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import FilterListIcon from "@mui/icons-material/FilterList";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TaskIcon from "@mui/icons-material/Task";
import { getSprints, deleteSprint, getProjectById } from "../../api/sprintApi";
import SprintFormDialog from "../../components/sprints/SprintFormDialog";
import { useSnackbar } from "notistack";
import BackButton from "../../components/common/BackButton";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import ActionButtons from "../../components/common/ActionButtons";

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
      return "primary";
    case "active":
      return "success";
    case "completed":
      return "secondary";
    case "cancelled":
      return "error";
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
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
};

// Tính toán tiến độ sprint dựa trên ngày bắt đầu và kết thúc
const calculateProgress = (startDate, endDate) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  
  if (now <= start) return 0;
  if (now >= end) return 100;
  
  const total = end - start;
  const elapsed = now - start;
  return Math.round((elapsed / total) * 100);
};

// Lấy màu cho thanh tiến độ
const getProgressColor = (progress, status) => {
  if (status === "completed") return "success";
  if (progress < 50) return "info";
  if (progress < 75) return "warning";
  return "error";
};

// Tính toán tiến độ task hoàn thành
const calculateTaskProgress = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

const SprintList = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sprints, setSprints] = useState([]);
  const [filteredSprints, setFilteredSprints] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const { user } = useAuth();
  const { canCreateSprint, canEditSprint, canDeleteSprint, canViewSprint } =
    usePermissions();
    
  // Chỉ giữ lại bộ lọc trạng thái
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, [projectId, refresh]);
  
  // Effect để lọc sprint theo filter
  useEffect(() => {
    if (!sprints) return;
    
    let result = [...sprints];
    
    // Lọc theo trạng thái nếu không phải "all"
    if (statusFilter !== "all") {
      result = result.filter(sprint => sprint.status === statusFilter);
    }
    
    setFilteredSprints(result);
  }, [sprints, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details
      try {
        const projectResponse = await getProjectById(projectId);
        setProject(projectResponse.data);
      } catch (projectErr) {
        console.error("Error fetching project:", projectErr);
      }

      // Fetch sprint list
      const sprintsResponse = await getSprints(projectId);
      if (sprintsResponse.success) {
        // Lọc những sprint mà người dùng có quyền xem
        const filteredSprints = sprintsResponse.data.filter((sprint) =>
          canViewSprint(sprint)
        );
        setSprints(filteredSprints);
        setFilteredSprints(filteredSprints);
      } else {
        setError(sprintsResponse.message || "Không thể tải danh sách sprint");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    // Kiểm tra quyền trước khi mở dialog tạo sprint
    if (!canCreateSprint()) {
      enqueueSnackbar("Bạn không có quyền tạo sprint", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  const handleOpenEditDialog = (event, sprint) => {
    event.stopPropagation();

    // Kiểm tra quyền trước khi mở dialog sửa sprint
    if (!canEditSprint()) {
      enqueueSnackbar("Bạn không có quyền sửa sprint", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }

    setSelectedSprint(sprint);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedSprint(null);
  };

  const handleOpenDeleteDialog = (event, sprint) => {
    event.stopPropagation();

    // Kiểm tra quyền trước khi mở dialog xóa sprint
    if (!canDeleteSprint()) {
      enqueueSnackbar("Bạn không có quyền xóa sprint", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }

    setSelectedSprint(sprint);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedSprint(null);
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;

    // Kiểm tra quyền trước khi xóa sprint
    if (!canDeleteSprint()) {
      enqueueSnackbar("Bạn không có quyền xóa sprint", { variant: "error" });
      handleCloseDeleteDialog();
      return;
    }

    try {
      await deleteSprint(projectId, selectedSprint._id);
      enqueueSnackbar("Sprint đã được xóa thành công", { variant: "success" });
      setRefresh((prev) => prev + 1);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể xóa sprint", {
        variant: "error",
      });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleFormSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleSprintClick = (sprintId) => {
    navigate(`/projects/${projectId}/sprints/${sprintId}`);
  };

  const handleTasksClick = (event, sprintId) => {
    event.stopPropagation();
    navigate(`/projects/${projectId}/tasks?sprint=${sprintId}`);
  };

  const handleBackClick = () => {
    navigate(`/projects/${projectId}`);
  };
  
  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const hasManagePermission = (projectRole) => {
    return projectRole === "admin" || projectRole === "project_manager";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <BackButton onClick={handleBackClick} />

      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 2, mt: 2 }}
      >
        <Typography variant="h4" component="h1">
          Danh sách Sprint
        </Typography>
        {hasManagePermission(project?.projectRole) && (
          <Tooltip
            title={
              project?.projectRole === "member"
                ? "Bạn không có quyền tạo sprint mới"
                : ""
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
                disabled={project?.projectRole === "member"}
              >
                Tạo Sprint mới
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>
      
      {/* Bộ lọc kiểu mới - giống như trang danh sách dự án */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          mb: 2
        }}>
          <Box sx={{ display: 'flex', overflow: 'auto', whiteSpace: 'nowrap' }}>
            <Button
              sx={{
                borderRadius: 0,
                borderBottom: statusFilter === 'all' ? 2 : 0,
                borderColor: statusFilter === 'all' ? 'primary.main' : 'transparent',
                color: statusFilter === 'all' ? 'primary.main' : 'text.primary',
                px: 3,
                py: 1
              }}
              onClick={() => setStatusFilter('all')}
            >
              TẤT CẢ
            </Button>
            <Button
              sx={{
                borderRadius: 0,
                borderBottom: statusFilter === 'planning' ? 2 : 0,
                borderColor: statusFilter === 'planning' ? 'primary.main' : 'transparent',
                color: statusFilter === 'planning' ? 'primary.main' : 'text.primary',
                px: 3,
                py: 1
              }}
              onClick={() => setStatusFilter('planning')}
            >
              LÊN KẾ HOẠCH
            </Button>
            <Button
              sx={{
                borderRadius: 0,
                borderBottom: statusFilter === 'active' ? 2 : 0,
                borderColor: statusFilter === 'active' ? 'primary.main' : 'transparent',
                color: statusFilter === 'active' ? 'primary.main' : 'text.primary',
                px: 3,
                py: 1
              }}
              onClick={() => setStatusFilter('active')}
            >
              ĐANG HOẠT ĐỘNG
            </Button>
            <Button
              sx={{
                borderRadius: 0,
                borderBottom: statusFilter === 'completed' ? 2 : 0,
                borderColor: statusFilter === 'completed' ? 'primary.main' : 'transparent',
                color: statusFilter === 'completed' ? 'primary.main' : 'text.primary',
                px: 3,
                py: 1
              }}
              onClick={() => setStatusFilter('completed')}
            >
              HOÀN THÀNH
            </Button>
            <Button
              sx={{
                borderRadius: 0,
                borderBottom: statusFilter === 'cancelled' ? 2 : 0,
                borderColor: statusFilter === 'cancelled' ? 'primary.main' : 'transparent',
                color: statusFilter === 'cancelled' ? 'primary.main' : 'text.primary',
                px: 3,
                py: 1
              }}
              onClick={() => setStatusFilter('cancelled')}
            >
              ĐÃ HỦY
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {filteredSprints.length === 0 && !loading && !error ? (
        <Card sx={{ minWidth: 275, mb: 2 }}>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              {statusFilter !== 'all' ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    Không tìm thấy sprint nào phù hợp với bộ lọc
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>
                    Dự án chưa có sprint nào.
                  </Typography>
                  {hasManagePermission(project?.projectRole) && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateDialog}
                      disabled={project?.projectRole === "member"}
                      sx={{ mt: 2 }}
                    >
                      Tạo Sprint đầu tiên
                    </Button>
                  )}
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredSprints.map((sprint) => {
            const progress = calculateProgress(sprint.startDate, sprint.endDate);
            const progressColor = getProgressColor(progress, sprint.status);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={sprint._id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 6,
                    },
                    position: "relative",
                    borderTop: `4px solid ${sprint.status === 'planning' ? '#2196f3' : sprint.status === 'active' ? '#4caf50' : '#9c27b0'}`,
                  }}
                >
                  <CardActionArea 
                    onClick={() => handleSprintClick(sprint._id)}
                    sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                        <Chip
                          label={getStatusLabel(sprint.status)}
                          color={getStatusColor(sprint.status)}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        
                        {hasManagePermission(project?.projectRole) && (
                          <ActionButtons
                            canEdit={true}
                            canDelete={true}
                            onEdit={(e) => handleOpenEditDialog(e, sprint)}
                            onDelete={(e) => handleOpenDeleteDialog(e, sprint)}
                            useIcons={true}
                            size="small"
                          />
                        )}
                      </Box>

                      <Typography variant="h6" gutterBottom noWrap title={sprint.name}>
                        {sprint.name}
                      </Typography>

                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          height: '40px',
                        }}
                      >
                        {sprint.description || 'Không có mô tả'}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Tiến độ thời gian
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          color={progressColor}
                          sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary" align="right" display="block">
                          {progress}%
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                          Tiến độ sprint
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={sprint.taskCount?.total > 0 ? (sprint.taskCount.completed / sprint.taskCount.total) * 100 : 0} 
                          color="success"
                          sx={{ height: 8, borderRadius: 4, mb: 0.5 }}
                        />
                        <Typography variant="caption" color="text.secondary" align="right" display="block">
                          {sprint.taskCount?.total > 0 ? 
                            `${Math.round((sprint.taskCount.completed / sprint.taskCount.total) * 100)}% (${sprint.taskCount.completed}/${sprint.taskCount.total})` : 
                            '0% (0/0)'}
                        </Typography>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarTodayIcon
                              fontSize="small"
                              color="action"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <AssignmentIcon
                              fontSize="small"
                              color="action"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {sprint.tasks ? sprint.tasks.length : 0} nhiệm vụ
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={6}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <PersonIcon
                              fontSize="small"
                              color="action"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              {sprint.members ? sprint.members.length : 0} thành viên
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </CardActionArea>
                  <CardActions sx={{ justifyContent: 'center', p: 2, pt: 0 }}>
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      startIcon={<TaskIcon />}
                      onClick={(e) => handleTasksClick(e, sprint._id)}
                      sx={{ width: '100%' }}
                    >
                      XEM CÔNG VIỆC
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <SprintFormDialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        projectId={projectId}
        onSuccess={handleFormSuccess}
      />

      {selectedSprint && (
        <SprintFormDialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          projectId={projectId}
          sprint={selectedSprint}
          onSuccess={handleFormSuccess}
          isEditing
        />
      )}

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa sprint "{selectedSprint?.name}"? Tất cả công
            việc trong sprint này sẽ bị gỡ khỏi sprint.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Hủy</Button>
          <Button onClick={handleDeleteSprint} color="error">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SprintList;
