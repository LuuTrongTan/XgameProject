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
import TaskDetailView from "../../components/Tasks/TaskDetailView";

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
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
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
  
  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!projectId || !sprintId) {
      console.error("Missing projectId or sprintId");
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Fetching tasks for project ${projectId} and sprint ${sprintId}`);
      const tasksData = await getSprintTasks(projectId, sprintId);
      
      if (tasksData.success) {
        // Group tasks by status
        const tasksByStatus = {
          todo: [],
          inProgress: [],
          review: [], 
          done: [],
        };
        
        tasksData.data.forEach((task) => {
          const status = task.status || "todo";
          if (tasksByStatus[status]) {
            tasksByStatus[status].push(task);
          } else {
            tasksByStatus.todo.push({ ...task, status: "todo" });
          }
        });
        
        // Sắp xếp tasks theo position
        Object.keys(tasksByStatus).forEach(status => {
          tasksByStatus[status].sort((a, b) => (a.position || 0) - (b.position || 0));
        });
        
        setTasks(tasksByStatus);
      } else {
        setError(tasksData.message || "Không thể tải công việc");
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Lỗi khi tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  }, [projectId, sprintId]);

  // Hàm helper để tiếp tục cập nhật trạng thái
  const continueUpdateStatus = useCallback(async (taskToUpdate, oldStatus, newStatus, position, taskProjectId, taskSprintId) => {
    try {
      // Cập nhật UI trước khi gọi API
      setTasks((prevTasks) => {
        // Clone object trạng thái hiện tại
        const newTasks = { ...prevTasks };
        
        // Xóa task khỏi trạng thái cũ
        newTasks[oldStatus] = newTasks[oldStatus].filter(
          (task) => task._id !== taskToUpdate._id
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
      
      // Chuẩn bị dữ liệu cần gửi đến API
      const apiParams = {
        taskId: taskToUpdate._id,
        status: newStatus,
        position: position,
        projectId: taskProjectId,
        sprintId: taskSprintId
      };
      
      // Nếu cập nhật cả actualHours (khi chuyển sang done), thêm vào API params
      if (newStatus === "done" && taskToUpdate.actualHours !== undefined) {
        // Gọi updateTask API thay vì updateTaskStatus để cập nhật cả actualHours
        const updateResponse = await updateTask(
          taskProjectId, 
          taskSprintId, 
          taskToUpdate._id, 
          { 
            status: newStatus, 
            actualHours: taskToUpdate.actualHours,
            // Đảm bảo các trường quan trọng khác vẫn được giữ nguyên
            title: taskToUpdate.title,
            description: taskToUpdate.description || "",
            priority: taskToUpdate.priority || "medium"
          }
        );
        
        if (!updateResponse.success) {
          console.error("Failed to update task:", updateResponse.message);
          enqueueSnackbar("Không thể cập nhật thông tin công việc: " + updateResponse.message, { variant: "error" });
          fetchTasks(); // Tải lại dữ liệu để khôi phục trạng thái
          return;
        }
      } else {
        // Nếu chỉ cập nhật trạng thái, gọi updateTaskStatus API
        const response = await updateTaskStatus(apiParams);
        
        if (!response.success) {
          // Nếu API thất bại, rollback lại UI
          console.error("Failed to update task status:", response.message);
          enqueueSnackbar("Không thể cập nhật trạng thái công việc: " + response.message, { variant: "error" });
          fetchTasks(); // Tải lại dữ liệu để khôi phục trạng thái
          return;
        }
      }
      
      enqueueSnackbar("Cập nhật trạng thái thành công", { variant: "success" });
    } catch (error) {
      console.error("Error in continueUpdateStatus:", error);
      enqueueSnackbar("Lỗi khi cập nhật công việc", { variant: "error" });
      fetchTasks(); // Tải lại dữ liệu để khôi phục trạng thái
    }
  }, [updateTask, updateTaskStatus, enqueueSnackbar, fetchTasks]);
  
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
        
        // Đảm bảo sprintId là string, không phải object
        if (params.sprintId) {
          if (typeof params.sprintId === 'object' && params.sprintId._id) {
            taskSprintId = params.sprintId._id; // Lấy ID từ object
            console.log(`Đã chuyển đổi sprintId từ object sang ID: ${taskSprintId}`);
          } else {
            taskSprintId = String(params.sprintId); // Đảm bảo là string
          }
        } else {
          // Nếu không có params.sprintId, sử dụng giá trị từ props
          taskSprintId = typeof sprintId === 'object' ? sprintId._id : sprintId;
        }
      } else {
        // Định dạng cũ, nhận 2 tham số riêng biệt
        taskId = params;
        newStatus = arguments[1];
        taskProjectId = projectId;
        // Đảm bảo sprintId là string, không phải object
        taskSprintId = typeof sprintId === 'object' ? sprintId._id : sprintId;
      }
      
      console.log(`Updating task ${taskId} to status ${newStatus} at position ${position}`);
      console.log(`Using projectId: ${taskProjectId}, sprintId: ${taskSprintId}`);
      
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
      
      // Kiểm tra xem trạng thái mới có phải là "done" không và trạng thái cũ không phải "done"
      if (newStatus === "done" && oldStatus !== "done") {
        // Hiển thị dialog nhập thời gian
        return new Promise((resolve) => {
          // Tạo dialog sử dụng DOM API
          const dialog = document.createElement('dialog');
          dialog.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10000; padding: 20px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); border: none; background: white; min-width: 300px;';
          
          dialog.innerHTML = `
            <h3 style="margin-top: 0; color: #1976d2;">Nhập thời gian đã làm</h3>
            <p style="color: #666;">Vui lòng nhập thời gian bạn đã dành để hoàn thành công việc này.</p>
            <div style="margin: 20px 0;">
              <label style="display: block; margin-bottom: 5px; font-weight: 500;">Thời gian đã làm (giờ):</label>
              <input type="number" id="actualHours" value="${taskToUpdate.actualHours || 0}" min="0" step="0.5" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
              <button id="skipBtn" style="padding: 8px 16px; background: #f5f5f5; border: none; border-radius: 4px; cursor: pointer;">Bỏ qua</button>
              <button id="saveBtn" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Lưu thời gian</button>
            </div>
          `;
          
          document.body.appendChild(dialog);
          dialog.showModal();
          
          // Xử lý sự kiện nút bỏ qua
          dialog.querySelector('#skipBtn').addEventListener('click', () => {
            dialog.close();
            document.body.removeChild(dialog);
            
            // Tiếp tục cập nhật trạng thái mà không thay đổi thời gian
            continueUpdateStatus(taskToUpdate, oldStatus, newStatus, position, taskProjectId, taskSprintId);
            resolve();
          });
          
          // Xử lý sự kiện nút lưu
          dialog.querySelector('#saveBtn').addEventListener('click', () => {
            const actualHours = parseFloat(dialog.querySelector('#actualHours').value);
            dialog.close();
            document.body.removeChild(dialog);
            
            // Cập nhật cả thời gian và trạng thái
            continueUpdateStatus(
              {...taskToUpdate, actualHours}, 
              oldStatus, 
              newStatus, 
              position, 
              taskProjectId, 
              taskSprintId
            );
            resolve();
          });
        });
      }
      
      // Nếu không phải chuyển sang trạng thái "done", cập nhật bình thường
      return continueUpdateStatus(taskToUpdate, oldStatus, newStatus, position, taskProjectId, taskSprintId);
    } catch (error) {
      console.error("Error updating task status:", error);
      enqueueSnackbar("Lỗi khi cập nhật trạng thái công việc", { variant: "error" });
      
      fetchTasks(); // Tải lại dữ liệu để khôi phục trạng thái
    }
  }, [projectId, sprintId, tasks, enqueueSnackbar, fetchTasks, continueUpdateStatus]);

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
    console.log("Opening task detail for:", {
      taskId: task._id, 
      taskTitle: task.title,
      sprintData: task.sprint,
      hasSprintName: task.sprint?.name ? true : false
    });
    setSelectedTask(task);
    setOpenDetailDialog(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setOpenEditDialog(true);
    setOpenDetailDialog(false);
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
        <Box display="flex" alignItems="center">
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
          
          {/* Chú thích về thanh cuộn */}
          {viewMode === "kanban" && (
            <Typography 
              variant="caption" 
              color="error.main"
              sx={{ 
                ml: 2,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
                px: 1.5,
                py: 0.75,
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: '1px dashed rgba(211, 47, 47, 0.5)',
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: 'error.main',
                  mr: 1
                }} 
              />
              Thanh cuộn cột chỉ có thể kéo, không thể cuộn
            </Typography>
          )}
        </Box>

        {/* Bộ lọc */}
        <Box display="flex" gap={2}>
          <StatusFilter value={statusFilter} onChange={handleStatusFilterChange} />
          <PriorityFilter value={priorityFilter} onChange={handlePriorityFilterChange} />
        </Box>
      </Box>

      {/* Main content */}
      {viewMode === "kanban" ? (
        <KanbanView
          tasks={Object.keys(tasks).reduce((filtered, status) => {
            // Lọc các task theo trạng thái và độ ưu tiên
            filtered[status] = tasks[status].filter(task => 
              (statusFilter === 'all' || task.status === statusFilter) && 
              (priorityFilter === 'all' || task.priority === priorityFilter)
            );
            return filtered;
          }, {todo: [], inProgress: [], done: []})}
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
          tasks={Object.keys(tasks).reduce((filtered, status) => {
            // Lọc các task theo trạng thái và độ ưu tiên
            filtered[status] = tasks[status].filter(task => 
              (statusFilter === 'all' || task.status === statusFilter) && 
              (priorityFilter === 'all' || task.priority === priorityFilter)
            );
            return filtered;
          }, {todo: [], inProgress: [], done: []})}
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

      {/* Task Detail View */}
      {selectedTask && (
        <TaskDetailView
          open={openDetailDialog}
          onClose={() => setOpenDetailDialog(false)}
          task={selectedTask}
          project={project}
          sprint={sprint}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          canEdit={canEditTask ? canEditTask(selectedTask, project) : true}
          canDelete={canDeleteTask ? canDeleteTask(selectedTask, project) : true}
        />
      )}
    </Box>
  );
};

export default Tasks;