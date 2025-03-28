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
  Avatar,
  AvatarGroup,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import axios from "axios";
import { useSnackbar } from "notistack";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import ActionButtons from "../../components/common/ActionButtons";

// Định nghĩa labels và colors cho các mức độ ưu tiên
const priorityLabels = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const priorityColors = {
  low: "#4caf50", // Xanh lá
  medium: "#ff9800", // Cam
  high: "#f44336", // Đỏ
};

const Tasks = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { canDeleteTask, canEditTask } = usePermissions();
  const [tasks, setTasks] = useState({
    todo: [],
    inProgress: [],
    review: [],
    done: [],
  });
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [newTask, setNewTask] = useState({
    name: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    assignees: [],
    tags: [],
  });
  const [newComment, setNewComment] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [detailView, setDetailView] = useState("comments");
  const [activeId, setActiveId] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);

  // Initialize sensors at the top level
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching project data for ID:", projectId);

        const projectResult = await getProjectById(projectId);
        console.log("Project Response:", projectResult);

        if (projectResult.success) {
          const projectData = projectResult.data;
          setProject(projectData);
          console.log("Project data set:", projectData);
          console.log("Project members:", projectData.members);
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
            status: task.status || "todo",
            priority: task.priority || "medium",
            assignees: task.assignees || [],
            tags: task.tags || [],
            comments: task.comments || [],
            attachments: task.attachments || [],
          }));

          setTasks({
            todo: processedTasks.filter((task) => task.status === "todo"),
            inProgress: processedTasks.filter(
              (task) => task.status === "inProgress"
            ),
            review: processedTasks.filter((task) => task.status === "review"),
            done: processedTasks.filter((task) => task.status === "done"),
          });
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
        setTasks((prevTasks) => ({
          ...prevTasks,
          todo: [...prevTasks.todo, result.data],
        }));
        setOpenCreateDialog(false);
        setNewTask({
          name: "",
          description: "",
          priority: "medium",
          status: "todo",
          dueDate: "",
          assignees: [],
          tags: [],
        });
        showSnackbar(result.message);
      } else {
        showSnackbar(result.message, "error");
      }
    } catch (error) {
      showSnackbar(error.message || "Không thể tạo công việc", "error");
    }
  };

  const handleEditTask = async () => {
    try {
      const response = await updateTask(selectedTask._id, selectedTask);
      if (response.success) {
        setTasks((prevTasks) => ({
          ...prevTasks,
          todo: prevTasks.todo.map((task) =>
            task._id === selectedTask._id ? response.data : task
          ),
          inProgress: prevTasks.inProgress.map((task) =>
            task._id === selectedTask._id ? response.data : task
          ),
          review: prevTasks.review.map((task) =>
            task._id === selectedTask._id ? response.data : task
          ),
          done: prevTasks.done.map((task) =>
            task._id === selectedTask._id ? response.data : task
          ),
        }));
        setOpenEditDialog(false);
        setSelectedTask(null);
        showSnackbar("Cập nhật công việc thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    // Tìm task từ tất cả các danh sách
    const taskToDelete = [
      ...tasks.todo,
      ...tasks.inProgress,
      ...tasks.review,
      ...tasks.done,
    ].find((task) => task._id === taskId);

    if (!taskToDelete) {
      showSnackbar("Không tìm thấy công việc này", "error");
      return;
    }

    console.log("Tasks.jsx - Deleting task:", taskToDelete);
    console.log("Tasks.jsx - Project data:", project);

    // Kiểm tra quyền xóa task
    if (!canDeleteTask(taskToDelete, project)) {
      console.log("Tasks.jsx - Permission denied for deleting task");
      showSnackbar(
        "Bạn không có quyền xóa công việc này. Chỉ Admin, Project Manager hoặc người tạo task (khi chưa được gán) mới có thể xóa.",
        "error"
      );
      return;
    }

    console.log("Tasks.jsx - Permission granted for deleting task");

    try {
      const response = await deleteTask(taskId);
      if (response.success) {
        setTasks((prevTasks) => ({
          ...prevTasks,
          todo: prevTasks.todo.filter((task) => task._id !== taskId),
          inProgress: prevTasks.inProgress.filter(
            (task) => task._id !== taskId
          ),
          review: prevTasks.review.filter((task) => task._id !== taskId),
          done: prevTasks.done.filter((task) => task._id !== taskId),
        }));
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
        setTasks((prevTasks) => ({
          ...prevTasks,
          todo: prevTasks.todo.map((task) =>
            task._id === taskId
              ? { ...task, comments: [...(task.comments || []), response.data] }
              : task
          ),
          inProgress: prevTasks.inProgress.map((task) =>
            task._id === taskId
              ? { ...task, comments: [...(task.comments || []), response.data] }
              : task
          ),
          review: prevTasks.review.map((task) =>
            task._id === taskId
              ? { ...task, comments: [...(task.comments || []), response.data] }
              : task
          ),
          done: prevTasks.done.map((task) =>
            task._id === taskId
              ? { ...task, comments: [...(task.comments || []), response.data] }
              : task
          ),
        }));
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
        setTasks((prevTasks) => ({
          ...prevTasks,
          todo: prevTasks.todo.map((task) =>
            task._id === taskId
              ? {
                  ...task,
                  attachments: [...(task.attachments || []), response.data],
                }
              : task
          ),
          inProgress: prevTasks.inProgress.map((task) =>
            task._id === taskId
              ? {
                  ...task,
                  attachments: [...(task.attachments || []), response.data],
                }
              : task
          ),
          review: prevTasks.review.map((task) =>
            task._id === taskId
              ? {
                  ...task,
                  attachments: [...(task.attachments || []), response.data],
                }
              : task
          ),
          done: prevTasks.done.map((task) =>
            task._id === taskId
              ? {
                  ...task,
                  attachments: [...(task.attachments || []), response.data],
                }
              : task
          ),
        }));
        showSnackbar("Đính kèm tệp thành công");
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    }
  };

  const fetchTasks = async () => {
    try {
      const tasksResult = await getProjectTasks(projectId);
      if (tasksResult.success) {
        const tasksArray = Array.isArray(tasksResult.data)
          ? tasksResult.data
          : [];
        const processedTasks = tasksArray.map((task) => ({
          ...task,
          status: task.status || "todo",
          priority: task.priority || "medium",
          assignees: task.assignees || [],
          tags: task.tags || [],
          comments: task.comments || [],
          attachments: task.attachments || [],
        }));

        setTasks({
          todo: processedTasks.filter((task) => task.status === "todo"),
          inProgress: processedTasks.filter(
            (task) => task.status === "inProgress"
          ),
          review: processedTasks.filter((task) => task.status === "review"),
          done: processedTasks.filter((task) => task.status === "done"),
        });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      enqueueSnackbar("Không thể tải danh sách công việc", {
        variant: "error",
      });
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!active || !over) return;

    const taskId = active.id;
    const sourceContainer = active.data.current.container;
    const destinationContainer = over.data.current?.container;

    // Nếu kéo thả trong cùng một container, cập nhật vị trí
    if (sourceContainer === destinationContainer) {
      setTasks((prev) => {
        const updatedTasks = { ...prev };
        const container = sourceContainer;
        const oldIndex = updatedTasks[container].findIndex(
          (task) => task._id === taskId
        );
        const newIndex = updatedTasks[container].findIndex(
          (task) => task._id === over.id
        );

        // Di chuyển task đến vị trí mới
        const [movedTask] = updatedTasks[container].splice(oldIndex, 1);
        updatedTasks[container].splice(newIndex, 0, movedTask);

        return updatedTasks;
      });
      return;
    }

    // Nếu kéo thả sang container khác
    try {
      // Optimistically update UI
      setTasks((prev) => {
        const updatedTasks = { ...prev };
        const taskIndex = updatedTasks[sourceContainer].findIndex(
          (task) => task._id === taskId
        );

        if (taskIndex !== -1) {
          const [movedTask] = updatedTasks[sourceContainer].splice(
            taskIndex,
            1
          );
          movedTask.status = destinationContainer;

          // Tìm vị trí thả trong container đích
          const destinationIndex = updatedTasks[destinationContainer].findIndex(
            (task) => task._id === over.id
          );

          // Nếu không tìm thấy vị trí thả (thả vào khoảng trống), thêm vào cuối
          if (destinationIndex === -1) {
            updatedTasks[destinationContainer].push(movedTask);
          } else {
            // Chèn task vào vị trí thả
            updatedTasks[destinationContainer].splice(
              destinationIndex,
              0,
              movedTask
            );
          }
        }

        return updatedTasks;
      });

      // Update task status in the backend
      const result = await updateTaskStatus(taskId, destinationContainer);

      if (result.success) {
        enqueueSnackbar(result.message, { variant: "success" });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      enqueueSnackbar(
        error.message || "Không thể cập nhật trạng thái. Vui lòng thử lại.",
        {
          variant: "error",
        }
      );
      // Revert the change if the API call fails
      fetchTasks();
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    if (active) {
      setActiveId(active.id);
      setActiveContainer(active.data.current.container);
    }
  };

  // Render task card với button từ ActionButtons
  const renderTaskCards = (columnTasks, status) => {
    return columnTasks.map((task) => (
      <Box
        key={task._id}
        sx={{
          position: "relative",
          "& .action-buttons": {
            opacity: 0,
            transition: "opacity 0.2s",
          },
          "&:hover .action-buttons": {
            opacity: 1,
          },
        }}
      >
        <TaskCard
          key={task._id}
          task={task}
          container={status}
          project={project}
          onEdit={(task) => {
            setSelectedTask(task);
            setOpenEditDialog(true);
          }}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          actionButtons={
            <Box
              className="action-buttons"
              sx={{ position: "absolute", top: 5, right: 5, zIndex: 2 }}
            >
              <ActionButtons
                canEdit={canEditTask ? canEditTask(task, project) : true}
                canDelete={canDeleteTask ? canDeleteTask(task, project) : true}
                onEdit={() => {
                  setSelectedTask(task);
                  setOpenEditDialog(true);
                }}
                onDelete={() => handleDeleteTask(task._id)}
                editTooltip="Bạn không có quyền chỉnh sửa công việc này"
                deleteTooltip="Bạn không có quyền xóa công việc này"
                useIcons={true}
                size="small"
              />
            </Box>
          }
        />
      </Box>
    ));
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
            <MenuItem value="todo">Chưa bắt đầu</MenuItem>
            <MenuItem value="inProgress">Đang thực hiện</MenuItem>
            <MenuItem value="review">Đang kiểm tra</MenuItem>
            <MenuItem value="done">Hoàn thành</MenuItem>
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
            <MenuItem value="low">Thấp</MenuItem>
            <MenuItem value="medium">Trung bình</MenuItem>
            <MenuItem value="high">Cao</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card
              sx={{
                minHeight: "calc(100vh - 300px)",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid rgba(66, 165, 245, 0.2)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 12px 32px rgba(66, 165, 245, 0.15)",
                  border: "1px solid rgba(66, 165, 245, 0.4)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(66, 165, 245, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#1976d2",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.todo.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Chưa bắt đầu
                  </Typography>
                </Box>
                <SortableContext
                  items={tasks.todo.map((task) => task._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderTaskCards(tasks.todo, "todo")}
                </SortableContext>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card
              sx={{
                minHeight: "calc(100vh - 300px)",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid rgba(255, 152, 0, 0.2)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 12px 32px rgba(255, 152, 0, 0.15)",
                  border: "1px solid rgba(255, 152, 0, 0.4)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 152, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#f57c00",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.inProgress.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Đang thực hiện
                  </Typography>
                </Box>
                <SortableContext
                  items={tasks.inProgress.map((task) => task._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderTaskCards(tasks.inProgress, "inProgress")}
                </SortableContext>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card
              sx={{
                minHeight: "calc(100vh - 300px)",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid rgba(171, 71, 188, 0.2)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 12px 32px rgba(171, 71, 188, 0.15)",
                  border: "1px solid rgba(171, 71, 188, 0.4)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(171, 71, 188, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#7b1fa2",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.review.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Đang kiểm tra
                  </Typography>
                </Box>
                <SortableContext
                  items={tasks.review.map((task) => task._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderTaskCards(tasks.review, "review")}
                </SortableContext>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card
              sx={{
                minHeight: "calc(100vh - 300px)",
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                border: "1px solid rgba(76, 175, 80, 0.2)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 12px 32px rgba(76, 175, 80, 0.15)",
                  border: "1px solid rgba(76, 175, 80, 0.4)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(76, 175, 80, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#2e7d32",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.done.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Hoàn thành
                  </Typography>
                </Box>
                <SortableContext
                  items={tasks.done.map((task) => task._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderTaskCards(tasks.done, "done")}
                </SortableContext>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <DragOverlay>
          {activeId ? (
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                border: "2px solid #1976d2",
                transform: "rotate(2deg)",
                cursor: "grabbing",
                width: "300px",
                zIndex: 9999,
                opacity: 0.9,
                transition: "all 0.2s ease",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 1,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 600, fontSize: "0.95rem" }}
                >
                  {
                    tasks[activeContainer]?.find(
                      (task) => task._id === activeId
                    )?.name
                  }
                </Typography>
                <Chip
                  size="small"
                  label={
                    priorityLabels[
                      tasks[activeContainer]?.find(
                        (task) => task._id === activeId
                      )?.priority
                    ]
                  }
                  sx={{
                    backgroundColor: `${
                      priorityColors[
                        tasks[activeContainer]?.find(
                          (task) => task._id === activeId
                        )?.priority
                      ]
                    }20`,
                    color:
                      priorityColors[
                        tasks[activeContainer]?.find(
                          (task) => task._id === activeId
                        )?.priority
                      ],
                    fontWeight: 500,
                    fontSize: "0.75rem",
                  }}
                />
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: "#6c757d",
                  fontSize: "0.85rem",
                  mb: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {
                  tasks[activeContainer]?.find((task) => task._id === activeId)
                    ?.description
                }
              </Typography>

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Chip
                  icon={<span style={{ fontSize: "1rem" }}>🕒</span>}
                  label={
                    tasks[activeContainer]?.find(
                      (task) => task._id === activeId
                    )?.dueDate
                      ? format(
                          new Date(
                            tasks[activeContainer]?.find(
                              (task) => task._id === activeId
                            )?.dueDate
                          ),
                          "dd/MM/yyyy",
                          { locale: vi }
                        )
                      : "Chưa có hạn"
                  }
                  size="small"
                  sx={{
                    backgroundColor: "#f8f9fa",
                    color: "#495057",
                    fontWeight: 500,
                    fontSize: "0.75rem",
                    height: "24px",
                    border: "1px solid #e9ecef",
                  }}
                />
              </Box>

              {tasks[activeContainer]?.find((task) => task._id === activeId)
                ?.assignees?.length > 0 && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AvatarGroup
                    max={3}
                    sx={{
                      "& .MuiAvatar-root": {
                        width: 24,
                        height: 24,
                        fontSize: "0.75rem",
                      },
                    }}
                  >
                    {tasks[activeContainer]
                      ?.find((task) => task._id === activeId)
                      ?.assignees.map((assignee) => (
                        <Avatar
                          key={assignee._id}
                          alt={assignee.fullName}
                          src={assignee.avatar}
                          sx={{
                            backgroundColor: "#e9ecef",
                            color: "#495057",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                          }}
                        >
                          {assignee.fullName.charAt(0)}
                        </Avatar>
                      ))}
                  </AvatarGroup>
                </Box>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
                <MenuItem value="low">Thấp</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="high">Cao</MenuItem>
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
                value={selectedTask?.priority || "medium"}
                label="Độ ưu tiên"
                onChange={(e) =>
                  setSelectedTask({ ...selectedTask, priority: e.target.value })
                }
              >
                <MenuItem value="low">Thấp</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="high">Cao</MenuItem>
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
