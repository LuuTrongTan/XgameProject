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
    console.log("[DragEnd] Event:", event);
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
      console.log("[DragEnd] Drag cancelled - no active or over");
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
      console.log(`[DragEnd] Invalid target status ID: ${targetStatusId}, trying to determine container`);
      
      // Thử tìm task trong tất cả các containers
      let foundContainer = null;
      
      Object.keys(tasks).forEach((container) => {
        const task = tasks[container].find((task) => task._id === targetStatusId);
        if (task) {
          foundContainer = container;
        }
      });
      
      if (foundContainer) {
        console.log(`[DragEnd] Found target task in container: ${foundContainer}`);
        targetStatusId = foundContainer;
      } else {
        // Nếu không tìm thấy container, xác định dựa vào vị trí con trỏ theo chiều ngang
        if (event.activatorEvent && 'clientX' in event.activatorEvent) {
          const { clientX } = event.activatorEvent;
          const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
          const columnWidth = viewportWidth / validStatuses.length;
          
          let columnIndex = Math.floor(clientX / columnWidth);
          // Đảm bảo index nằm trong phạm vi hợp lệ
          columnIndex = Math.max(0, Math.min(validStatuses.length - 1, columnIndex));
          
          targetStatusId = validStatuses[columnIndex];
          console.log(`[DragEnd] Using column based on pointer position (X): ${targetStatusId}`);
        } else {
          console.warn(`[DragEnd] Could not determine container, defaulting to current container`);
          targetStatusId = activeContainer || 'todo';
        }
      }
    }
    
    // Xác định cột nguồn và vị trí cũ trong cột nguồn
    const sourceContainer = activeContainer;
    const oldPosition = sourceContainer ? 
      tasks[sourceContainer].findIndex(task => task._id === taskId) : -1;
    
    console.log(`[DragEnd] Task ${taskId} being moved from ${sourceContainer}[${oldPosition}] to ${targetStatusId}`);
    
    // Lấy danh sách task trong cột đích (đã lọc bỏ task đang kéo nếu cùng cột)
    const tasksInTargetColumn = (targetStatusId === sourceContainer) 
      ? tasks[targetStatusId].filter(task => task._id !== taskId) 
      : (tasks[targetStatusId] || []);
    
    // Tính toán position của task dựa vào vị trí con trỏ chuột
    let newPosition;
    
    // ========= TRƯỜNG HỢP 1: Kéo trong cùng cột - giữ vị trí hiện tại =========
    if (sourceContainer === targetStatusId) {
      newPosition = oldPosition;
      console.log(`[DragEnd] Moving within same column - keeping position: ${newPosition}`);
    }
    // ========= TRƯỜNG HỢP 2: Kéo sang cột khác - luôn đặt ở cuối cột =========
    else {
      // Khi kéo sang cột khác, luôn đặt ở cuối cột để tránh nhầm lẫn
      const sortedTasks = [...tasksInTargetColumn].sort((a, b) => a.position - b.position);
      const lastTask = sortedTasks[sortedTasks.length - 1];
      newPosition = lastTask ? (lastTask.position + 1) : 0;
      console.log(`[DragEnd] Moving to another column - placing at end with position: ${newPosition}`);
    }
    
    console.log(`[DragEnd] Final: Moving task from ${sourceContainer}[${oldPosition}] to ${targetStatusId}[${newPosition}]`);
    
    // Gọi API để cập nhật
    updateTaskStatus({
      taskId,
      status: targetStatusId,
      position: newPosition,
      projectId: activeTask?.project?._id, 
      sprintId: activeTask?.sprint
    });
    
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