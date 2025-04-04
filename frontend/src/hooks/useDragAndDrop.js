import { useState, useEffect, useCallback } from 'react';
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';

/**
 * Custom hook để quản lý logic kéo thả
 * @param {Object} tasks - Object chứa các task theo trạng thái
 * @param {Function} updateTaskStatus - Hàm cập nhật trạng thái task
 * @param {Function} onReorder - Hàm sắp xếp lại task trong cùng trạng thái
 * @returns {Object} - Object chứa các state và handler cho kéo thả
 */
export const useDragAndDrop = (tasks, updateTaskStatus, onReorder) => {
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [activeContainer, setActiveContainer] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  // Cảm biến chuột và bàn phím cho kéo thả
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event) => {
        return {
          x: 0,
          y: 0,
        };
      },
    })
  );

  /**
   * Lấy task từ id
   * @param {string} id - ID của task
   * @returns {Object|null} - Task object hoặc null nếu không tìm thấy
   */
  const getTaskById = useCallback((id) => {
    if (!id) return null;
    
    // Duyệt qua tất cả các danh sách task để tìm task với id tương ứng
    let foundTask = null;
    
    Object.keys(tasks).forEach((status) => {
      const task = tasks[status].find(task => task._id === id);
      if (task) foundTask = task;
    });
    
    return foundTask;
  }, [tasks]);

  /**
   * Xác định cột dựa trên id hoặc data-status attribute
   * @param {HTMLElement|string} element - Element hoặc id của element
   * @returns {string|null} - ID của cột hoặc null nếu không tìm thấy
   */
  const determineColumn = useCallback((element) => {
    if (!element) return null;

    // Nếu element là string, coi nó là id hoặc status
    if (typeof element === 'string') {
      // Kiểm tra nếu đó là một trong các trạng thái hợp lệ
      if (['todo', 'inProgress', 'review', 'done'].includes(element)) {
        return element;
      }
      
      // Nếu là id của phần tử "empty" như "empty-todo", trích xuất phần status
      if (element.startsWith('empty-')) {
        const status = element.substring(6); // Lấy phần sau "empty-"
        if (['todo', 'inProgress', 'review', 'done'].includes(status)) {
          return status;
        }
      }
      
      // Nếu không, tìm element theo id
      const el = document.getElementById(element);
      return determineColumn(el);
    }

    // Kiểm tra element trực tiếp
    const status = element.getAttribute('data-status');
    const columnId = element.getAttribute('id');
    const droppableId = element.getAttribute('data-droppable-id');
    
    if (status && ['todo', 'inProgress', 'review', 'done'].includes(status)) {
      return status;
    }
    
    if (droppableId) {
      return droppableId;
    }
    
    if (columnId && ['todo', 'inProgress', 'review', 'done'].includes(columnId)) {
      return columnId;
    }
    
    // Kiểm tra nếu columnId bắt đầu bằng "empty-"
    if (columnId && columnId.startsWith('empty-')) {
      const status = columnId.substring(6); // Lấy phần sau "empty-"
      if (['todo', 'inProgress', 'review', 'done'].includes(status)) {
        return status;
      }
    }
    
    // Tìm parent element gần nhất có data-status
    let current = element;
    while (current && current !== document.body) {
      const parentStatus = current.getAttribute('data-status');
      const parentId = current.getAttribute('id');
      const parentDroppableId = current.getAttribute('data-droppable-id');
      
      if (parentStatus && ['todo', 'inProgress', 'review', 'done'].includes(parentStatus)) {
        return parentStatus;
      }
      
      if (parentDroppableId) {
        return parentDroppableId;
      }
      
      if (parentId && ['todo', 'inProgress', 'review', 'done'].includes(parentId)) {
        return parentId;
      }
      
      // Kiểm tra nếu parentId bắt đầu bằng "empty-"
      if (parentId && parentId.startsWith('empty-')) {
        const status = parentId.substring(6); // Lấy phần sau "empty-"
        if (['todo', 'inProgress', 'review', 'done'].includes(status)) {
          return status;
        }
      }
      
      current = current.parentElement;
    }
    
    // Kiểm tra trường hợp đặc biệt - thả vào phần tử "task-list" hoặc CardContent
    // trong trường hợp cột không có task nào
    console.log("Không tìm thấy cột trực tiếp, kiểm tra cột container gần nhất...");
    const columns = document.querySelectorAll('.kanban-column');
    for (const column of columns) {
      const rect = column.getBoundingClientRect();
      if (element.nodeType === 1) { // Là một DOM element
        const elemRect = element.getBoundingClientRect();
        // Kiểm tra nếu element nằm trong cột
        if (
          elemRect.left >= rect.left && 
          elemRect.right <= rect.right && 
          elemRect.top >= rect.top && 
          elemRect.bottom <= rect.bottom
        ) {
          const colStatus = column.getAttribute('data-status') || 
                           column.getAttribute('data-droppable-id') || 
                           column.getAttribute('id');
          console.log("Tìm thấy cột chứa từ vị trí:", colStatus);
          return colStatus;
        }
      } else if (typeof element === 'object' && element.clientX !== undefined) {
        // Là một event với tọa độ
        if (
          element.clientX >= rect.left &&
          element.clientX <= rect.right &&
          element.clientY >= rect.top &&
          element.clientY <= rect.bottom
        ) {
          const colStatus = column.getAttribute('data-status') || 
                           column.getAttribute('data-droppable-id') || 
                           column.getAttribute('id');
          console.log("Tìm thấy cột chứa từ tọa độ:", colStatus);
          return colStatus;
        }
      }
    }
    
    return null;
  }, []);

  /**
   * Tìm vị trí mới cho task trong cùng một cột
   * @param {Array} columnTasks - Array các task trong một cột
   * @param {string} activeTaskId - ID của task đang được kéo
   * @param {number} overTaskIndex - Index của task đang được thả lên
   * @returns {number} - Vị trí mới của task
   */
  const findNewPosition = useCallback((columnTasks, activeTaskId, overTaskIndex) => {
    // Vị trí hiện tại của task đang kéo
    const currentIndex = columnTasks.findIndex(task => task._id === activeTaskId);
    
    // Nếu thả lên chính nó, giữ nguyên vị trí
    if (currentIndex === overTaskIndex) {
      return currentIndex;
    }
    
    // Nếu thả xuống dưới, vị trí mới sẽ là vị trí của overTask
    if (currentIndex < overTaskIndex) {
      return overTaskIndex;
    }
    
    // Nếu thả lên trên, vị trí mới sẽ là vị trí của overTask
    return overTaskIndex;
  }, []);

  /**
   * Xử lý khi bắt đầu kéo task
   * @param {Object} event - Sự kiện kéo
   */
  const handleDragStart = useCallback((event) => {
    console.log('Drag start:', event);
    const { active } = event;
    const id = active.id;
    const task = getTaskById(id);
    
    if (task) {
      setActiveId(id);
      setActiveTask(task);
      setActiveContainer(task.status);
      setIsDragActive(true);
      console.log(`Drag started: Task ${id} (${task.title}) from ${task.status}`);
    } else {
      console.warn(`Could not find task with id ${id}`);
    }
  }, [getTaskById]);

  /**
   * Xử lý khi kéo task qua các element
   * @param {Object} event - Sự kiện kéo
   */
  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    
    if (!active || !over) {
      console.log("[DragOver] Không có active hoặc over");
      return;
    }
    
    console.log("[DragOver]", {
      activeId: active.id,
      overId: over.id,
    });
    
    // Xóa class drag-over khỏi tất cả các cột
    document.querySelectorAll('.kanban-column').forEach(column => {
      column.classList.remove('drag-over');
    });
    
    // Kiểm tra overId là một trong các trạng thái hợp lệ
    const validStatuses = ['todo', 'inProgress', 'review', 'done'];
    const statusId = over.id;
    
    if (!validStatuses.includes(statusId)) {
      console.warn(`[DragOver] Trạng thái không hợp lệ: ${statusId}`);
      return;
    }
    
    console.log(`[DragOver] Thêm class drag-over cho cột: ${statusId}`);
    
    // Thêm class drag-over cho cột tương ứng
    const targetElements = document.querySelectorAll(
      `[id="${statusId}"], [data-status="${statusId}"], [data-droppable-id="${statusId}"], .${statusId}-column`
    );
    
    if (targetElements.length > 0) {
      targetElements.forEach(element => {
        if (element.classList.contains('kanban-column')) {
          element.classList.add('drag-over');
        }
      });
    } else {
      console.warn(`[DragOver] Không tìm thấy cột có id/status: ${statusId}`);
    }
  }, []);

  /**
   * Xử lý khi kết thúc kéo task
   * @param {Object} event - Sự kiện kéo
   */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    console.log("[DragEnd]", {
      activeId: active?.id,
      overId: over?.id
    });
    
    // Xóa class drag-over khỏi tất cả các cột
    document.querySelectorAll('.kanban-column').forEach(column => {
      column.classList.remove('drag-over');
    });
    
    // Reset empty placeholders
    document.querySelectorAll('.empty-column-placeholder').forEach(placeholder => {
      placeholder.style.backgroundColor = '';
      placeholder.style.border = '';
      placeholder.style.transform = '';
    });
    
    if (!active || !over) {
      console.log("[DragEnd] Không có active hoặc over");
      setActiveId(null);
      setActiveTask(null);
      setActiveContainer(null);
      setIsDragActive(false);
      return;
    }
    
    const activeId = active.id;
    const activeTask = getTaskById(activeId);

    if (!activeTask) {
      console.warn(`[DragEnd] Không tìm thấy task với id ${activeId}`);
      setActiveId(null);
      setActiveTask(null);
      setActiveContainer(null);
      setIsDragActive(false);
      return;
    }
    
    // Kiểm tra overId là một trong các trạng thái hợp lệ
    const validStatuses = ['todo', 'inProgress', 'review', 'done'];
    const targetStatus = over.id;
    
    if (!validStatuses.includes(targetStatus)) {
      console.error(`[DragEnd] Trạng thái không hợp lệ: ${targetStatus}`);
      setActiveId(null);
      setActiveTask(null);
      setActiveContainer(null);
      setIsDragActive(false);
      return;
    }
    
    console.log(`[DragEnd] Task ${activeId} thả vào cột ${targetStatus} (trạng thái hiện tại: ${activeTask.status})`);
    
    // Cập nhật trạng thái task nếu kéo sang cột khác
    if (activeTask.status !== targetStatus) {
      console.log(`[DragEnd] Cập nhật task ${activeId} từ ${activeTask.status} -> ${targetStatus}`);
      updateTaskStatus(activeId, targetStatus);
    }
    
    // Reset trạng thái kéo thả
    setActiveId(null);
    setActiveTask(null);
    setActiveContainer(null);
    setIsDragActive(false);
  }, [getTaskById, updateTaskStatus]);

  /**
   * Xử lý khi hủy kéo task
   */
  const handleDragCancel = useCallback(() => {
    console.log('Drag cancelled');
    
    // Xóa highlight khỏi tất cả các cột
    document.querySelectorAll('.kanban-column').forEach(column => {
      column.classList.remove('drag-over');
    });
    
    // Reset style cho các placeholder trống
    document.querySelectorAll('.empty-column-placeholder').forEach(placeholder => {
      placeholder.style.backgroundColor = 'rgba(0,0,0,0.02)';
      placeholder.style.border = '1px dashed rgba(0,0,0,0.1)';
      placeholder.style.transform = 'none';
    });
    
    // Reset states
    setActiveId(null);
    setActiveTask(null);
    setActiveContainer(null);
    setIsDragActive(false);
  }, []);

  // Log ra tasks khi tasks thay đổi để debug
  useEffect(() => {
    console.log('Tasks updated:', tasks);
  }, [tasks]);

  return {
    sensors,
    activeId,
    activeTask,
    isDragActive,
    activeContainer,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  };
}; 