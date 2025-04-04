import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import {
  Add as AddIcon,
  GridView as GridViewIcon,
  ViewList as ViewListIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";

// API imports
import {
  getSprintTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addTaskComment,
  addTaskAttachment,
} from "../../api/taskApi";
import { getSprintMembers } from "../../api/sprintApi";
import { getProjectById } from "../../api/projectApi";

// Component imports
import KanbanView from "../../components/Tasks/KanbanView";
import ListView from "../../components/Tasks/ListView";
import TaskForm from "../../components/Tasks/TaskForm";
import BackButton from "../../components/common/BackButton";
import { StatusFilter, PriorityFilter } from "../../components/Tasks/TaskFilters";
import { useDragAndDrop } from "../../components/Tasks/DragAndDropHooks";

const Tasks = () => {
  const { projectId, sprintId: urlSprintId } = useParams();
  const [searchParams] = useSearchParams();
  const sprintIdFromQuery = searchParams.get('sprint');
  
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { canDeleteTask, canEditTask } = usePermissions();
  
  // State
  const [tasks, setTasks] = useState({
    todo: [],
    inProgress: [],
    review: [],
    done: [],
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("kanban");
  const [project, setProject] = useState(null);
  const [sprint, setSprint] = useState(null);
  const [sprintId, setSprintId] = useState(urlSprintId || sprintIdFromQuery || null);
  const [sprints, setSprints] = useState([]);
  const [sprintMembers, setSprintMembers] = useState([]);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
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
  const [taskComments, setTaskComments] = useState([]);
  const [taskAttachments, setTaskAttachments] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [commentLoading, setCommentLoading] = useState(false);
  
  // Custom hook for drag and drop
  const updateTaskStatusHandler = useCallback(async (params) => {
    try {
      // Xử lý tham số từ object hoặc legacy format (taskId, newStatus)
      let taskId, newStatus, position, taskProjectId, taskSprintId;
      
      if (typeof params === 'object') {
        // Định dạng mới, nhận object có các thuộc tính
        taskId = params.taskId;
        newStatus = params.status;
        position = params.position;
        taskProjectId = params.projectId || projectId;
        taskSprintId = params.sprintId || sprintId;
      } else {
        // Định dạng cũ, nhận 2 tham số riêng biệt
        taskId = params;
        newStatus = arguments[1];
        taskProjectId = projectId;
        taskSprintId = sprintId;
      }
      
      console.log(`Updating task ${taskId} to status ${newStatus} at position ${position}`);
      
      // Tìm task trong tất cả các trạng thái
      let taskToUpdate = null;
      let oldStatus = null;
      
      Object.keys(tasks).forEach((status) => {
        const task = tasks[status].find((t) => t._id === taskId);
        if (task) {
          taskToUpdate = task;
          oldStatus = status;
        }
      });
      
      if (!taskToUpdate) {
        console.error(`Task with ID ${taskId} not found`);
        return;
      }
      
      // Cập nhật UI trước khi gọi API
      setTasks((prevTasks) => {
        // Clone object trạng thái hiện tại
        const newTasks = { ...prevTasks };
        
        // Xóa task khỏi trạng thái cũ
        newTasks[oldStatus] = newTasks[oldStatus].filter(
          (task) => task._id !== taskId
        );
        
        // Thêm task vào trạng thái mới tại vị trí được chỉ định
        const updatedTask = { ...taskToUpdate, status: newStatus, position: position };
        
        if (typeof position === 'number') {
          // Chèn vào vị trí cụ thể
          const targetArray = [...newTasks[newStatus]];
          targetArray.splice(position, 0, updatedTask);
          newTasks[newStatus] = targetArray;
        } else {
          // Thêm vào cuối nếu không chỉ định vị trí
          newTasks[newStatus] = [...newTasks[newStatus], updatedTask];
        }
        
        // Sắp xếp lại các task theo vị trí
        if (newTasks[newStatus].every(task => task.position !== undefined)) {
          newTasks[newStatus].sort((a, b) => a.position - b.position);
        }
        
        return newTasks;
      });
      
      // Gọi API để cập nhật trạng thái và vị trí
      const response = await updateTaskStatus({
        taskId,
        status: newStatus,
        position: position,
        projectId: taskProjectId,
        sprintId: taskSprintId
      });
      
      if (!response.success) {
        // Nếu API thất bại, rollback lại UI
        console.error("Failed to update task status:", response.message);
        enqueueSnackbar("Không thể cập nhật trạng thái công việc: " + response.message, { variant: "error" });
        
        fetchTasks(); // Tải lại dữ liệu để khôi phục trạng thái
      } else {
        enqueueSnackbar("Cập nhật trạng thái thành công", { variant: "success" });
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      enqueueSnackbar("Lỗi khi cập nhật trạng thái công việc", { variant: "error" });
      
      fetchTasks(); // Tải lại dữ liệu để khôi phục trạng thái
    }
  }, [projectId, sprintId, tasks, enqueueSnackbar]);
  
  const {
    activeId,
    activeContainer,
    isDragActive,
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  } = useDragAndDrop(tasks, updateTaskStatusHandler);

  // Fetch data
  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
    
    if (projectId && sprintId) {
      fetchTasks();
      fetchSprintMembers();
    }
  }, [projectId, sprintId]);

  const fetchProjectData = async () => {
    try {
      const projectData = await getProjectById(projectId);
      
      if (projectData.success) {
        setProject(projectData.data);
      } else {
        setError(projectData.message || "Không thể tải thông tin dự án");
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
      setError("Lỗi khi tải thông tin dự án");
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await getSprintTasks(projectId, sprintId);
      
      if (response.success) {
        // Nhóm các công việc theo trạng thái
        const groupedTasks = {
          todo: [],
          inProgress: [],
          review: [],
          done: [],
        };
        
        response.data.forEach((task) => {
          if (task.status && groupedTasks[task.status]) {
            groupedTasks[task.status].push(task);
          } else {
            // Mặc định nếu không có trạng thái hoặc trạng thái không hợp lệ
            groupedTasks.todo.push({ ...task, status: "todo" });
          }
        });
        
        // Sắp xếp task trong mỗi cột theo position
        Object.keys(groupedTasks).forEach(status => {
          // Kiểm tra nếu các task có trường position
          if (groupedTasks[status].length > 0 && groupedTasks[status][0].position !== undefined) {
            groupedTasks[status].sort((a, b) => {
              // Nếu position giống nhau, sắp xếp theo thời gian tạo
              if (a.position === b.position) {
                return new Date(b.createdAt) - new Date(a.createdAt);
              }
              return a.position - b.position;
            });
          }
        });
        
        setTasks(groupedTasks);
      } else {
        setError(response.message || "Không thể tải danh sách công việc");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Lỗi khi tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintMembers = async () => {
    try {
      const response = await getSprintMembers(projectId, sprintId);
      
      if (response.success) {
        setSprintMembers(response.data);
      }
    } catch (error) {
      console.error("Error fetching sprint members:", error);
    }
  };

  // Handler functions
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
  };

  const handlePriorityFilterChange = (value) => {
    setPriorityFilter(value);
  };

  const handleViewModeChange = (event, newMode) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleCreateTask = async (task) => {
    try {
      const response = await createTask(projectId, sprintId, task);
      
      if (response.success) {
        const newTask = response.data;
        
        // Thêm task mới vào state
        setTasks((prevTasks) => ({
          ...prevTasks,
          [newTask.status]: [...prevTasks[newTask.status], newTask],
        }));
        
        setOpenCreateDialog(false);
        enqueueSnackbar("Tạo công việc thành công", { variant: "success" });
      } else {
        enqueueSnackbar(response.message || "Không thể tạo công việc", { variant: "error" });
      }
    } catch (error) {
      console.error("Error creating task:", error);
      enqueueSnackbar("Lỗi khi tạo công việc", { variant: "error" });
    }
  };

  const handleUpdateTask = async (task) => {
    try {
      const taskId = task._id || task.id;
      
      if (!taskId) {
        enqueueSnackbar("Không thể cập nhật công việc: Thiếu ID", { variant: "error" });
        return;
      }
      
      const response = await updateTask(projectId, sprintId, taskId, task);
      
      if (response.success) {
        const updatedTask = response.data;
        
        // Cập nhật state
        setTasks((prevTasks) => {
          const newTasks = { ...prevTasks };
          
          // Xóa task khỏi tất cả các trạng thái
          Object.keys(newTasks).forEach((status) => {
            newTasks[status] = newTasks[status].filter((t) => {
              const tId = t._id || t.id;
              return tId !== taskId;
            });
          });
          
          // Thêm task vào đúng trạng thái mới
          if (!newTasks[updatedTask.status]) {
            console.warn(`Status "${updatedTask.status}" not found, defaulting to "todo"`);
            newTasks.todo.push(updatedTask);
          } else {
            newTasks[updatedTask.status].push(updatedTask);
          }
          
          return newTasks;
        });
        
        setOpenEditDialog(false);
        setSelectedTask(null);
        enqueueSnackbar("Cập nhật công việc thành công", { variant: "success" });
      } else {
        enqueueSnackbar(response.message || "Không thể cập nhật công việc", { variant: "error" });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      enqueueSnackbar("Lỗi khi cập nhật công việc", { variant: "error" });
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await deleteTask(projectId, sprintId, taskId);
      
      if (response.success) {
        // Xóa task khỏi state
        setTasks((prevTasks) => ({
          todo: prevTasks.todo.filter((task) => task._id !== taskId),
          inProgress: prevTasks.inProgress.filter((task) => task._id !== taskId),
          review: prevTasks.review.filter((task) => task._id !== taskId),
          done: prevTasks.done.filter((task) => task._id !== taskId),
        }));
        
        enqueueSnackbar("Xóa công việc thành công", { variant: "success" });
      } else {
        enqueueSnackbar(response.message || "Không thể xóa công việc", { variant: "error" });
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      enqueueSnackbar("Lỗi khi xóa công việc", { variant: "error" });
    }
  };

  const handleViewTaskDetail = (task) => {
    setSelectedTask(task);
    setOpenEditDialog(true);
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      setCommentLoading(true);
      
      const response = await addTaskComment(projectId, sprintId, taskId, comment);
      
      if (response.success) {
        // Update comments if we are viewing the task
        if (selectedTask && selectedTask._id === taskId) {
          setTaskComments([...taskComments, response.data]);
        }
        
        return response.data;
      } else {
        enqueueSnackbar(response.message || "Không thể thêm bình luận", { variant: "error" });
        return null;
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      enqueueSnackbar("Lỗi khi thêm bình luận", { variant: "error" });
      return null;
    } finally {
      setCommentLoading(false);
    }
  };

  const handleAddAttachment = async (taskId, formData) => {
    try {
      const response = await addTaskAttachment(projectId, sprintId, taskId, formData);
      
      if (response.success) {
        // Update attachments if we are viewing the task
        if (selectedTask && selectedTask._id === taskId) {
          setTaskAttachments([...taskAttachments, response.data]);
        }
        
        enqueueSnackbar("Thêm tệp đính kèm thành công", { variant: "success" });
        return response.data;
      } else {
        enqueueSnackbar(response.message || "Không thể thêm tệp đính kèm", { variant: "error" });
        return null;
      }
    } catch (error) {
      console.error("Error adding attachment:", error);
      enqueueSnackbar("Lỗi khi thêm tệp đính kèm", { variant: "error" });
      return null;
    }
  };

  // Loading and error states
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={3}>
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
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <BackButton label="QUAY LẠI" variant="text" sx={{ mb: 0 }} />
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

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        {/* Chế độ xem */}
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

        {/* Bộ lọc */}
        <Box display="flex" gap={2}>
          <StatusFilter value={statusFilter} onChange={handleStatusFilterChange} />
          <PriorityFilter value={priorityFilter} onChange={handlePriorityFilterChange} />
        </Box>
      </Box>

      {/* Main content */}
      {viewMode === "kanban" ? (
        <KanbanView
          tasks={tasks}
          sensors={sensors}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDragEnd={handleDragEnd}
          handleDragCancel={handleDragCancel}
          isDragActive={isDragActive}
          activeId={activeId}
          activeTask={activeTask}
          setNewTask={setNewTask}
          setOpenCreateDialog={setOpenCreateDialog}
          handleViewTaskDetail={handleViewTaskDetail}
          handleDeleteTask={handleDeleteTask}
          handleAddComment={handleAddComment}
          handleAddAttachment={handleAddAttachment}
          project={project}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
        />
      ) : (
        <ListView
          tasks={tasks}
          handleViewTaskDetail={handleViewTaskDetail}
          handleDeleteTask={handleDeleteTask}
          project={project}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
        />
      )}

      {/* Dialogs */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Tạo công việc mới</DialogTitle>
        <DialogContent>
          <TaskForm
            open={openCreateDialog}
            onClose={() => setOpenCreateDialog(false)}
            onSave={handleCreateTask}
            task={newTask}
            projectId={projectId}
            sprintId={sprintId}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chi tiết công việc</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <TaskForm
              open={openEditDialog}
              onClose={() => setOpenEditDialog(false)}
              onSave={handleUpdateTask}
              task={selectedTask}
              projectId={projectId}
              sprintId={sprintId}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Tasks;