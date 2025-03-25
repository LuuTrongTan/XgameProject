import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Divider,
  Snackbar,
  Alert,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import { getProjectById } from "../../api/projectApi";
import {
  getProjectTasks,
  createTask,
  updateTaskStatus,
  addTaskComment,
  addTaskAttachment,
  deleteTask,
  updateTask,
} from "../../api/taskApi";
import TaskCard from "../../components/Tasks/TaskCard";

const Tasks = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    assignees: [],
    tags: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching project data for ID:", projectId);

        const projectResult = await getProjectById(projectId);
        console.log("Project Response:", projectResult);

        if (projectResult.success) {
          setProject(projectResult.data);
        } else {
          throw new Error(projectResult.message);
        }

        console.log("Fetching tasks for project:", projectId);
        const tasksResult = await getProjectTasks(projectId);
        console.log("Tasks Response:", tasksResult);

        if (tasksResult.success) {
          const tasksArray = Array.isArray(tasksResult.data)
            ? tasksResult.data
            : [];
          console.log("Processed Tasks Array:", tasksArray);

          if (tasksArray.length === 0) {
            console.log("No tasks found for this project");
          } else {
            console.log("Found tasks:", tasksArray.length);
          }

          // Đảm bảo mỗi task có đầy đủ các trường cần thiết
          const processedTasks = tasksArray.map((task) => ({
            ...task,
            status: task.status || "TODO",
            priority: task.priority || "MEDIUM",
            assignees: task.assignees || [],
            tags: task.tags || [],
            comments: task.comments || [],
            attachments: task.attachments || [],
          }));

          setTasks(processedTasks);
        } else {
          if (tasksResult.isNetworkError) {
            setSnackbar({
              open: true,
              message:
                "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.",
              severity: "error",
            });
          } else {
            throw new Error(tasksResult.message);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbar({
          open: true,
          message: error.message || "Không thể tải dữ liệu",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handlePriorityFilterChange = (event) => {
    setPriorityFilter(event.target.value);
  };

  const handleCreateTask = async () => {
    try {
      const result = await createTask(projectId, newTask);
      if (result.success) {
        setTasks((prevTasks) => [...prevTasks, result.data]);
        setOpenCreateDialog(false);
        setNewTask({
          name: "",
          description: "",
          priority: "MEDIUM",
          status: "TODO",
          dueDate: "",
          assignees: [],
          tags: [],
        });
        setSnackbar({
          open: true,
          message: result.message,
          severity: "success",
        });
      } else {
        setSnackbar({
          open: true,
          message: result.message,
          severity: "error",
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || "Không thể tạo công việc",
        severity: "error",
      });
    }
  };

  const handleEditTask = async () => {
    try {
      const response = await updateTask(selectedTask._id, selectedTask);
      if (response.success) {
        setTasks(
          tasks.map((task) =>
            task._id === selectedTask._id ? response.data : task
          )
        );
        setOpenEditDialog(false);
        setSelectedTask(null);
        showSnackbar("Cập nhật công việc thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await deleteTask(taskId);
      if (response.success) {
        setTasks(tasks.filter((task) => task._id !== taskId));
        showSnackbar("Xóa công việc thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      const response = await addTaskComment(taskId, comment);
      if (response.success) {
        setTasks(
          tasks.map((task) =>
            task._id === taskId
              ? { ...task, comments: [...(task.comments || []), response.data] }
              : task
          )
        );
        showSnackbar("Thêm bình luận thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const handleAddAttachment = async (taskId, file) => {
    try {
      const response = await addTaskAttachment(taskId, file);
      if (response.success) {
        setTasks(
          tasks.map((task) =>
            task._id === taskId
              ? {
                  ...task,
                  attachments: [...(task.attachments || []), response.data],
                }
              : task
          )
        );
        showSnackbar("Đính kèm tệp thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    try {
      const response = await updateTaskStatus(
        draggableId,
        destination.droppableId
      );
      if (response.success) {
        setTasks(
          tasks.map((task) =>
            task._id === draggableId
              ? { ...task, status: destination.droppableId }
              : task
          )
        );
        showSnackbar("Cập nhật trạng thái thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const columns = {
    TODO: {
      title: "Chưa bắt đầu",
      tasks: tasks.filter(
        (task) => task.status === "TODO" || task.status === "todo"
      ),
    },
    IN_PROGRESS: {
      title: "Đang thực hiện",
      tasks: tasks.filter(
        (task) => task.status === "IN_PROGRESS" || task.status === "in_progress"
      ),
    },
    REVIEWING: {
      title: "Đang kiểm tra",
      tasks: tasks.filter(
        (task) => task.status === "REVIEWING" || task.status === "reviewing"
      ),
    },
    DONE: {
      title: "Hoàn thành",
      tasks: tasks.filter(
        (task) => task.status === "DONE" || task.status === "done"
      ),
    },
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={2}
        p={3}
      >
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <IconButton
            onClick={() => navigate(`/projects/${projectId}`)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Công việc - {project?.name}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Tạo công việc mới
        </Button>
      </Box>

      <Box mb={3} display="flex" gap={2}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            label="Trạng thái"
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="TODO">Chưa bắt đầu</MenuItem>
            <MenuItem value="IN_PROGRESS">Đang thực hiện</MenuItem>
            <MenuItem value="REVIEWING">Đang kiểm tra</MenuItem>
            <MenuItem value="DONE">Hoàn thành</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Độ ưu tiên</InputLabel>
          <Select
            value={priorityFilter}
            onChange={handlePriorityFilterChange}
            label="Độ ưu tiên"
          >
            <MenuItem value="all">Tất cả</MenuItem>
            <MenuItem value="LOW">Thấp</MenuItem>
            <MenuItem value="MEDIUM">Trung bình</MenuItem>
            <MenuItem value="HIGH">Cao</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {Object.entries(columns).map(([columnId, column]) => (
            <Grid item xs={12} md={3} key={columnId}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {column.title} ({column.tasks.length})
                  </Typography>
                  <Droppable droppableId={columnId}>
                    {(provided) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        sx={{ minHeight: 200 }}
                      >
                        {column.tasks.map((task, index) => (
                          <TaskCard
                            key={task._id}
                            task={task}
                            index={index}
                            onEdit={(task) => {
                              setSelectedTask(task);
                              setOpenEditDialog(true);
                            }}
                            onDelete={handleDeleteTask}
                            onAddComment={handleAddComment}
                            onAddAttachment={handleAddAttachment}
                          />
                        ))}
                        {provided.placeholder}
                      </Box>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DragDropContext>

      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Tạo công việc mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tiêu đề"
              fullWidth
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
            />
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              rows={4}
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Độ ưu tiên</InputLabel>
              <Select
                value={newTask.priority}
                label="Độ ưu tiên"
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
              >
                <MenuItem value="LOW">Thấp</MenuItem>
                <MenuItem value="MEDIUM">Trung bình</MenuItem>
                <MenuItem value="HIGH">Cao</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ngày hết hạn"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newTask.dueDate}
              onChange={(e) =>
                setNewTask({ ...newTask, dueDate: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Người thực hiện</InputLabel>
              <Select
                multiple
                value={newTask.assignees}
                label="Người thực hiện"
                onChange={(e) =>
                  setNewTask({ ...newTask, assignees: e.target.value })
                }
              >
                {project?.members?.map((member) => (
                  <MenuItem key={member._id} value={member._id}>
                    {member.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Tags (phân tách bằng dấu phẩy)"
              fullWidth
              value={newTask.tags.join(", ")}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  tags: e.target.value.split(",").map((tag) => tag.trim()),
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Hủy</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Tạo
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chỉnh sửa công việc</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tiêu đề"
              fullWidth
              value={selectedTask?.name || ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, name: e.target.value })
              }
            />
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              rows={4}
              value={selectedTask?.description || ""}
              onChange={(e) =>
                setSelectedTask({
                  ...selectedTask,
                  description: e.target.value,
                })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Độ ưu tiên</InputLabel>
              <Select
                value={selectedTask?.priority || "MEDIUM"}
                label="Độ ưu tiên"
                onChange={(e) =>
                  setSelectedTask({ ...selectedTask, priority: e.target.value })
                }
              >
                <MenuItem value="LOW">Thấp</MenuItem>
                <MenuItem value="MEDIUM">Trung bình</MenuItem>
                <MenuItem value="HIGH">Cao</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Ngày hết hạn"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={selectedTask?.dueDate || ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, dueDate: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Người thực hiện</InputLabel>
              <Select
                multiple
                value={selectedTask?.assignees || []}
                label="Người thực hiện"
                onChange={(e) =>
                  setSelectedTask({
                    ...selectedTask,
                    assignees: e.target.value,
                  })
                }
              >
                {project?.members?.map((member) => (
                  <MenuItem key={member._id} value={member._id}>
                    {member.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Tags (phân tách bằng dấu phẩy)"
              fullWidth
              value={selectedTask?.tags?.join(", ") || ""}
              onChange={(e) =>
                setSelectedTask({
                  ...selectedTask,
                  tags: e.target.value.split(",").map((tag) => tag.trim()),
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Hủy</Button>
          <Button onClick={handleEditTask} variant="contained">
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Tasks;
