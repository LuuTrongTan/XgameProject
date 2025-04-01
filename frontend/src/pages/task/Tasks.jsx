import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Snackbar,
  Alert,
  Paper,
  Tooltip,
  Chip,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Avatar,
  AvatarGroup,
  Badge,
  Breadcrumbs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction
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
import TaskCommentForm from '../../components/TaskCommentForm';

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
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [project, setProject] = useState(null);
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
    startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
    assignees: [],
    tags: [],
    estimate: "",
  });
  const [newComment, setNewComment] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [detailView, setDetailView] = useState("comments");
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [detailTab, setDetailTab] = useState(0);
  const [taskComments, setTaskComments] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = React.useRef();
  const [showActivity, setShowActivity] = useState(false);
  const [activityData, setActivityData] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState(null);

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
      if (!projectId || !sprintId) {
        showSnackbar("Không thể tạo công việc, thiếu thông tin dự án hoặc sprint", "error");
        return;
      }

      // Validate dữ liệu đầu vào
      if (!newTask.name || newTask.name.length < 3) {
        showSnackbar("Tiêu đề công việc phải từ 3 ký tự trở lên", "error");
        return;
      }

      if (!newTask.description || newTask.description.length < 10) {
        showSnackbar("Mô tả công việc phải từ 10 ký tự trở lên", "error");
        return;
      }

      // Chuẩn bị dữ liệu
      const taskData = {
        title: newTask.name,
        description: newTask.description,
        status: newTask.status || "todo",
        priority: newTask.priority || "medium",
        startDate: newTask.startDate || new Date().toISOString(),
        dueDate: newTask.dueDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedTime: Number(newTask.estimatedTime) || 0, // Sửa tên trường thành estimatedTime
        assignees: newTask.assignees || [],
        tags: newTask.tags ? (typeof newTask.tags === 'string' ? newTask.tags.split(',').map(tag => tag.trim()) : newTask.tags) : [],
      };

      console.log("Creating new task with data:", taskData);

      const response = await createTask(projectId, sprintId, taskData);

      if (response.success) {
        // Thêm task mới vào state
        setTasks(prevTasks => ({
          ...prevTasks,
          [taskData.status]: [...prevTasks[taskData.status], response.data]
        }));

        // Reset form và đóng dialog
        setNewTask({
          name: "",
          description: "",
          status: "todo",
          priority: "medium",
          startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
          estimatedTime: 0, // Sửa tên trường thành estimatedTime
          assignees: [],
          tags: []
        });
        setOpenCreateDialog(false);
        showSnackbar("Tạo công việc thành công", "success");
      } else {
        showSnackbar(response.message || "Không thể tạo công việc mới", "error");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      showSnackbar(error.message || "Lỗi khi tạo công việc mới", "error");
    }
  };

  const handleEditTask = async () => {
    try {
      // Kiểm tra các thông tin cần thiết
      if (!projectId || !sprintId) {
        console.error("Missing projectId or sprintId:", { projectId, sprintId });
        showSnackbar("Không thể cập nhật công việc: Thiếu thông tin dự án hoặc sprint", "error");
        return;
      }
      
      // Đảm bảo selectedTask tồn tại
      if (!selectedTask) {
        console.error("No selected task to update");
        showSnackbar("Không có công việc nào được chọn để cập nhật", "error");
        return;
      }
      
      // Đảm bảo có task ID (dùng _id hoặc id)
      const taskId = selectedTask._id || selectedTask.id;
      if (!taskId) {
        console.error("Task is missing ID:", selectedTask);
        showSnackbar("Không thể cập nhật công việc: Thiếu ID công việc", "error");
        return;
      }

      // Kiểm tra ID của task trước khi gửi request
      console.log("Task checking before update:");
      console.log("- Task ID:", taskId);
      console.log("- Project ID:", projectId);
      console.log("- Sprint ID:", sprintId);
      console.log("- Full task object:", selectedTask);
      
      // Chuẩn bị dữ liệu để gửi lên API
      const taskPayload = {
        _id: taskId, // Đảm bảo có ID trong payload
        id: taskId, // Đảm bảo có ID với tên khác
        title: selectedTask.title || selectedTask.name,
        description: selectedTask.description,
        status: selectedTask.status,
        priority: selectedTask.priority,
        startDate: selectedTask.startDate,
        dueDate: selectedTask.dueDate,
        estimatedTime: selectedTask.estimatedTime || selectedTask.estimate || 0, // Sửa tên trường estimatedTime và thêm fallback
        // Xử lý assignees nếu là mảng IDs
        assignees: Array.isArray(selectedTask.assignees) && selectedTask.assignees.length > 0
          ? selectedTask.assignees.map(a => {
              // Kiểm tra từng assignee
              if (!a) return null;
              return typeof a === 'object' ? (a._id || a.userId || a.id) : a;
            }).filter(Boolean) // Lọc bỏ các giá trị null/undefined
          : [],
        tags: selectedTask.tags || [],
        project: projectId,
        sprint: sprintId
      };
      
      console.log("Task payload for update:", taskPayload);
      
      // Debug API request
      console.log("Making API request with:", {
        projectId,
        sprintId,
        taskId,
        payload: JSON.stringify(taskPayload)
      });
      
      const response = await updateTask(projectId, sprintId, taskId, taskPayload);
      console.log("API update response:", response);
      
      if (!response) {
        console.error("No response received from API");
        throw new Error("Lỗi kết nối máy chủ");
      }
      
      if (response.success === false) {
        console.error("API returned error:", response);
        throw new Error(response.message || "Lỗi khi cập nhật công việc");
      }
      
      // Cập nhật state với dữ liệu mới
      const updatedTask = response.data;
      if (!updatedTask) {
        console.warn("Response success but no task data returned");
        throw new Error("Lỗi dữ liệu từ máy chủ");
      }
      
      setTasks((prevTasks) => {
        // Tạo bản sao của state hiện tại
        const newTasks = { ...prevTasks };
        
        // Xoá task khỏi tất cả các trạng thái
        Object.keys(newTasks).forEach(status => {
          newTasks[status] = newTasks[status].filter(task => {
            const currentTaskId = task._id || task.id;
            return currentTaskId !== taskId;
          });
        });
        
        // Thêm task vào đúng trạng thái mới
        if (!newTasks[updatedTask.status]) {
          console.warn(`Status "${updatedTask.status}" not found in tasks state, defaulting to "todo"`);
          newTasks.todo.push(updatedTask);
        } else {
          newTasks[updatedTask.status].push(updatedTask);
        }
        
        return newTasks;
      });
      
      setOpenEditDialog(false);
      setSelectedTask(null);
      showSnackbar("Cập nhật công việc thành công", "success");
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
        setTaskComments([...taskComments, response.data]);
        showSnackbar("Thêm bình luận thành công", "success");
      } else {
        setCommentError(response.message || "Không thể thêm bình luận");
        showSnackbar("Đã xảy ra lỗi khi thêm bình luận", "error");
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

  // Hàm chỉnh sửa task
  const handleEditButtonClick = (task, event) => {
    console.log("Handle edit button click", task);
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Đảm bảo task có thuộc tính _id
    if (!task._id && task.id) {
      task._id = task.id;
    }
    
    console.log("Editing task:", task);
    setSelectedTask(task);
    setOpenEditDialog(true);
    return false;
  };

  // Render task cards cho từng cột
  const renderTaskCards = (columnTasks, status) => {
    if (!columnTasks || columnTasks.length === 0) {
      return (
        <Box
          sx={{
            p: 2,
            textAlign: "center",
            color: "text.secondary",
            backgroundColor: "rgba(0,0,0,0.02)",
            borderRadius: "10px",
            mt: 2
          }}
        >
          <Typography variant="body2">Chưa có công việc nào</Typography>
        </Box>
      );
    }

    return columnTasks.map((task, index) => (
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
          mb: 2
        }}
      >
        <TaskCard
          key={task._id || `taskcard-${status}-${Math.random().toString(36).substr(2, 9)}`}
          task={task}
          container={status}
          project={project}
          onEdit={handleViewTaskDetail}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
                  onEdit={(e) => handleEditButtonClick(task, e)}
                  onDelete={(e) => {
                    if (e) {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                    handleDeleteTask(task._id);
                    return false;
                  }}
                  editTooltip="Chỉnh sửa công việc"
                  deleteTooltip="Xóa công việc"
                  useIcons={true}
                  size="small"
                />
              </Box>
            </Box>
          }
          index={index}
        />
      </Box>
    ));
  };

  // Render columns with droppable areas
  const renderTaskColumn = (title, count, color, statusId, icon, tasks) => (
    <Card
      sx={{
        minHeight: "calc(100vh - 300px)",
        backgroundColor: "#f8f9fc",
        borderRadius: "20px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        border: `1px solid rgba(${color}, 0.2)`,
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: `0 12px 32px rgba(${color}, 0.15)`,
          border: `1px solid rgba(${color}, 0.4)`,
        },
      }}
      onDragOver={(e) => handleDragOver(e, statusId)}
      onDrop={(e) => {
        const taskId = e.dataTransfer.getData("text/plain");
        console.log(`Drop event on column ${statusId}, task: ${taskId}`);
        handleDragEnd(e, taskId, statusId);
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                backgroundColor: `rgba(${color}, 0.1)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: `rgb(${color})`,
                  fontWeight: 600,
                  fontSize: "1.2rem",
                }}
              >
                {count}
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
              {title}
            </Typography>
          </Box>
          {icon}
        </Box>
        <SortableContext
          items={tasks.map((task) => task._id)}
          strategy={verticalListSortingStrategy}
        >
          {renderTaskCards(tasks, statusId)}
        </SortableContext>
      </CardContent>
    </Card>
  );

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
                        <Tooltip key={assignee?._id || `assignee-${index}`} title={assignee?.name || assignee?.email || "Người dùng"}>
                          <Avatar src={assignee?.avatar}>
                            {(assignee?.name || assignee?.email || "?").charAt(0)}
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
                      onEdit={(e) => handleEditButtonClick(task, e)}
                      onDelete={(e) => {
                        if (e) {
                          e.stopPropagation();
                          e.preventDefault();
                        }
                        handleDeleteTask(task._id);
                        return false;
                      }}
                      editTooltip="Chỉnh sửa công việc"
                      deleteTooltip="Xóa công việc"
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
          onClick={() => {
            setNewTask({
              name: "",
              description: "",
              priority: "medium",
              status: "todo",
              startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
              dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
              assignees: [],
              tags: [],
              estimate: "",
            });
            setOpenCreateDialog(true);
          }}
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

      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              {renderTaskColumn(
                "Chưa bắt đầu",
                tasks.todo.length,
                "25, 118, 210",
                "todo",
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      ...newTask,
                      status: "todo",
                      name: "",
                      description: "",
                      priority: "medium",
                      startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      assignees: [],
                      tags: [],
                      estimate: "",
                    });
                    setOpenCreateDialog(true);
                  }}
                  sx={{ 
                    color: "#1976d2",
                    '&:hover': {
                      backgroundColor: "rgba(25, 118, 210, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>,
                tasks.todo
              )}
            </Grid>

            <Grid item xs={12} md={3}>
              {renderTaskColumn(
                "Đang thực hiện",
                tasks.inProgress.length,
                "255, 152, 0",
                "inProgress",
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      ...newTask,
                      status: "inProgress",
                      name: "",
                      description: "",
                      priority: "medium",
                      startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      assignees: [],
                      tags: [],
                      estimate: "",
                    });
                    setOpenCreateDialog(true);
                  }}
                  sx={{ 
                    color: "#ff9800",
                    '&:hover': {
                      backgroundColor: "rgba(255, 152, 0, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>,
                tasks.inProgress
              )}
            </Grid>

            <Grid item xs={12} md={3}>
              {renderTaskColumn(
                "Đang kiểm tra",
                tasks.review.length,
                "156, 39, 176",
                "review",
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      ...newTask,
                      status: "review",
                      name: "",
                      description: "",
                      priority: "medium",
                      startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      assignees: [],
                      tags: [],
                      estimate: "",
                    });
                    setOpenCreateDialog(true);
                  }}
                  sx={{ 
                    color: "#9c27b0",
                    '&:hover': {
                      backgroundColor: "rgba(156, 39, 176, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>,
                tasks.review
              )}
            </Grid>

            <Grid item xs={12} md={3}>
              {renderTaskColumn(
                "Hoàn thành",
                tasks.done.length,
                "76, 175, 80",
                "done",
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      ...newTask,
                      status: "done",
                      name: "",
                      description: "",
                      priority: "medium",
                      startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
                      assignees: [],
                      tags: [],
                      estimate: "",
                    });
                    setOpenCreateDialog(true);
                  }}
                  sx={{ 
                    color: "#2e7d32",
                    '&:hover': {
                      backgroundColor: "rgba(76, 175, 80, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>,
                tasks.done
              )}
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
                            key={assignee?._id || `assignee-${index}`}
                            alt={assignee?.fullName || assignee?.name || assignee?.email || "Unknown"}
                            src={assignee?.avatar}
                            sx={{
                              backgroundColor: "#e9ecef",
                              color: "#495057",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                            }}
                          >
                            {(assignee?.fullName || assignee?.name || assignee?.email || "?").charAt(0)}
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
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={newTask.status}
                label="Trạng thái"
                onChange={(e) =>
                  setNewTask({ ...newTask, status: e.target.value })
                }
              >
                <MenuItem key="todo" value="todo">Chưa bắt đầu</MenuItem>
                <MenuItem key="inProgress" value="inProgress">Đang thực hiện</MenuItem>
                <MenuItem key="review" value="review">Đang kiểm tra</MenuItem>
                <MenuItem key="done" value="done">Hoàn thành</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Thời gian khởi tạo"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newTask.startDate}
              onChange={(e) =>
                setNewTask({ ...newTask, startDate: e.target.value })
              }
            />
            <TextField
              label="Ngày hết hạn"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newTask.dueDate}
              onChange={(e) =>
                setNewTask({ ...newTask, dueDate: e.target.value })
              }
            />
            <TextField
              label="Ước lượng thời gian (giờ)"
              fullWidth
              type="number"
              value={newTask.estimatedTime || ""}
              onChange={(e) => setNewTask({ ...newTask, estimatedTime: e.target.value })}
              InputProps={{
                inputProps: { min: 0 }
              }}
              margin="normal"
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
                  tags: e.target.value.split(",").map((tag) => tag.trim()),
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
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Thời gian ước tính
                      </Typography>
                      <Typography variant="body2">
                        {selectedTask?.estimatedTime ? `${selectedTask.estimatedTime} giờ` : 'Chưa có ước tính'}
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
                              key={assignee?._id || `assignee-${index}`}
                              avatar={<Avatar src={assignee?.avatar}>{((assignee?.name || assignee?.email || "?") || "?").charAt(0)}</Avatar>}
                              label={assignee?.name || assignee?.email || "Người dùng không xác định"}
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
                    icon={
                      <Badge 
                        badgeContent={Array.isArray(taskComments) ? taskComments.length : 0} 
                        color="primary" 
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}
                      >
                        <CommentIcon />
                      </Badge>
                    } 
                    label="Bình luận" 
                    id="task-tab-0" 
                    aria-controls="task-tabpanel-0" 
                  />
                  <Tab 
                    icon={
                      <Badge 
                        badgeContent={Array.isArray(taskAttachments) ? taskAttachments.length : 0} 
                        color="primary" 
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: '16px', minWidth: '16px' } }}
                      >
                        <AttachFileIcon />
                      </Badge>
                    } 
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
                      {(!taskComments || !Array.isArray(taskComments) || taskComments.length === 0) ? (
                        <Box display="flex" justifyContent="center" my={2}>
                          <Typography variant="body2" color="text.secondary">
                            Chưa có bình luận nào.
                          </Typography>
                        </Box>
                      ) : (
                        Array.isArray(taskComments) && taskComments.map((comment, index) => (
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
                      {(!taskAttachments || !Array.isArray(taskAttachments) || taskAttachments.length === 0) ? (
                        <Box display="flex" justifyContent="center" my={2}>
                          <Typography variant="body2" color="text.secondary">
                            Chưa có tệp đính kèm nào.
                          </Typography>
                        </Box>
                      ) : (
                        Array.isArray(taskAttachments) && taskAttachments.map((attachment, index) => (
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
                    {(!taskHistory || !Array.isArray(taskHistory) || taskHistory.length === 0) ? (
                      <Box display="flex" justifyContent="center" my={2}>
                        <Typography variant="body2" color="text.secondary">
                          Chưa có lịch sử thay đổi nào.
                        </Typography>
                      </Box>
                    ) : (
                      Array.isArray(taskHistory) && taskHistory.map((item, index) => (
                        <ListItem
                          key={item._id || `history-${index}`}
                          alignItems="flex-start"
                          sx={{ 
                            py: 1,
                            borderBottom: index < taskHistory.length - 1 ? '1px solid #f0f0f0' : 'none'
                          }}
                        >
                          <ListItemIcon>
                            <HistoryIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="subtitle2" component="span">
                                  {item.user?.name || "Người dùng"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.createdAt ? format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }) : ''}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography
                                variant="body2"
                                color="text.primary"
                                sx={{ mt: 1 }}
                              >
                                {item.action || "Đã thực hiện một hành động"}
                                {item.details && `: ${item.details}`}
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

      {/* Dialog Chỉnh Sửa Task */}
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
              value={selectedTask?.title || selectedTask?.name || ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, title: e.target.value })
              }
              required
            />
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              rows={4}
              value={selectedTask?.description || ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, description: e.target.value })
              }
              required
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
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={selectedTask?.status || "todo"}
                label="Trạng thái"
                onChange={(e) =>
                  setSelectedTask({ ...selectedTask, status: e.target.value })
                }
              >
                <MenuItem key="todo" value="todo">Chưa bắt đầu</MenuItem>
                <MenuItem key="inProgress" value="inProgress">Đang thực hiện</MenuItem>
                <MenuItem key="review" value="review">Đang kiểm tra</MenuItem>
                <MenuItem key="done" value="done">Hoàn thành</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Thời gian khởi tạo"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={selectedTask?.startDate ? 
                (selectedTask.startDate.includes('T') ? 
                  selectedTask.startDate.substring(0, 16) : 
                  new Date(selectedTask.startDate).toISOString().substring(0, 16)) 
                : ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, startDate: e.target.value })
              }
            />
            <TextField
              label="Ngày hết hạn"
              type="datetime-local"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={selectedTask?.dueDate ? 
                (selectedTask.dueDate.includes('T') ? 
                  selectedTask.dueDate.substring(0, 16) : 
                  new Date(selectedTask.dueDate).toISOString().substring(0, 16)) 
                : ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, dueDate: e.target.value })
              }
            />
            <TextField
              label="Ước lượng thời gian (giờ)"
              fullWidth
              type="number"
              value={selectedTask?.estimatedTime || ""}
              onChange={(e) =>
                setSelectedTask({ ...selectedTask, estimatedTime: e.target.value })
              }
              InputProps={{
                inputProps: { min: 0 }
              }}
              margin="normal"
            />
            <FormControl fullWidth>
              <InputLabel>Người thực hiện</InputLabel>
              <Select
                multiple
                value={selectedTask?.assignees 
                  ? selectedTask.assignees
                      .filter(a => a) // Lọc null và undefined
                      .map(a => {
                        // Kiểm tra null/undefined và trả về ID hợp lệ
                        if (!a) return null; 
                        if (typeof a === 'string') return a;
                        return a._id || a.userId || null;
                      })
                      .filter(id => id) // Lọc null và undefined
                  : []
                }
                label="Người thực hiện"
                onChange={(e) =>
                  setSelectedTask({ ...selectedTask, assignees: e.target.value })
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
              value={(selectedTask?.tags || []).join(", ")}
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
          <Button 
            onClick={handleEditTask} 
            variant="contained"
            disabled={
              !selectedTask?.title || 
              selectedTask?.title.length < 3 || 
              !selectedTask?.description || 
              selectedTask?.description.length < 10
            }
          >
            Lưu thay đổi
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
