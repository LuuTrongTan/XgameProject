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
    const validStatuses = ['todo', 'inProgress', 'done'];
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
    const validStatuses = ['todo', 'inProgress', 'done'];
    
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
    // ========= TRƯỜNG HỢP 2: Kéo sang cột khác - xác định vị trí dựa vào con trỏ chuột =========
    else {
      // Lấy vị trí con trỏ chuột
      if (event.activatorEvent && ('clientY' in event.activatorEvent)) {
        const { clientY, clientX } = event.activatorEvent;
        console.log(`[DragEnd] Pointer position: X=${clientX}, Y=${clientY}`);
        
        // Tìm cột đích trong DOM
        const targetColumn = document.querySelector(`.${targetStatusId}-column`);
        
        if (targetColumn) {
          console.log(`[DragEnd] Found target column: ${targetStatusId}`);
          // Lấy thông tin bounding box của cột đích
          const columnRect = targetColumn.getBoundingClientRect();
          console.log(`[DragEnd] Column bounding box:`, {
            top: columnRect.top,
            bottom: columnRect.bottom,
            left: columnRect.left,
            right: columnRect.right,
            height: columnRect.height,
            width: columnRect.width
          });
          
          // Vị trí tương đối của con trỏ trong cột
          const relativeY = clientY - columnRect.top;
          const relativeYPercent = (relativeY / columnRect.height) * 100;
          console.log(`[DragEnd] Relative position in column: Y=${relativeY}px (${relativeYPercent.toFixed(2)}%)`);
          
          // Lấy tất cả các task card trong cột đích
          const taskCards = Array.from(targetColumn.querySelectorAll('.task-card'));
          console.log(`[DragEnd] Found ${taskCards.length} task cards in column`);
          
          // Kiểm tra nếu không có task card hoặc con trỏ ở dưới task card cuối cùng
          let insertAtEnd = false;
          
          if (taskCards.length === 0) {
            console.log(`[DragEnd] No cards in column, placing at end`);
            insertAtEnd = true;
          } else {
            // Lấy vị trí của task card cuối cùng
            const lastCard = taskCards[taskCards.length - 1];
            const lastCardRect = lastCard.getBoundingClientRect();
            
            // Nếu con trỏ nằm dưới task card cuối cùng, đặt vào cuối
            if (clientY > lastCardRect.bottom) {
              console.log(`[DragEnd] Pointer (${clientY}) is below last card (${lastCardRect.bottom}), placing at end`);
              insertAtEnd = true;
            }
          }
          
          if (insertAtEnd) {
            // Lấy vị trí cuối cùng
            const sortedTasks = [...tasksInTargetColumn].sort((a, b) => a.position - b.position);
            if (sortedTasks.length === 0) {
              newPosition = 0;
            } else {
              const lastTaskPosition = sortedTasks[sortedTasks.length - 1].position;
              newPosition = lastTaskPosition + 1;
            }
            console.log(`[DragEnd] Inserting at end, using position: ${newPosition}`);
            
            // Skip normal position detection
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
            return;
          }
          
          // Sắp xếp taskCards theo vị trí Y (từ trên xuống dưới)
          const sortedCards = taskCards.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return rectA.top - rectB.top;
          });
          
          // In ra vị trí của các card để debug
          if (sortedCards.length > 0) {
            console.log('[DragEnd] Task cards positions:');
            sortedCards.forEach((card, index) => {
              const rect = card.getBoundingClientRect();
              const taskId = card.getAttribute('data-task-id') || card.getAttribute('id') || `unknown-${index}`;
              const cardMiddleY = rect.top + rect.height / 2;
              console.log(`  Card #${index}: Task=${taskId}, Y=${rect.top}-${rect.bottom}, Middle=${cardMiddleY}`);
            });
          }
          
          // Tìm task card đầu tiên mà con trỏ chuột đang ở bên trên nó
          let insertIndex = 0;
          let foundPosition = false;
          
          for (let i = 0; i < sortedCards.length; i++) {
            const rect = sortedCards[i].getBoundingClientRect();
            const cardMiddleY = rect.top + rect.height / 2;
            
            console.log(`[DragEnd] Checking card #${i}: clientY=${clientY} < cardMiddleY=${cardMiddleY} = ${clientY < cardMiddleY}`);
            
            if (clientY < cardMiddleY) {
              // Nếu con trỏ ở trên điểm giữa card thì chèn trước card đó
              insertIndex = i;
              foundPosition = true;
              console.log(`[DragEnd] Pointer is above the middle of card #${i}, inserting at index ${insertIndex}`);
              break;
            }
          }
          
          if (!foundPosition) {
            // Nếu không tìm thấy vị trí phù hợp, đặt ở cuối danh sách
            insertIndex = sortedCards.length;
            console.log(`[DragEnd] Pointer is below all cards, inserting at end (index ${insertIndex})`);
          }
          
          console.log(`[DragEnd] Final insert index: ${insertIndex} of ${sortedCards.length} tasks`);
          
          // Map insertIndex (vị trí hiển thị) sang position (vị trí trong cơ sở dữ liệu)
          const sortedTasks = [...tasksInTargetColumn].sort((a, b) => a.position - b.position);
          console.log(`[DragEnd] Sorted tasks in target column:`, sortedTasks.map(t => ({id: t._id, position: t.position})));
          
          if (sortedTasks.length === 0) {
            // Nếu cột trống, đặt ở vị trí 0
            newPosition = 0;
            console.log(`[DragEnd] Empty column, using position: ${newPosition}`);
          } else if (insertIndex === 0) {
            // Nếu chèn vào đầu danh sách - đặt position = 0
            newPosition = 0;
            console.log(`[DragEnd] Inserting at beginning, using position: ${newPosition}`);
            // Backend sẽ tự động +1 vào các task khác
          } else if (insertIndex >= sortedTasks.length) {
            // Nếu chèn vào cuối danh sách
            const lastTaskPosition = sortedTasks[sortedTasks.length - 1].position;
            newPosition = lastTaskPosition + 1;
            console.log(`[DragEnd] Inserting at end, using position: ${newPosition} (last + 1)`);
          } else {
            // Nếu chèn vào giữa danh sách - lấy position của task tại vị trí chèn
            newPosition = sortedTasks[insertIndex].position;
            console.log(`[DragEnd] Inserting in middle, using position: ${newPosition} (same as task at index ${insertIndex})`);
            // Backend sẽ tự động +1 position của các task từ vị trí này trở đi
          }
          
          console.log(`[DragEnd] Calculated new position: ${newPosition} at index ${insertIndex}`);
        } else {
          // Nếu không tìm thấy cột đích trong DOM, đặt ở cuối
          const sortedTasks = [...tasksInTargetColumn].sort((a, b) => a.position - b.position);
          const lastTask = sortedTasks[sortedTasks.length - 1];
          newPosition = lastTask ? (lastTask.position + 1) : 0;
          console.log(`[DragEnd] Could not find target column in DOM, placing at end with position: ${newPosition}`);
        }
      } else {
        // Nếu không có thông tin con trỏ chuột, đặt ở cuối cột
        const sortedTasks = [...tasksInTargetColumn].sort((a, b) => a.position - b.position);
        const lastTask = sortedTasks[sortedTasks.length - 1];
        newPosition = lastTask ? (lastTask.position + 1) : 0;
        console.log(`[DragEnd] No pointer position info, placing at end with position: ${newPosition}`);
      }
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