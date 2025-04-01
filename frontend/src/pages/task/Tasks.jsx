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
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem, 
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction,
  InputAdornment,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import CommentIcon from "@mui/icons-material/Comment";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import HistoryIcon from "@mui/icons-material/History";
import SendIcon from "@mui/icons-material/Send";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getProjectById } from "../../api/projectApi";
import {
  getSprintTasks,
  createTask,
  updateTaskStatus,
  addTaskComment,
  addTaskAttachment,
  deleteTask,
  updateTask,
  getTaskComments,
  getTaskAttachments,
  getTaskAuditLogs
} from "../../api/taskApi";
import { getSprintMembers } from "../../api/sprintApi";
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
  const [viewMode, setViewMode] = useState("kanban");
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [sprintId, setSprintId] = useState("");
  const [sprints, setSprints] = useState([]);
  const [sprintMembers, setSprintMembers] = useState([]);
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
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [taskComments, setTaskComments] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = React.useRef();

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

        // Kiểm tra nếu có tham số sprint trong URL
        const urlParams = new URLSearchParams(window.location.search);
        const sprintIdFromUrl = urlParams.get('sprint');
        
        if (sprintIdFromUrl) {
          console.log("Found sprint ID in URL:", sprintIdFromUrl);
          setSprintId(sprintIdFromUrl);
        }

        const projectResult = await getProjectById(projectId);
        console.log("Project Response:", projectResult);

        if (projectResult.success) {
          const projectData = projectResult.data;
          setProject(projectData);
          console.log("Project data set:", projectData);
          console.log("Project members:", projectData.members);
          
          // Chỉ tìm sprint từ dự án nếu không có sprint ID trong URL
          if (!sprintIdFromUrl && projectData.sprints && projectData.sprints.length > 0) {
            const activeSprint = projectData.sprints.find(sprint => sprint.status === 'active');
            if (activeSprint) {
              setSprintId(activeSprint._id);
              console.log("Active sprint found:", activeSprint._id);
            } else {
              // Use most recent sprint if no active sprint
              const latestSprint = projectData.sprints[projectData.sprints.length - 1];
              setSprintId(latestSprint._id);
              console.log("Using latest sprint:", latestSprint._id);
            }
            setSprints(projectData.sprints);
          } else if (!sprintIdFromUrl) {
            console.log("No sprints found for this project");
            // Thay đổi: Không dùng 'default' nữa, hiển thị thông báo yêu cầu tạo sprint
            setError("Dự án này chưa có sprint nào. Vui lòng tạo sprint trước khi thêm công việc.");
            setLoading(false);
            
          }
        } else {
          throw new Error(projectResult.message);
        }

        // Đảm bảo đã có sprintId trước khi gọi API
        const currentSprintId = sprintIdFromUrl || sprintId;
        if (!currentSprintId) {
          console.log("No sprint ID available to fetch tasks");
          setLoading(false);
          return;
        }

        console.log("Fetching tasks for project:", projectId, "and sprint:", currentSprintId);
        const tasksResult = await getSprintTasks(projectId, currentSprintId);
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

  // Add a useEffect to fetch tasks when sprintId changes
  useEffect(() => {
    if (projectId && sprintId) {
      console.log("Sprint ID changed, fetching tasks for sprint:", sprintId);
      fetchTasks();
      fetchSprintMembers(projectId, sprintId);
    }
  }, [sprintId]);

  // Thêm useEffect khi dialog mở để đảm bảo có dữ liệu thành viên sprint
  useEffect(() => {
    if ((openCreateDialog || openEditDialog) && projectId && sprintId && sprintMembers.length === 0) {
      fetchSprintMembers(projectId, sprintId);
    }
  }, [openCreateDialog, openEditDialog]);

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
      // Kiểm tra xem có sprintId không và đảm bảo không phải là 'default'
      if (!sprintId || sprintId === 'default') {
        showSnackbar("Không thể tạo công việc: Vui lòng tạo sprint trước", "error");
        console.error("Sprint ID is missing or invalid:", sprintId);
        return;
      }
      
      // Log để debug
      console.log("Creating task with sprint ID:", sprintId);
      console.log("Task data being sent:", JSON.stringify(newTask, null, 2));
      
      // Chuẩn bị dữ liệu task format đúng cho API
      const taskPayload = {
        title: newTask.name,
        description: newTask.description || "Mô tả công việc",
        priority: newTask.priority,
        status: newTask.status,
        dueDate: newTask.dueDate || null,
        assignees: newTask.assignees || [],
        tags: newTask.tags || [],
        projectId: projectId,
        sprint: sprintId
      };
      
      console.log("Formatted task payload:", JSON.stringify(taskPayload, null, 2));
      
      const result = await createTask(projectId, sprintId, taskPayload);
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
      console.error("Error creating task:", error);
      showSnackbar(error.message || "Không thể tạo công việc", "error");
    }
  };

  const handleEditTask = async () => {
    try {
      if (!projectId || !sprintId || !selectedTask?._id) {
        console.error("Missing required parameters for updating task:", { 
          projectId, 
          sprintId, 
          taskId: selectedTask?._id 
        });
        showSnackbar("Không thể cập nhật công việc: Thiếu thông tin", "error");
        return;
      }

      console.log("Updating task with params:", { 
        projectId, 
        sprintId, 
        taskId: selectedTask._id,
        taskData: selectedTask
      });
      
      const response = await updateTask(projectId, sprintId, selectedTask._id, selectedTask);
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
      console.error("Error updating task:", err);
      showSnackbar(err.message || "Lỗi khi cập nhật công việc", "error");
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
      // Đảm bảo truyền đủ tham số cho API deleteTask
      if (!projectId || !sprintId) {
        console.error("Missing projectId or sprintId for deleteTask:", { projectId, sprintId, taskId });
        showSnackbar("Không thể xóa công việc: Thiếu thông tin dự án hoặc sprint", "error");
        return;
      }

      console.log("Deleting task with params:", { projectId, sprintId, taskId });
      const response = await deleteTask(projectId, sprintId, taskId);
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
      console.error("Error deleting task:", err);
      showSnackbar(err.message || "Lỗi khi xóa công việc", "error");
    }
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      if (!projectId || !sprintId || !taskId) {
        console.error("Missing required parameters for adding comment:", { projectId, sprintId, taskId });
        showSnackbar("Không thể thêm bình luận: Thiếu thông tin cần thiết", "error");
        return;
      }

      console.log("Adding comment with params:", { projectId, sprintId, taskId, comment });
      const response = await addTaskComment(projectId, sprintId, taskId, comment);
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
      console.error("Error adding comment:", err);
      showSnackbar(err.message || "Lỗi khi thêm bình luận", "error");
    }
  };

  const handleAddAttachment = async (taskId, file) => {
    try {
      if (!projectId || !sprintId || !taskId) {
        console.error("Missing required parameters for adding attachment:", { projectId, sprintId, taskId });
        showSnackbar("Không thể đính kèm tệp: Thiếu thông tin cần thiết", "error");
        return;
      }

      console.log("Adding attachment with params:", { projectId, sprintId, taskId, file });
      const response = await addTaskAttachment(projectId, sprintId, taskId, file);
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
      console.error("Error adding attachment:", err);
      showSnackbar(err.message || "Lỗi khi đính kèm tệp", "error");
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      console.log("Fetching tasks for project:", projectId, "and sprint:", sprintId);
      
      if (!sprintId) {
        console.error("Cannot fetch tasks: Sprint ID is missing");
        setLoading(false);
        return;
      }
      
      const tasksResult = await getSprintTasks(projectId, sprintId);
      console.log("Tasks Response:", tasksResult);
      
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
      } else {
        console.error("Failed to fetch tasks:", tasksResult.message);
        setSnackbar({
          open: true,
          message: tasksResult.message || "Không thể tải danh sách công việc",
          severity: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setSnackbar({
        open: true,
        message: error.message || "Không thể tải danh sách công việc",
        severity: "error",
      });
    } finally {
      setLoading(false);
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
      if (!projectId || !sprintId) {
        console.error("Missing projectId or sprintId for updateTaskStatus:", { projectId, sprintId, taskId });
        enqueueSnackbar("Không thể cập nhật trạng thái: Thiếu thông tin dự án hoặc sprint", { variant: "error" });
        return;
      }

      console.log("Updating task status with params:", { projectId, sprintId, taskId, status: destinationContainer });
      const result = await updateTaskStatus(projectId, sprintId, taskId, destinationContainer);

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
        key={task._id || `task-${status}-${Math.random().toString(36).substr(2, 9)}`}
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
          key={task._id || `taskcard-${status}-${Math.random().toString(36).substr(2, 9)}`}
          task={task}
          container={status}
          project={project}
          onEdit={(task) => {
            handleViewTaskDetail(task);
          }}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          actionButtons={
            <Box
              className="action-buttons"
              sx={{ 
                position: "absolute", 
                top: 8, 
                right: 8, 
                zIndex: 999,
                backgroundColor: "rgba(255,255,255,0.95)",
                borderRadius: "8px",
                padding: "3px",
                boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
                border: "1px solid rgba(0,0,0,0.05)"
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                return false;
              }}
            >
              <Box display="flex" gap={1}>
                <ActionButtons
                  canEdit={canEditTask ? canEditTask(task, project) : true}
                  canDelete={canDeleteTask ? canDeleteTask(task, project) : true}
                  onEdit={(e) => {
                    if (e) {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                    setSelectedTask(task);
                    setOpenEditDialog(true);
                    return false;
                  }}
                  onDelete={(e) => {
                    if (e) {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                    handleDeleteTask(task._id);
                    return false;
                  }}
                  editTooltip="Bạn không có quyền chỉnh sửa công việc này"
                  deleteTooltip="Bạn không có quyền xóa công việc này"
                  useIcons={true}
                  size="small"
                />
              </Box>
            </Box>
          }
        />
      </Box>
    ));
  };

  // Hàm lấy danh sách thành viên của sprint
  const fetchSprintMembers = async (projectId, sprintId) => {
    try {
      if (!projectId || !sprintId) return;
      
      const result = await getSprintMembers(projectId, sprintId);
      if (result.success) {
        setSprintMembers(result.data);
      } else {
        console.error("Error fetching sprint members:", result.message);
      }
    } catch (error) {
      console.error("Failed to fetch sprint members:", error);
    }
  };

  // Hàm xử lý hiển thị chi tiết task
  const handleViewTaskDetail = async (task) => {
    console.log("Opening task detail dialog:", task);
    setSelectedTask(task);
    setOpenDetailDialog(true);
    
    // Reset trạng thái
    setDetailTab(0);
    setTaskComments([]);
    setTaskAttachments([]);
    setTaskHistory([]);
    
    // Tải dữ liệu chi tiết
    if (task && task._id) {
      console.log("Fetching data for task:", task._id);
      fetchTaskComments(task._id);
      fetchTaskAttachments(task._id);
      fetchTaskHistory(task._id);
    } else {
      console.error("Invalid task or missing task ID");
    }
  };

  // Hàm chuyển đổi tab trong dialog chi tiết
  const handleDetailTabChange = (event, newValue) => {
    setDetailTab(newValue);
  };

  // Hàm tải comments
  const fetchTaskComments = async (taskId) => {
    try {
      setLoadingComments(true);
      const result = await getTaskComments(projectId, sprintId, taskId);
      if (result.success) {
        setTaskComments(result.data || []);
      } else {
        console.error("Error fetching task comments:", result.message);
        setTaskComments([]);
      }
    } catch (error) {
      console.error("Failed to fetch task comments:", error);
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Hàm tải attachments
  const fetchTaskAttachments = async (taskId) => {
    try {
      setLoadingAttachments(true);
      const result = await getTaskAttachments(projectId, sprintId, taskId);
      if (result.success) {
        setTaskAttachments(result.data || []);
      } else {
        console.error("Error fetching task attachments:", result.message);
        setTaskAttachments([]);
      }
    } catch (error) {
      console.error("Failed to fetch task attachments:", error);
      setTaskAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Hàm tải lịch sử
  const fetchTaskHistory = async (taskId) => {
    try {
      setLoadingHistory(true);
      const result = await getTaskAuditLogs(projectId, sprintId, taskId);
      if (result.success) {
        setTaskHistory(result.data || []);
      } else {
        console.error("Error fetching task history:", result.message);
        setTaskHistory([]);
      }
    } catch (error) {
      console.error("Failed to fetch task history:", error);
      setTaskHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Hàm gửi bình luận
  const handleSendComment = async () => {
    if (!newComment.trim() || !selectedTask?._id) return;
    
    try {
      const result = await addTaskComment(projectId, sprintId, selectedTask._id, newComment);
      if (result.success) {
        // Thêm comment mới vào danh sách
        setTaskComments([...taskComments, result.data]);
        // Reset input
        setNewComment("");
        showSnackbar("Đã thêm bình luận thành công", "success");
      } else {
        showSnackbar(result.message || "Không thể thêm bình luận", "error");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      showSnackbar("Đã xảy ra lỗi khi thêm bình luận", "error");
    }
  };

  // Hàm tải lên tệp đính kèm
  const handleFileUpload = async (event) => {
    if (!event.target.files || !event.target.files[0] || !selectedTask?._id) return;
    
    const file = event.target.files[0];
    try {
      const result = await addTaskAttachment(projectId, sprintId, selectedTask._id, file);
      if (result.success) {
        // Thêm tệp mới vào danh sách
        setTaskAttachments([...taskAttachments, result.data]);
        showSnackbar("Đã tải lên tệp đính kèm thành công", "success");
      } else {
        showSnackbar(result.message || "Không thể tải lên tệp đính kèm", "error");
      }
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      showSnackbar("Đã xảy ra lỗi khi tải lên tệp đính kèm", "error");
    } finally {
      // Reset input file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle view mode change
  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
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
        {error.includes("chưa có sprint") && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate(`/projects/${projectId}/sprints/create`)}
          >
            Tạo Sprint mới
          </Button>
        )}
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
        >
          Thử lại
        </Button>
      </Box>
    );
  }

  // Hàm render chế độ xem danh sách
  const renderListView = () => {
    // Tạo mảng từ tất cả các task
    const allTasks = [
      ...tasks.todo,
      ...tasks.inProgress,
      ...tasks.review,
      ...tasks.done,
    ];

    // Lọc task theo filter
    const filteredTasks = allTasks.filter(task => {
      const statusMatch = statusFilter === 'all' || task.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
      return statusMatch && priorityMatch;
    });

    return (
      <TableContainer component={Paper} sx={{ mt: 3, borderRadius: '12px', boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Tiêu đề</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Độ ưu tiên</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Ngày hết hạn</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Người thực hiện</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task._id} hover>
                <TableCell>{task.title || task.name}</TableCell>
                <TableCell>
                  <Chip 
                    label={
                      task.status === 'todo' ? 'Chưa bắt đầu' : 
                      task.status === 'inProgress' ? 'Đang thực hiện' :
                      task.status === 'review' ? 'Đang kiểm tra' : 'Hoàn thành'
                    }
                    size="small"
                    sx={{
                      backgroundColor: 
                        task.status === 'todo' ? 'rgba(66, 165, 245, 0.1)' :
                        task.status === 'inProgress' ? 'rgba(255, 152, 0, 0.1)' :
                        task.status === 'review' ? 'rgba(171, 71, 188, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                      color: 
                        task.status === 'todo' ? '#1976d2' :
                        task.status === 'inProgress' ? '#f57c00' :
                        task.status === 'review' ? '#7b1fa2' : '#2e7d32',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={
                      task.priority === 'low' ? 'Thấp' :
                      task.priority === 'medium' ? 'Trung bình' : 'Cao'
                    }
                    size="small"
                    sx={{
                      backgroundColor: 
                        task.priority === 'low' ? 'rgba(76, 175, 80, 0.1)' :
                        task.priority === 'medium' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                      color: 
                        task.priority === 'low' ? '#2e7d32' :
                        task.priority === 'medium' ? '#f57c00' : '#d32f2f',
                    }}
                  />
                </TableCell>
                <TableCell>
                  {task.dueDate ? format(new Date(task.dueDate), "dd/MM/yyyy", { locale: vi }) : 'Chưa có hạn'}
                </TableCell>
                <TableCell>
                  {task.assignees && task.assignees.length > 0 ? (
                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
                      {task.assignees.map((assignee, index) => (
                        <Tooltip key={assignee._id || `assignee-${index}`} title={assignee.name || assignee.email || "Người dùng"}>
                          <Avatar src={assignee.avatar}>
                            {(assignee.name || assignee.email || "?").charAt(0)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  ) : (
                    <Typography variant="body2" color="text.secondary">Chưa gán</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      onClick={() => handleViewTaskDetail(task)}
                    >
                      CHI TIẾT
                    </Button>
                    <ActionButtons
                      canEdit={canEditTask ? canEditTask(task, project) : true}
                      canDelete={canDeleteTask ? canDeleteTask(task, project) : true}
                      onEdit={(e) => {
                        if (e) {
                          e.stopPropagation();
                          e.preventDefault();
                        }
                        setSelectedTask(task);
                        setOpenEditDialog(true);
                        return false;
                      }}
                      onDelete={(e) => {
                        if (e) {
                          e.stopPropagation();
                          e.preventDefault();
                        }
                        handleDeleteTask(task._id);
                        return false;
                      }}
                      editTooltip="Bạn không có quyền chỉnh sửa công việc này"
                      deleteTooltip="Bạn không có quyền xóa công việc này"
                      useIcons={true}
                      size="small"
                    />
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const StatusFilter = ({ value, onChange }) => {
    return (
      <FormControl sx={{ minWidth: 120 }} size="small">
        <InputLabel id="status-filter-label">Trạng thái</InputLabel>
        <Select
          labelId="status-filter-label"
          id="status-filter"
          value={value}
          label="Trạng thái"
          onChange={onChange}
        >
          <MenuItem key="all" value="all">Tất cả</MenuItem>
          <MenuItem key="todo" value="todo">Chưa bắt đầu</MenuItem>
          <MenuItem key="inProgress" value="inProgress">Đang thực hiện</MenuItem>
          <MenuItem key="review" value="review">Đang kiểm tra</MenuItem>
          <MenuItem key="done" value="done">Hoàn thành</MenuItem>
        </Select>
      </FormControl>
    );
  };

  const PriorityFilter = ({ value, onChange }) => {
    return (
      <FormControl sx={{ minWidth: 120 }} size="small">
        <InputLabel id="priority-filter-label">Mức độ</InputLabel>
        <Select
          labelId="priority-filter-label"
          id="priority-filter"
          value={value}
          label="Mức độ"
          onChange={onChange}
        >
          <MenuItem key="all" value="all">Tất cả</MenuItem>
          <MenuItem key="low" value="low">Thấp</MenuItem>
          <MenuItem key="medium" value="medium">Trung bình</MenuItem>
          <MenuItem key="high" value="high">Cao</MenuItem>
        </Select>
      </FormControl>
    );
  };

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

      <Box 
        display="flex" 
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        {/* Chế độ xem - Phiên bản cải tiến */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="Chế độ xem"
          sx={{
            backgroundColor: '#f8f9fa',
            padding: '4px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.08)',
            '& .MuiToggleButtonGroup-grouped': {
              margin: '4px',
              borderRadius: '10px !important',
              border: 'none',
              '&.Mui-selected': {
                backgroundColor: '#ffffff',
                color: '#1976d2',
                boxShadow: '0 2px 6px rgba(25, 118, 210, 0.15)',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#ffffff',
                  color: '#1976d2',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              transition: 'all 0.2s ease-in-out',
            },
          }}
        >
          <ToggleButton 
            key="kanban"
            value="kanban" 
            aria-label="kanban"
            sx={{
              minWidth: '120px',
              py: 1,
              fontWeight: viewMode === 'kanban' ? 600 : 400,
              textTransform: 'none',
              fontSize: '0.95rem',
              '&.Mui-selected svg': {
                color: '#1976d2',
              }
            }}
          >
            <GridViewIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> Kanban
          </ToggleButton>
          <ToggleButton 
            key="list"
            value="list" 
            aria-label="list"
            sx={{
              minWidth: '120px',
              py: 1,
              fontWeight: viewMode === 'list' ? 600 : 400,
              textTransform: 'none',
              fontSize: '0.95rem',
              '&.Mui-selected svg': {
                color: '#1976d2',
              }
            }}
          >
            <ViewListIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> Danh sách
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Bộ lọc đã được chuyển sang bên phải */}
        <Box display="flex" gap={2}>
          <StatusFilter value={statusFilter} onChange={handleStatusFilterChange} />
          <PriorityFilter value={priorityFilter} onChange={handlePriorityFilterChange} />
        </Box>
      </Box>

      {viewMode === 'kanban' ? (
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
                  <Box sx={{ mt: 2 }}>
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
                        ?.assignees.map((assignee, index) => (
                          <Avatar
                            key={assignee._id || `assignee-${index}`}
                            alt={assignee.fullName || assignee.name || assignee.email || "Unknown"}
                            src={assignee.avatar}
                            sx={{
                              backgroundColor: "#e9ecef",
                              color: "#495057",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                            }}
                          >
                            {(assignee.fullName || assignee.name || assignee.email || "?").charAt(0)}
                          </Avatar>
                        ))}
                    </AvatarGroup>
                  </Box>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        renderListView()
      )}

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
              required
              error={newTask.name.length > 0 && newTask.name.length < 3}
              helperText={newTask.name.length > 0 && newTask.name.length < 3 ? "Tiêu đề phải có ít nhất 3 ký tự" : ""}
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
              required
              error={newTask.description.length > 0 && newTask.description.length < 10}
              helperText={newTask.description.length > 0 && newTask.description.length < 10 ? "Mô tả phải có ít nhất 10 ký tự" : ""}
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
                <MenuItem key="low" value="low">Thấp</MenuItem>
                <MenuItem key="medium" value="medium">Trung bình</MenuItem>
                <MenuItem key="high" value="high">Cao</MenuItem>
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
                {sprintMembers.length > 0 ? (
                  sprintMembers.map((member, index) => (
                    <MenuItem key={member._id || member.id || `member-${index}`} value={member.user?._id || member.userId}>
                      {member.user?.name || member.user?.email || member.userName || "Người dùng không xác định"}
                    </MenuItem>
                  ))
                ) : (
                  project?.members?.map((member, index) => (
                    <MenuItem key={member._id || `project-member-${index}`} value={member.user?._id}>
                      {member.user?.name || member.user?.email || "Người dùng không xác định"}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              label="Tags (phân tách bằng dấu phẩy)"
              fullWidth
              value={newTask.tags.join(", ")}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  tags: e.target.value.split(",").map((tag, index) => tag.trim()),
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Hủy</Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained"
            disabled={
              !newTask.name || 
              newTask.name.length < 3 || 
              !newTask.description || 
              newTask.description.length < 10
            }
          >
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
                <MenuItem key="low" value="low">Thấp</MenuItem>
                <MenuItem key="medium" value="medium">Trung bình</MenuItem>
                <MenuItem key="high" value="high">Cao</MenuItem>
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
                {sprintMembers.length > 0 ? (
                  sprintMembers.map((member, index) => (
                    <MenuItem key={member._id || member.id || `edit-member-${index}`} value={member.user?._id || member.userId}>
                      {member.user?.name || member.user?.email || member.userName || "Người dùng không xác định"}
                    </MenuItem>
                  ))
                ) : (
                  project?.members?.map((member, index) => (
                    <MenuItem key={member._id || `edit-project-member-${index}`} value={member.user?._id}>
                      {member.user?.name || member.user?.email || "Người dùng không xác định"}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            <TextField
              label="Tags (phân tách bằng dấu phẩy)"
              fullWidth
              value={selectedTask?.tags?.join(", ") || ""}
              onChange={(e) =>
                setSelectedTask({
                  ...selectedTask,
                  tags: e.target.value.split(",").map((tag, index) => tag.trim()),
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

      {/* Dialog Xem Chi Tiết Task */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedTask?.name || selectedTask?.title}
            </Typography>
            <Chip 
              label={
                selectedTask?.status === 'todo' ? 'Chưa bắt đầu' : 
                selectedTask?.status === 'inProgress' ? 'Đang thực hiện' :
                selectedTask?.status === 'review' ? 'Đang kiểm tra' : 'Hoàn thành'
              }
              size="small"
              sx={{
                backgroundColor: 
                  selectedTask?.status === 'todo' ? 'rgba(66, 165, 245, 0.1)' :
                  selectedTask?.status === 'inProgress' ? 'rgba(255, 152, 0, 0.1)' :
                  selectedTask?.status === 'review' ? 'rgba(171, 71, 188, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                color: 
                  selectedTask?.status === 'todo' ? '#1976d2' :
                  selectedTask?.status === 'inProgress' ? '#f57c00' :
                  selectedTask?.status === 'review' ? '#7b1fa2' : '#2e7d32',
              }}
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {/* Thông tin chính của task */}
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" fontWeight="bold">Thông tin chung</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body1" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                        {selectedTask?.description}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Độ ưu tiên
                      </Typography>
                      <Chip 
                        label={
                          selectedTask?.priority === 'low' ? 'Thấp' :
                          selectedTask?.priority === 'medium' ? 'Trung bình' : 'Cao'
                        }
                        size="small"
                        sx={{
                          backgroundColor: 
                            selectedTask?.priority === 'low' ? 'rgba(76, 175, 80, 0.1)' :
                            selectedTask?.priority === 'medium' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          color: 
                            selectedTask?.priority === 'low' ? '#2e7d32' :
                            selectedTask?.priority === 'medium' ? '#f57c00' : '#d32f2f',
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Ngày hết hạn
                      </Typography>
                      <Typography variant="body2">
                        {selectedTask?.dueDate ? format(new Date(selectedTask.dueDate), "dd/MM/yyyy", { locale: vi }) : 'Chưa có hạn'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Người thực hiện
                      </Typography>
                      {selectedTask?.assignees && selectedTask.assignees.length > 0 ? (
                        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                          {selectedTask.assignees.map((assignee, index) => (
                            <Chip
                              key={assignee._id || `assignee-${index}`}
                              avatar={<Avatar src={assignee.avatar}>{(assignee.name || assignee.email || "?").charAt(0)}</Avatar>}
                              label={assignee.name || assignee.email || "Người dùng không xác định"}
                              variant="outlined"
                              size="small"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2">Chưa có người thực hiện</Typography>
                      )}
                    </Grid>
                    {selectedTask?.tags && selectedTask.tags.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Tags
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                          {selectedTask.tags.map((tag, index) => (
                            <Chip
                              key={`tag-${index}`}
                              label={tag}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" mt={1}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Người tạo: {selectedTask?.createdBy?.name || "Unknown"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ngày tạo: {selectedTask?.createdAt ? format(new Date(selectedTask.createdAt), "dd/MM/yyyy", { locale: vi }) : ''}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>
            
            {/* Tabs cho comments, files, lịch sử */}
            <Box sx={{ width: '100%' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={detailTab} onChange={handleDetailTabChange} aria-label="task tabs">
                  <Tab 
                    icon={<Badge badgeContent={taskComments.length} color="primary"><CommentIcon /></Badge>} 
                    label="Bình luận" 
                    id="task-tab-0" 
                    aria-controls="task-tabpanel-0" 
                  />
                  <Tab 
                    icon={<Badge badgeContent={taskAttachments.length} color="primary"><AttachFileIcon /></Badge>} 
                    label="Tệp đính kèm" 
                    id="task-tab-1" 
                    aria-controls="task-tabpanel-1" 
                  />
                  <Tab 
                    icon={<HistoryIcon />} 
                    label="Lịch sử" 
                    id="task-tab-2" 
                    aria-controls="task-tabpanel-2" 
                  />
                </Tabs>
              </Box>
              
              {/* Tab Comments */}
              <Box
                role="tabpanel"
                hidden={detailTab !== 0}
                id="task-tabpanel-0"
                aria-labelledby="task-tab-0"
                sx={{ py: 2 }}
              >
                {loadingComments ? (
                  <Box display="flex" justifyContent="center" my={3}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <>
                    <List sx={{ width: '100%' }}>
                      {taskComments.length === 0 ? (
                        <Box display="flex" justifyContent="center" my={2}>
                          <Typography variant="body2" color="text.secondary">
                            Chưa có bình luận nào.
                          </Typography>
                        </Box>
                      ) : (
                        taskComments.map((comment, index) => (
                          <ListItem
                            key={comment._id || `comment-${index}`}
                            alignItems="flex-start"
                            sx={{ 
                              py: 1,
                              borderBottom: index < taskComments.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar src={comment.user?.avatar}>
                                {(comment.user?.name || "?").charAt(0)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="subtitle2" component="span">
                                    {comment.user?.name || "Người dùng"}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {comment.createdAt ? format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                  sx={{ mt: 1, whiteSpace: 'pre-wrap' }}
                                >
                                  {comment.content}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))
                      )}
                    </List>
                    
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Thêm bình luận..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton 
                                edge="end" 
                                color="primary" 
                                onClick={handleSendComment}
                                disabled={!newComment.trim()}
                              >
                                <SendIcon />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  </>
                )}
              </Box>
              
              {/* Tab Tệp đính kèm */}
              <Box
                role="tabpanel"
                hidden={detailTab !== 1}
                id="task-tabpanel-1"
                aria-labelledby="task-tab-1"
                sx={{ py: 2 }}
              >
                {loadingAttachments ? (
                  <Box display="flex" justifyContent="center" my={3}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <>
                    <List sx={{ width: '100%' }}>
                      {taskAttachments.length === 0 ? (
                        <Box display="flex" justifyContent="center" my={2}>
                          <Typography variant="body2" color="text.secondary">
                            Chưa có tệp đính kèm nào.
                          </Typography>
                        </Box>
                      ) : (
                        taskAttachments.map((attachment, index) => (
                          <ListItem
                            key={attachment._id || `attachment-${index}`}
                            alignItems="center"
                            sx={{ 
                              py: 1,
                              borderBottom: index < taskAttachments.length - 1 ? '1px solid #f0f0f0' : 'none'
                            }}
                          >
                            <ListItemIcon>
                              <InsertDriveFileIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={attachment.filename || "Tệp đính kèm"}
                              secondary={
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : ''}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {attachment.createdAt ? format(new Date(attachment.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                                  </Typography>
                                </Box>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Button
                                variant="outlined"
                                size="small"
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Tải xuống
                              </Button>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))
                      )}
                    </List>
                    
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <input
                        accept="*/*"
                        style={{ display: 'none' }}
                        id="task-file-upload"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="task-file-upload">
                        <Button
                          variant="contained"
                          component="span"
                          startIcon={<CloudUploadIcon />}
                        >
                          Tải lên tệp
                        </Button>
                      </label>
                    </Box>
                  </>
                )}
              </Box>
              
              {/* Tab Lịch sử */}
              <Box
                role="tabpanel"
                hidden={detailTab !== 2}
                id="task-tabpanel-2"
                aria-labelledby="task-tab-2"
                sx={{ py: 2 }}
              >
                {loadingHistory ? (
                  <Box display="flex" justifyContent="center" my={3}>
                    <CircularProgress size={30} />
                  </Box>
                ) : (
                  <List sx={{ width: '100%' }}>
                    {taskHistory.length === 0 ? (
                      <Box display="flex" justifyContent="center" my={2}>
                        <Typography variant="body2" color="text.secondary">
                          Chưa có lịch sử thay đổi nào.
                        </Typography>
                      </Box>
                    ) : (
                      taskHistory.map((historyItem, index) => (
                        <ListItem
                          key={historyItem._id || `history-${index}`}
                          alignItems="flex-start"
                          sx={{ 
                            py: 1,
                            borderBottom: index < taskHistory.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar src={historyItem.user?.avatar}>
                              {(historyItem.user?.name || "?").charAt(0)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="subtitle2" component="span">
                                  {historyItem.user?.name || "Người dùng"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {historyItem.timestamp ? format(new Date(historyItem.timestamp), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
                                {historyItem.field ? (
                                  <>
                                    Đã thay đổi <strong>{historyItem.field}</strong> từ "<em>{historyItem.oldValue}</em>" thành "<em>{historyItem.newValue}</em>"
                                  </>
                                ) : (
                                  historyItem.action || "Đã thực hiện thay đổi"
                                )}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Đóng</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              setOpenDetailDialog(false);
              setSelectedTask(selectedTask);
              setOpenEditDialog(true);
            }}
          >
            Chỉnh sửa
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
