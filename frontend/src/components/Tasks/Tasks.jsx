import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import LoadingIndicator from '../LoadingIndicator';
import ErrorMessage from '../ErrorMessage';
import KanbanView from './KanbanView';
import TaskForm from './TaskForm';
import TaskDetailView from './TaskDetailView';
import useTaskDetail from '../../hooks/useTaskDetail';

const Tasks = () => {
  // Task list state
  const [tasks, setTasks] = useState({ todo: [], inProgress: [], review: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState('kanban');
  
  // Project and filter state
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  
  // Task detail view state
  const {
    selectedTask,
    isDetailDialogOpen,
    handleViewTaskDetail,
    handleCloseTaskDetail
  } = useTaskDetail();

  console.log('Tasks component - Current state:', {
    selectedTask,
    isDetailDialogOpen,
    editTask,
    isEditDialogOpen,
    newTask,
    isCreateDialogOpen
  });

  // Task edit state
  const [editTask, setEditTask] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Task create state
  const [newTask, setNewTask] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Permissions
  const { canCreateTask, canEditTask, canDeleteTask } = usePermissions();
  const { user } = useAuth();

  // Cập nhật trạng thái của task
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      console.log(`Updating task ${taskId} to status ${newStatus}`);
      const { data } = await axios.patch(`/api/tasks/${taskId}/status`, { status: newStatus });
      
      // Cập nhật trực tiếp state để UI cập nhật ngay lập tức
      setTasks(prevTasks => {
        // Tạo một bản sao của state hiện tại
        const newTasks = JSON.parse(JSON.stringify(prevTasks));
        
        // Tìm task trong tất cả các danh sách
        let taskToMove = null;
        let sourceStatus = null;
        
        Object.keys(prevTasks).forEach(status => {
          const taskIndex = prevTasks[status].findIndex(task => task._id === taskId);
          if (taskIndex !== -1) {
            taskToMove = prevTasks[status][taskIndex];
            sourceStatus = status;
          }
        });
        
        if (taskToMove && sourceStatus) {
          // Xóa task khỏi danh sách cũ
          newTasks[sourceStatus] = prevTasks[sourceStatus].filter(task => task._id !== taskId);
          
          // Thêm task vào danh sách mới với status được cập nhật
          const updatedTask = { ...taskToMove, status: newStatus };
          newTasks[newStatus] = [...prevTasks[newStatus], updatedTask];
        }
        
        return newTasks;
      });
      
      toast.success('Cập nhật trạng thái công việc thành công');
      return data;
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Lỗi khi cập nhật trạng thái công việc');
      throw error;
    }
  };

  // Xử lý sắp xếp lại vị trí các task trong cùng một cột
  const handleReorderTasks = (container, taskId, newPosition) => {
    try {
      console.log(`Reordering task ${taskId} in ${container} to position ${newPosition}`);
      
      // Cập nhật UI ngay lập tức với vị trí mới
      setTasks(prevTasks => {
        // Tạo bản sao của state hiện tại
        const newTasks = JSON.parse(JSON.stringify(prevTasks));
        const containerTasks = [...prevTasks[container]];
        
        // Tìm task cần di chuyển
        const taskIndex = containerTasks.findIndex(task => task._id === taskId);
        if (taskIndex === -1) return prevTasks;
        
        // Lấy task ra
        const taskToMove = containerTasks[taskIndex];
        
        // Xóa task khỏi vị trí cũ
        containerTasks.splice(taskIndex, 1);
        
        // Thêm task vào vị trí mới
        containerTasks.splice(newPosition, 0, taskToMove);
        
        // Cập nhật danh sách task cho container
        newTasks[container] = containerTasks;
        
        return newTasks;
      });
      
      // TODO: Gọi API để lưu thứ tự mới nếu cần
      // Hiện tại chỉ cập nhật UI
      
      return true;
    } catch (error) {
      console.error('Error reordering tasks:', error);
      toast.error('Lỗi khi sắp xếp lại công việc');
      return false;
    }
  };

  // Handle editing a task
  const handleEditTask = (task) => {
    console.log('[DEBUG] Tasks.jsx handleEditTask called with task:', task?._id);
    setEditTask(task);
    setIsEditDialogOpen(true);
    handleCloseTaskDetail(); // Close detail dialog when opening edit dialog
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    console.log('[DEBUG] Tasks.jsx handleDeleteTask called with taskId:', taskId);
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      // Update tasks state
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        Object.keys(newTasks).forEach(status => {
          newTasks[status] = newTasks[status].filter(task => task._id !== taskId);
        });
        return newTasks;
      });
      toast.success('Xóa công việc thành công');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Lỗi khi xóa công việc');
    }
  };

  // Handle updating a task
  const handleUpdateTask = async (updatedTask) => {
    try {
      const { data } = await axios.put(`/api/tasks/${updatedTask._id}`, updatedTask);
      
      // Update tasks state
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        Object.keys(newTasks).forEach(status => {
          const taskIndex = newTasks[status].findIndex(task => task._id === updatedTask._id);
          if (taskIndex !== -1) {
            newTasks[status][taskIndex] = data;
          }
        });
        return newTasks;
      });
      
      // Close edit dialog
      setIsEditDialogOpen(false);
      setEditTask(null);
      
      toast.success('Cập nhật công việc thành công');
      return data;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Lỗi khi cập nhật công việc');
      throw error;
    }
  };

  // Handle adding a comment to a task
  const handleAddComment = async (taskId, comment) => {
    try {
      await axios.post(`/api/tasks/${taskId}/comments`, { content: comment });
      toast.success('Thêm bình luận thành công');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Lỗi khi thêm bình luận');
    }
  };

  // Handle adding an attachment to a task
  const handleAddAttachment = async (taskId, formData) => {
    try {
      await axios.post(`/api/tasks/${taskId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Tải lên tệp đính kèm thành công');
    } catch (error) {
      console.error('Error adding attachment:', error);
      toast.error('Lỗi khi tải lên tệp đính kèm');
    }
  };

  // Handle creating a new task
  const handleCreateTask = (status) => {
    setNewTask({
      status,
      title: "",
      description: "",
      priority: "medium",
      startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      assignees: [],
      tags: [],
      estimatedHours: 0,
      project: currentProject?._id,
      sprint: currentProject?.currentSprint?._id,
    });
    setIsCreateDialogOpen(true);
  };

  const renderView = () => {
    if (loading) {
      return <LoadingIndicator />;
    }

    if (error) {
      return <ErrorMessage message={error} />;
    }

    if (viewMode === 'kanban') {
      return (
        <KanbanView
          tasks={tasks}
          setNewTask={setNewTask}
          setOpenCreateDialog={setIsCreateDialogOpen}
          handleViewTaskDetail={handleViewTaskDetail}
          handleEditTask={handleEditTask}
          handleDeleteTask={handleDeleteTask}
          handleAddComment={handleAddComment}
          handleAddAttachment={handleAddAttachment}
          project={currentProject}
          canEditTask={canEditTask}
          canDeleteTask={canDeleteTask}
          updateTaskStatus={updateTaskStatus}
          handleReorderTasks={handleReorderTasks}
        />
      );
    }
  };

  return (
    <>
      {renderView()}
      
      {/* Thứ tự này quan trọng - Dialog với z-index cao hơn nên render sau */}
      
      {/* Task Create Dialog */}
      {newTask && (
        <TaskForm
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          task={newTask}
          project={currentProject}
          onSave={handleCreateTask}
        />
      )}

      {/* Task Edit Dialog */}
      {editTask && (
        <TaskForm
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          task={editTask}
          project={currentProject}
          onSave={handleUpdateTask}
        />
      )}

      {/* Task Detail View - render cuối cùng để hiển thị trên cùng */}
      <TaskDetailView
        open={isDetailDialogOpen}
        onClose={handleCloseTaskDetail}
        task={selectedTask}
        project={currentProject}
        sprint={currentProject?.currentSprint}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        canEdit={true}
        canDelete={true}
      />
    </>
  );
};

export default Tasks; 