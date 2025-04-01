import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Card,
  CardContent,
  Grid,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useSnackbar } from "notistack";
import { getSprintById } from "../../api/sprintApi";
import {
  getSprintTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../../api/taskApi";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import TaskCard from "../../components/Tasks/TaskCard";

const SprintTasks = () => {
  const { projectId, sprintId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const [sprint, setSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openMoveTaskDialog, setOpenMoveTaskDialog] = useState(false);
  const [unassignedTasks, setUnassignedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    assignees: [],
  });

  // Tải dữ liệu
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Lấy thông tin sprint
        const sprintResult = await getSprintById(projectId, sprintId);
        if (sprintResult.success) {
          setSprint(sprintResult.data);

          if (sprintResult.data.tasks) {
            setTasks(sprintResult.data.tasks);
          }
        } else {
          throw new Error(
            sprintResult.message || "Không thể tải thông tin sprint"
          );
        }

        // Lấy danh sách các task không thuộc sprint nào để có thể thêm vào
        const tasksResult = await getSprintTasks(projectId, sprintId);
        if (tasksResult.success) {
          const projectTasks = tasksResult.data || [];
          // Lọc ra các task không thuộc sprint nào
          const unassigned = projectTasks.filter((task) => !task.sprint);
          setUnassignedTasks(unassigned);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, sprintId]);

  // Xử lý input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Tạo task mới
  const handleCreateTask = async () => {
    try {
      // Kiểm tra xem có sprintId không
      if (!sprintId) {
        enqueueSnackbar("Không thể tạo công việc: Sprint ID không hợp lệ", { variant: "error" });
        console.error("Sprint ID is missing or invalid:", sprintId);
        return;
      }
      
      // Log để debug
      console.log("Creating task with sprint ID:", sprintId);
      
      const taskData = {
        ...newTask,
        projectId,
        sprint: sprintId,
      };

      const result = await createTask(projectId, sprintId, taskData);

      if (result.success) {
        enqueueSnackbar("Công việc đã được tạo thành công", {
          variant: "success",
        });
        setTasks((prev) => [...prev, result.data]);
        setOpenCreateDialog(false);
        setNewTask({
          title: "",
          description: "",
          priority: "medium",
          status: "todo",
          dueDate: "",
          assignees: [],
        });
      } else {
        enqueueSnackbar(result.message || "Không thể tạo công việc", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error creating task:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi tạo công việc", { variant: "error" });
    }
  };

  // Xử lý xóa task
  const handleDeleteTask = async (taskId) => {
    try {
      const result = await deleteTask(taskId);

      if (result.success) {
        enqueueSnackbar("Công việc đã được xóa thành công", {
          variant: "success",
        });
        setTasks((prev) => prev.filter((task) => task._id !== taskId));
      } else {
        enqueueSnackbar(result.message || "Không thể xóa công việc", {
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi xóa công việc", { variant: "error" });
    }
  };

  // Mở dialog thêm task có sẵn vào sprint
  const handleOpenMoveTaskDialog = () => {
    setOpenMoveTaskDialog(true);
  };

  // Thêm task có sẵn vào sprint
  const handleAddTaskToSprint = async () => {
    if (!selectedTask) {
      enqueueSnackbar("Vui lòng chọn một công việc", { variant: "warning" });
      return;
    }

    try {
      const result = await updateTask(selectedTask, { sprint: sprintId });

      if (result.success) {
        enqueueSnackbar("Công việc đã được thêm vào sprint", {
          variant: "success",
        });

        // Cập nhật danh sách task
        const taskData = result.data;
        setTasks((prev) => [...prev, taskData]);

        // Xóa task khỏi danh sách unassigned
        setUnassignedTasks((prev) =>
          prev.filter((task) => task._id !== selectedTask)
        );

        setOpenMoveTaskDialog(false);
        setSelectedTask(null);
      } else {
        enqueueSnackbar(
          result.message || "Không thể thêm công việc vào sprint",
          { variant: "error" }
        );
      }
    } catch (error) {
      console.error("Error adding task to sprint:", error);
      enqueueSnackbar("Đã xảy ra lỗi khi thêm công việc vào sprint", {
        variant: "error",
      });
    }
  };

  // Helper để định dạng ngày
  const formatDate = (date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: vi });
  };

  // Helper để lấy label trạng thái task
  const getTaskStatusLabel = (status) => {
    switch (status) {
      case "todo":
        return "Chưa bắt đầu";
      case "inProgress":
        return "Đang thực hiện";
      case "review":
        return "Đang kiểm tra";
      case "done":
        return "Hoàn thành";
      default:
        return "Chưa bắt đầu";
    }
  };

  // Helper để lấy màu trạng thái task
  const getTaskStatusColor = (status) => {
    switch (status) {
      case "todo":
        return { bg: "#e3f2fd", color: "#1976d2" };
      case "inProgress":
        return { bg: "#fff8e1", color: "#f57c00" };
      case "review":
        return { bg: "#f3e5f5", color: "#7b1fa2" };
      case "done":
        return { bg: "#e8f5e9", color: "#2e7d32" };
      default:
        return { bg: "#f5f5f5", color: "#757575" };
    }
  };

  // Helper để lấy label ưu tiên
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "low":
        return "Thấp";
      case "medium":
        return "Trung bình";
      case "high":
        return "Cao";
      default:
        return "Trung bình";
    }
  };

  // Helper để lấy màu ưu tiên
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "low":
        return { bg: "#e8f5e9", color: "#2e7d32" };
      case "medium":
        return { bg: "#fff8e1", color: "#f57c00" };
      case "high":
        return { bg: "#ffebee", color: "#c62828" };
      default:
        return { bg: "#fff8e1", color: "#f57c00" };
    }
  };

  // Hiển thị loading
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="70vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <IconButton
            onClick={() => navigate(`/projects/${projectId}/sprints`)}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" ml={1}>
            {sprint?.name} - Công việc
          </Typography>
        </Box>

        <Box>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenMoveTaskDialog}
            sx={{ mr: 2 }}
          >
            Thêm công việc có sẵn
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
          >
            Tạo công việc mới
          </Button>
        </Box>
      </Box>

      {/* Thông tin sprint */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Thông tin Sprint
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Khoảng thời gian:</strong>{" "}
                {formatDate(sprint?.startDate)} - {formatDate(sprint?.endDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Trạng thái:</strong>{" "}
                {sprint?.status === "planning"
                  ? "Lên kế hoạch"
                  : sprint?.status === "active"
                  ? "Đang hoạt động"
                  : "Hoàn thành"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Mục tiêu:</strong>{" "}
                {sprint?.goal || "Không có mục tiêu cụ thể"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Tiến độ công việc
              </Typography>
              <Box display="flex" alignItems="center" my={1}>
                <Box
                  sx={{ position: "relative", display: "inline-flex", mr: 2 }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={
                      tasks.length
                        ? (tasks.filter((task) => task.status === "done")
                            .length /
                            tasks.length) *
                          100
                        : 0
                    }
                    size={60}
                    thickness={5}
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: "absolute",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      component="div"
                      color="text.secondary"
                    >
                      {Math.round(
                        tasks.length
                          ? (tasks.filter((task) => task.status === "done")
                              .length /
                              tasks.length) *
                              100
                          : 0
                      )}
                      %
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2">
                    <strong>Hoàn thành:</strong>{" "}
                    {tasks.filter((task) => task.status === "done").length}/
                    {tasks.length} công việc
                  </Typography>
                  <Typography variant="body2">
                    <strong>Còn lại:</strong>{" "}
                    {tasks.length -
                      tasks.filter((task) => task.status === "done")
                        .length}{" "}
                    công việc
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Danh sách công việc */}
      {tasks.length === 0 ? (
        <Alert severity="info" sx={{ my: 2 }}>
          Sprint này chưa có công việc nào. Hãy thêm công việc để bắt đầu.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {tasks.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task._id}>
              <Card
                sx={{
                  height: "100%",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 3,
                  },
                }}
                onClick={() =>
                  navigate(`/projects/${projectId}/tasks/${task._id}`)
                }
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Chip
                      label={getTaskStatusLabel(task.status)}
                      size="small"
                      sx={{
                        bgcolor: getTaskStatusColor(task.status).bg,
                        color: getTaskStatusColor(task.status).color,
                      }}
                    />
                    <Chip
                      label={getPriorityLabel(task.priority)}
                      size="small"
                      sx={{
                        bgcolor: getPriorityColor(task.priority).bg,
                        color: getPriorityColor(task.priority).color,
                      }}
                    />
                  </Box>

                  <Typography variant="h6" gutterBottom>
                    {task.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      height: "60px",
                    }}
                  >
                    {task.description}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      {task.dueDate && (
                        <Typography variant="caption" color="text.secondary">
                          Hạn: {formatDate(task.dueDate)}
                        </Typography>
                      )}
                    </Box>

                    <Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${projectId}/tasks/${task._id}`);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>

                      {hasPermission("delete_task") && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                "Bạn có chắc chắn muốn xóa công việc này?"
                              )
                            ) {
                              handleDeleteTask(task._id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog tạo task mới */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Tạo công việc mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Tiêu đề"
            type="text"
            fullWidth
            value={newTask.title}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            name="description"
            label="Mô tả"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={newTask.description}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  name="status"
                  value={newTask.status}
                  onChange={handleInputChange}
                  label="Trạng thái"
                >
                  <MenuItem value="todo">Chưa bắt đầu</MenuItem>
                  <MenuItem value="inProgress">Đang thực hiện</MenuItem>
                  <MenuItem value="review">Đang kiểm tra</MenuItem>
                  <MenuItem value="done">Hoàn thành</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Độ ưu tiên</InputLabel>
                <Select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleInputChange}
                  label="Độ ưu tiên"
                >
                  <MenuItem value="low">Thấp</MenuItem>
                  <MenuItem value="medium">Trung bình</MenuItem>
                  <MenuItem value="high">Cao</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            margin="dense"
            name="dueDate"
            label="Hạn hoàn thành"
            type="date"
            fullWidth
            value={newTask.dueDate}
            onChange={handleInputChange}
            InputLabelProps={{ shrink: true }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Hủy</Button>
          <Button
            onClick={handleCreateTask}
            variant="contained"
            disabled={!newTask.title || !newTask.description}
          >
            Tạo công việc
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm task có sẵn */}
      <Dialog
        open={openMoveTaskDialog}
        onClose={() => setOpenMoveTaskDialog(false)}
      >
        <DialogTitle>Thêm công việc có sẵn vào Sprint</DialogTitle>
        <DialogContent>
          {unassignedTasks.length === 0 ? (
            <Typography>
              Không có công việc nào khả dụng để thêm vào sprint.
            </Typography>
          ) : (
            <>
              <Typography gutterBottom>Chọn công việc từ danh sách:</Typography>
              <FormControl fullWidth margin="dense">
                <InputLabel>Công việc</InputLabel>
                <Select
                  value={selectedTask || ""}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  label="Công việc"
                >
                  {unassignedTasks.map((task) => (
                    <MenuItem key={task._id} value={task._id}>
                      {task.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMoveTaskDialog(false)}>Hủy</Button>
          <Button
            onClick={handleAddTaskToSprint}
            variant="contained"
            disabled={!selectedTask || unassignedTasks.length === 0}
          >
            Thêm vào Sprint
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SprintTasks;
