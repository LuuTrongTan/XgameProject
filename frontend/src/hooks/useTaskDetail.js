import { useState, useEffect } from 'react';

export const useTaskDetail = () => {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  useEffect(() => {
    console.log('useTaskDetail initialized');
    
    return () => {
      console.log('useTaskDetail cleanup');
    };
  }, []);

  const handleViewTaskDetail = (task) => {
    console.log('[DEBUG] useTaskDetail.handleViewTaskDetail called with task:', task._id);
    setSelectedTask(task);
    
    // Thêm setTimeout để đảm bảo state được cập nhật trước khi tiếp tục
    setTimeout(() => {
      console.log('[DEBUG] Setting isDetailDialogOpen to true');
      setIsDetailDialogOpen(true);
      
      // Check sau 100ms xem state đã thay đổi chưa
      setTimeout(() => {
        console.log('[DEBUG] After 100ms, isDetailDialogOpen =', isDetailDialogOpen);
      }, 100);
    }, 0);
  };

  const handleCloseTaskDetail = () => {
    console.log('handleCloseTaskDetail called');
    setSelectedTask(null);
    setIsDetailDialogOpen(false);
    console.log('isDetailDialogOpen set to false');
  };

  return {
    selectedTask,
    isDetailDialogOpen,
    handleViewTaskDetail,
    handleCloseTaskDetail
  };
};

export default useTaskDetail; 