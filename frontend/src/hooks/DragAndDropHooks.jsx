const handleDragOver = (event) => {
  const { active, over } = event;
  
  console.log("[DragOver] Event:", { 
    activeId: active?.id, 
    overId: over?.id,
    pointer: event.activatorEvent ? {
      x: event.activatorEvent.clientX,
      y: event.activatorEvent.clientY
    } : 'unknown'
  });
  
  if (!over) {
    console.log("[DragOver] No over element detected");
    
    // Trong trường hợp không có over element, xác định cột theo vị trí con trỏ
    if (event.activatorEvent && 'clientX' in event.activatorEvent) {
      const { clientX } = event.activatorEvent;
      const validStatuses = ['todo', 'inProgress', 'review', 'done'];
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const columnWidth = viewportWidth / 4;
      let columnIndex = Math.floor(clientX / columnWidth);
      columnIndex = Math.max(0, Math.min(3, columnIndex));
      
      // Map từ index sang status
      const fallbackStatusId = validStatuses[columnIndex];
      console.log(`[DragOver] Using fallback status based on pointer position: ${fallbackStatusId}`);
      
      // Xóa class drag-over khỏi tất cả các cột
      document.querySelectorAll('.kanban-column').forEach(column => {
        column.classList.remove('drag-over');
      });
      
      // Thêm class drag-over vào cột tương ứng
      const targetElement = document.getElementById(fallbackStatusId);
      if (targetElement) {
        targetElement.classList.add('drag-over');
      }
    }
    
    return;
  }
  
  // Xóa class drag-over khỏi tất cả các cột
  document.querySelectorAll('.kanban-column').forEach(column => {
    column.classList.remove('drag-over');
  });
  
  // Thêm class drag-over vào cột đích
  // Chỉ xử lý nếu over.id là một trong các trạng thái hợp lệ
  const validStatuses = ['todo', 'inProgress', 'review', 'done'];
  const statusId = over.id;
  
  if (!validStatuses.includes(statusId)) {
    console.log(`[DragOver] Skipping drag-over for invalid status ID: ${statusId}`);
    
    // Thử tìm cột kanban theo vị trí con trỏ
    if (event.activatorEvent && 'clientX' in event.activatorEvent) {
      const { clientX } = event.activatorEvent;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const columnWidth = viewportWidth / 4;
      let columnIndex = Math.floor(clientX / columnWidth);
      columnIndex = Math.max(0, Math.min(3, columnIndex));
      
      // Map từ index sang status
      const fallbackStatusId = validStatuses[columnIndex];
      console.log(`[DragOver] Using fallback status based on pointer position: ${fallbackStatusId}`);
      
      // Thêm class drag-over vào cột tương ứng
      const targetElement = document.getElementById(fallbackStatusId);
      if (targetElement) {
        targetElement.classList.add('drag-over');
      }
    }
    
    return;
  }
  
  // Lấy thẻ có id là statusId (trạng thái hợp lệ)
  let targetElement = document.getElementById(statusId);
  
  if (targetElement) {
    console.log(`[DragOver] Adding drag-over to column with id: ${statusId}`);
    targetElement.classList.add('drag-over');
  } else {
    // Nếu không tìm thấy bằng ID, thử tìm với class <statusId>-column
    targetElement = document.querySelector(`.${statusId}-column`);
    
    if (targetElement) {
      console.log(`[DragOver] Adding drag-over to column with class: ${statusId}-column`);
      targetElement.classList.add('drag-over');
    } else {
      console.warn(`[DragOver] Could not find target element for statusId: ${statusId}`);
    }
  }
};

const handleDragEnd = (event) => {
  const { active, over } = event;
  
  console.log("[DragEnd] Event:", { 
    activeId: active?.id, 
    overId: over?.id, 
    pointer: event.activatorEvent ? {
      x: event.activatorEvent.clientX,
      y: event.activatorEvent.clientY
    } : 'unknown'
  });
  
  // Xóa class drag-over khỏi tất cả các cột
  document.querySelectorAll('.kanban-column').forEach(column => {
    column.classList.remove('drag-over');
  });
  
  // Xóa placeholder khỏi cột rỗng
  document.querySelectorAll('.empty-placeholder').forEach(placeholder => {
    placeholder.remove();
  });
  
  if (!active || !over) {
    console.log("[DragEnd] Missing active or over element");
    return;
  }
  
  const activeId = active.id;
  let overId = over.id;
  
  // Kiểm tra và tìm task từ activeId
  const activeTask = tasks.find(task => task._id === activeId);
  
  if (!activeTask) {
    console.error("[DragEnd] Không tìm thấy task với id:", activeId);
    return;
  }
  
  // Danh sách các ID trạng thái hợp lệ
  const validStatuses = ['todo', 'inProgress', 'review', 'done'];
  
  // Nếu overId không phải là ID của một cột kanban, tìm cột thông qua vị trí con trỏ
  if (!validStatuses.includes(overId)) {
    console.log(`[DragEnd] Invalid overId: ${overId}, attempting to find column by position`);
    
    if (event.activatorEvent && 'clientX' in event.activatorEvent) {
      const { clientX } = event.activatorEvent;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      const columnWidth = viewportWidth / 4;
      let columnIndex = Math.floor(clientX / columnWidth);
      columnIndex = Math.max(0, Math.min(3, columnIndex));
      
      // Map từ index sang status
      overId = validStatuses[columnIndex];
      console.log(`[DragEnd] Using fallback status based on position: ${overId}`);
    } else {
      // Nếu không thể xác định vị trí, giữ nguyên trạng thái hiện tại
      overId = activeTask.status;
      console.log(`[DragEnd] Fallback to current status: ${overId}`);
    }
  }
  
  // Bây giờ overId chắc chắn là một trạng thái hợp lệ
  if (activeTask.status !== overId) {
    console.log(`[DragEnd] Updating task status from ${activeTask.status} to ${overId}`);
    
    updateTaskStatus({
      taskId: activeId,
      status: overId,
      projectId: activeTask.project._id || '',
    })
      .then(response => {
        console.log("[DragEnd] Task status updated successfully:", response);
        setTasks(prev => {
          // Tạo mảng task mới với task được cập nhật
          const updatedTasks = prev.map(task => 
            task._id === activeId
              ? { ...task, status: overId }
              : task
          );
          return updatedTasks;
        });
      })
      .catch(error => {
        console.error("[DragEnd] Error updating task status:", error);
      });
  } else {
    console.log("[DragEnd] No status change needed");
  }
  
  // Reset drag state
  setActiveId(null);
  setActiveTask(null);
  setIsDragActive(false);
}; 