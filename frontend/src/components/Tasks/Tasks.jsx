import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../contexts/PermissionsContext';
import LoadingIndicator from '../LoadingIndicator';
import ErrorMessage from '../ErrorMessage';
import KanbanView from './KanbanView';

const Tasks = () => {
  const [tasks, setTasks] = useState({ todo: [], inProgress: [], review: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTask, setNewTask] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const { user } = useAuth();

  const { canCreateTask, canEditTask, canDeleteTask } = usePermissions();

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
          setOpenCreateDialog={setOpenCreateDialog}
          handleViewTaskDetail={handleEditTask}
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

    // ... rest of code ...
  };

  // ... rest of code ...
};

export default Tasks; 