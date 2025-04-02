import { useState } from 'react';
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

export const useDragAndDrop = (tasks, updateTaskStatus) => {
  const [activeId, setActiveId] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeTask, setActiveTask] = useState(null);

  // Setup sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Ngưỡng khoảng cách để bắt đầu kéo (theo pixels)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    console.log("Drag start:", active.id);
    
    setActiveId(active.id);
    
    // Tìm task trong tất cả các containers
    let foundContainer = null;
    let foundTask = null;
    
    Object.keys(tasks).forEach((container) => {
      const task = tasks[container].find((task) => task._id === active.id);
      if (task) {
        foundContainer = container;
        foundTask = task;
      }
    });
    
    console.log("Found task in container:", foundContainer, foundTask);
    setActiveContainer(foundContainer);
    setActiveTask(foundTask);
    setIsDragActive(true);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    
    if (!over) return;
    
    console.log("Drag over:", { activeId: active.id, overId: over.id });
    
    // Xóa class drag-over khỏi tất cả các cột
    document.querySelectorAll('.kanban-column').forEach(column => {
      column.classList.remove('drag-over');
    });
    
    // Thêm class drag-over vào cột đích
    // Chỉ xử lý nếu over.id là một trong các trạng thái hợp lệ
    const validStatuses = ['todo', 'inProgress', 'review', 'done'];
    const statusId = over.id;
    
    // Nếu over.id không phải là trạng thái hợp lệ, có thể là ID của task
    // Trong trường hợp này, không thực hiện thêm class drag-over
    if (!validStatuses.includes(statusId)) {
      console.log(`Skipping drag-over for invalid status ID: ${statusId}`);
      return;
    }
    
    // Lấy thẻ có id là statusId (trạng thái hợp lệ)
    let targetElement = document.getElementById(statusId);
    
    if (targetElement) {
      console.log(`Adding drag-over to column with id: ${statusId}`);
      targetElement.classList.add('drag-over');
    } else {
      // Nếu không tìm thấy bằng ID, thử tìm với class <statusId>-column
      targetElement = document.querySelector(`.${statusId}-column`);
      
      if (targetElement) {
        console.log(`Adding drag-over to column with class: ${statusId}-column`);
        targetElement.classList.add('drag-over');
      } else {
        console.warn(`Could not find target element for statusId: ${statusId}`);
      }
    }
  };

  const handleDragEnd = (event) => {
    console.log("Drag end event:", event);
    const { active, over } = event;
    
    // Cleanup UI state
    setIsDragActive(false);
    setActiveId(null);
    
    // Xóa class drag-over khỏi tất cả các cột
    document.querySelectorAll('.kanban-column').forEach(column => {
      column.classList.remove('drag-over');
    });
    
    // Kiểm tra nếu không có vùng thả hoặc không có task được kéo
    if (!active || !over) {
      console.log("Drag cancelled - no active or over");
      setActiveContainer(null);
      setActiveTask(null);
      return;
    }
    
    const taskId = active.id;
    let targetStatusId = over.id;
    
    // Xác định xem targetStatusId có phải là một trạng thái hợp lệ không
    const validStatuses = ['todo', 'inProgress', 'review', 'done'];
    
    // Nếu targetStatusId không phải là một trạng thái hợp lệ, 
    // có thể đang thả vào một task khác. Trong trường hợp này, 
    // ta cần xác định task đó thuộc cột nào
    if (!validStatuses.includes(targetStatusId)) {
      console.log(`Invalid target status ID: ${targetStatusId}, trying to determine container`);
      
      // Thử tìm task trong tất cả các containers
      let foundContainer = null;
      
      Object.keys(tasks).forEach((container) => {
        const task = tasks[container].find((task) => task._id === targetStatusId);
        if (task) {
          foundContainer = container;
        }
      });
      
      if (foundContainer) {
        console.log(`Found target task in container: ${foundContainer}`);
        targetStatusId = foundContainer;
      } else {
        console.warn(`Could not determine container for target: ${targetStatusId}`);
        setActiveContainer(null);
        setActiveTask(null);
        return;
      }
    }
    
    console.log("Drag completed:", { taskId, targetStatusId, sourceContainer: activeContainer });
    
    // Nếu kéo vào cột khác thì mới cập nhật trạng thái
    if (activeContainer !== targetStatusId) {
      console.log(`Updating task status from ${activeContainer} to ${targetStatusId}`);
      updateTaskStatus(taskId, targetStatusId);
    } else {
      console.log("Same container, no status update needed");
    }
    
    setActiveContainer(null);
    setActiveTask(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveContainer(null);
    setIsDragActive(false);
    setActiveTask(null);
    
    // Xóa class drag-over khỏi tất cả các cột
    document.querySelectorAll('.kanban-column').forEach(column => {
      column.classList.remove('drag-over');
    });
  };

  return {
    activeId,
    activeContainer,
    isDragActive,
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  };
};

export default useDragAndDrop; 