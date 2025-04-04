import React from 'react';
import { DndContext, DragOverlay, closestCenter, pointerWithin, rectIntersection } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { Grid } from '@mui/material';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import DroppableKanbanColumn from './DroppableKanbanColumn';
import DraggableTaskCard from './DraggableTaskCard';
import TaskCard from './TaskCard';
import '../../styles/dragDrop.css';

/**
 * Component bảng Kanban có chức năng kéo thả
 * 
 * @param {Object} props - Props của component
 * @param {Object} props.tasks - Object chứa các task theo trạng thái
 * @param {Function} props.updateTaskStatus - Hàm cập nhật trạng thái task
 * @param {Function} props.onReorder - Hàm sắp xếp lại task trong cùng trạng thái
 * @param {Function} props.handleViewTaskDetail - Hàm xem chi tiết task
 * @param {Function} props.handleDeleteTask - Hàm xóa task
 * @param {Function} props.setNewTask - Hàm đặt task mới
 * @param {Function} props.setOpenCreateDialog - Hàm mở dialog tạo task
 * @param {Object} props.project - Project hiện tại
 * @param {Function} props.canEditTask - Hàm kiểm tra quyền sửa task
 * @param {Function} props.canDeleteTask - Hàm kiểm tra quyền xóa task
 * @returns {JSX.Element} - Component bảng Kanban có chức năng kéo thả
 */
const DndKanbanBoard = ({
  tasks,
  updateTaskStatus,
  onReorder,
  handleViewTaskDetail,
  handleDeleteTask,
  setNewTask,
  setOpenCreateDialog,
  project,
  canEditTask,
  canDeleteTask
}) => {
  // Sử dụng hook useDragAndDrop để quản lý logic kéo thả
  const {
    sensors,
    activeId,
    activeTask,
    isDragActive,
    activeContainer,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel
  } = useDragAndDrop(tasks, updateTaskStatus, onReorder);

  // Tạo task mới với trạng thái được chỉ định
  const handleAddTask = (status) => {
    setNewTask({
      status,
      name: "",
      description: "",
      priority: "medium",
      startDate: new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16),
      assignees: [],
      tags: [],
      estimate: "",
    });
    setOpenCreateDialog(true);
  };

  // Render task rỗng hoặc các task trong cột
  const renderTasksOrEmpty = (status) => {
    const columnTasks = tasks[status];

    if (!columnTasks || columnTasks.length === 0) {
      return (
        <div
          style={{
            padding: '1rem',
            textAlign: 'center',
            color: '#888',
            backgroundColor: 'rgba(0,0,0,0.02)',
            borderRadius: '10px',
            marginTop: '1rem',
            minHeight: '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease',
            pointerEvents: 'none', // Vô hiệu hóa pointer events để phần tử cha nhận event
          }}
          className="empty-column-placeholder"
          data-droppable="true"
          data-status={status}
          data-column-id={status}
          data-droppable-id={status}
          id={`empty-${status}`}
          onClick={() => {
            console.log(`[DEBUG] Clicked empty placeholder for ${status}`);
          }}
        >
          Chưa có công việc nào
        </div>
      );
    }

    return columnTasks.map((task) => (
      <DraggableTaskCard
        key={task._id}
        task={task}
        status={status}
        onClick={() => handleViewTaskDetail(task)}
        onDelete={handleDeleteTask}
        canDelete={canDeleteTask && canDeleteTask(task, project)}
      />
    ));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        // Lọc ra chỉ các cột kanban là các phần tử hợp lệ để thả
        const validColumnIds = ['todo', 'inProgress', 'review', 'done'];
        
        // Chỉ giữ lại các container có ID là một trong các cột kanban
        const columnContainers = args.droppableContainers.filter(
          container => validColumnIds.includes(container.id)
        );
        
        if (columnContainers.length === 0) {
          console.log("[COLLISION] Không tìm thấy cột Kanban trong các droppable containers");
          return [];
        }
        
        if (!args.active) {
          console.log("[COLLISION] Không có phần tử active");
          return [];
        }
        
        // Lấy vị trí của con trỏ
        let pointerX, pointerY;
        if (args.activatorEvent && 'clientX' in args.activatorEvent) {
          pointerX = args.activatorEvent.clientX;
          pointerY = args.activatorEvent.clientY;
        } else if (args.active.rect.current) {
          const rect = args.active.rect.current;
          pointerX = rect.left + rect.width / 2;
          pointerY = rect.top + rect.height / 2;
        } else {
          console.log("[COLLISION] Không thể xác định vị trí con trỏ");
          return [];
        }
        
        console.log(`[COLLISION] Vị trí con trỏ: (${pointerX}, ${pointerY})`);
        
        // Tìm cột chứa điểm (pointerX, pointerY)
        for (const container of columnContainers) {
          const rect = container.rect.current;
          
          // Kiểm tra nếu con trỏ nằm trong cột
          if (
            pointerX >= rect.left &&
            pointerX <= rect.right &&
            pointerY >= rect.top &&
            pointerY <= rect.bottom
          ) {
            console.log(`[COLLISION] Con trỏ nằm trong cột: ${container.id}`);
            return [container];
          }
        }
        
        // Nếu không tìm thấy giao nhau trực tiếp, tìm cột gần nhất
        let closestColumn = null;
        let smallestDistance = Infinity;
        
        for (const container of columnContainers) {
          const rect = container.rect.current;
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          // Tính khoảng cách từ con trỏ đến trung tâm cột
          const distance = Math.sqrt(
            Math.pow(pointerX - centerX, 2) + 
            Math.pow(pointerY - centerY, 2)
          );
          
          if (distance < smallestDistance) {
            smallestDistance = distance;
            closestColumn = container;
          }
        }
        
        if (closestColumn) {
          console.log(`[COLLISION] Sử dụng cột gần nhất: ${closestColumn.id}, khoảng cách: ${smallestDistance}`);
          return [closestColumn];
        }
        
        // Phương pháp cuối cùng: xác định cột dựa trên vị trí ngang
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const columnWidth = viewportWidth / 4;
        let columnIndex = Math.floor(pointerX / columnWidth);
        columnIndex = Math.max(0, Math.min(3, columnIndex));
        
        const statusMap = validColumnIds;
        const fallbackColumnId = statusMap[columnIndex];
        
        console.log(`[COLLISION] Xác định cột theo vị trí ngang: ${fallbackColumnId}`);
        
        // Tìm container tương ứng với ID
        const fallbackColumn = columnContainers.find(c => c.id === fallbackColumnId);
        if (fallbackColumn) {
          return [fallbackColumn];
        }
        
        console.log("[COLLISION] Không thể xác định cột đích");
        return [];
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <Grid container spacing={2} className={isDragActive ? 'dragging-active' : ''}>
        {/* Todo column */}
        <Grid item xs={12} md={3} aria-label="Todo column">
          <DroppableKanbanColumn
            id="todo"
            title="Chưa bắt đầu"
            status="todo"
            tasks={tasks.todo}
            count={tasks.todo.length}
            color="#1976d2"
            lightColor="rgba(25, 118, 210, 0.1)"
            borderColor="rgba(25, 118, 210, 0.2)"
            hoverBorderColor="rgba(25, 118, 210, 0.4)"
            onAddTask={() => handleAddTask('todo')}
          >
            {renderTasksOrEmpty('todo')}
          </DroppableKanbanColumn>
        </Grid>

        {/* In Progress column */}
        <Grid item xs={12} md={3} aria-label="In Progress column">
          <DroppableKanbanColumn
            id="inProgress"
            title="Đang thực hiện"
            status="inProgress"
            tasks={tasks.inProgress}
            count={tasks.inProgress.length}
            color="#ff9800"
            lightColor="rgba(255, 152, 0, 0.1)"
            borderColor="rgba(255, 152, 0, 0.2)"
            hoverBorderColor="rgba(255, 152, 0, 0.4)"
            onAddTask={() => handleAddTask('inProgress')}
          >
            {renderTasksOrEmpty('inProgress')}
          </DroppableKanbanColumn>
        </Grid>

        {/* Review column */}
        <Grid item xs={12} md={3} aria-label="Review column">
          <DroppableKanbanColumn
            id="review"
            title="Đang kiểm tra"
            status="review"
            tasks={tasks.review}
            count={tasks.review.length}
            color="#9c27b0"
            lightColor="rgba(156, 39, 176, 0.1)"
            borderColor="rgba(156, 39, 176, 0.2)"
            hoverBorderColor="rgba(156, 39, 176, 0.4)"
            onAddTask={() => handleAddTask('review')}
          >
            {renderTasksOrEmpty('review')}
          </DroppableKanbanColumn>
        </Grid>

        {/* Done column */}
        <Grid item xs={12} md={3} aria-label="Done column">
          <DroppableKanbanColumn
            id="done"
            title="Hoàn thành"
            status="done"
            tasks={tasks.done}
            count={tasks.done.length}
            color="#2e7d32"
            lightColor="rgba(46, 125, 50, 0.1)"
            borderColor="rgba(46, 125, 50, 0.2)"
            hoverBorderColor="rgba(46, 125, 50, 0.4)"
            onAddTask={() => handleAddTask('done')}
          >
            {renderTasksOrEmpty('done')}
          </DroppableKanbanColumn>
        </Grid>
      </Grid>

      {/* Hiển thị overlay khi kéo */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeId && activeTask ? (
          <TaskCard task={activeTask} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DndKanbanBoard; 