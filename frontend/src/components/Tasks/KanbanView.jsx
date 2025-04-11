import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
} from "@mui/icons-material";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  rectIntersection,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import TaskCard from "./TaskCard";
import DroppableKanbanColumn from "./DroppableKanbanColumn";

const KanbanView = ({
  tasks,
  sensors,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDragCancel,
  isDragActive,
  activeId,
  activeTask,
  setNewTask,
  setOpenCreateDialog,
  handleViewTaskDetail,
  handleEditTask,
  handleDeleteTask,
  handleAddComment,
  handleAddAttachment,
  project,
  canEditTask,
  canDeleteTask,
  updateTaskStatus,
  handleReorderTasks
}) => {
  // Render task cards cho từng cột
  const renderTaskCards = (status) => {
    console.log(`[DEBUG] KanbanView renderTaskCards for status ${status}`);
    console.log(`[DEBUG] handleViewTaskDetail is ${handleViewTaskDetail ? 'defined' : 'undefined'}`);
    console.log(`[DEBUG] handleEditTask is ${handleEditTask ? 'defined' : 'undefined'}`);
    
    return tasks[status]?.map((task, index) => {
      console.log(`[DEBUG] Creating TaskCard for task: ${task._id}`);
      return (
        <TaskCard
          key={task._id}
          task={task}
          container={status}
          project={project}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          onViewDetail={handleViewTaskDetail}
          index={index}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      );
    }) || [];
  };

  // Helper function tạo task mới
  const handleAddTask = (status) => {
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
      project: project?._id,
      sprint: project?.currentSprint?._id,
    });
    setOpenCreateDialog(true);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        // Danh sách các ID cột kanban hợp lệ
        const validColumnIds = ['todo', 'inProgress', 'done'];
        
        // Debug để xem chi tiết tất cả containers có sẵn
        console.log("[DEBUG] Active element:", args.active?.id);
        console.log("[DEBUG] All droppable containers:", 
          args.droppableContainers.map(c => {
            return {
              id: c.id,
              rect: c.rect?.current,
              data: c.data?.current
            };
          })
        );
        
        // Lọc ra chỉ giữ lại các container có ID là một trong các cột kanban
        const columnContainers = args.droppableContainers.filter(container => 
          validColumnIds.includes(container.id)
        );
        
        console.log("[DEBUG] Column containers:", columnContainers.map(c => c.id));
        
        if (columnContainers.length === 0) {
          console.log("[COLLISION] Không tìm thấy cột Kanban nào, sử dụng fallback");
          return [{ id: 'todo' }];
        }

        // Lấy vị trí của con trỏ
        if (!args.active) {
          console.log("[COLLISION] Không có phần tử active");
          return [];
        }

        // Dùng pointerWithin - thuật toán đơn giản nhất
        const pointerIntersections = pointerWithin(args);
        
        // Lọc ra chỉ các cột kanban từ kết quả intersection
        const columnIntersections = pointerIntersections.filter(
          intersection => validColumnIds.includes(intersection.id)
        );
        
        if (columnIntersections.length > 0) {
          console.log("[COLLISION] Found columns using pointerWithin:", 
            columnIntersections.map(c => c.id)
          );
          return columnIntersections;
        }
        
        // Nếu không tìm thấy, sử dụng closest center
        const closestCenterResult = closestCenter({
          ...args,
          droppableContainers: columnContainers
        });
        
        if (closestCenterResult.length > 0) {
          console.log("[COLLISION] Found columns using closestCenter:", 
            closestCenterResult.map(c => c.id)
          );
          return closestCenterResult;
        }
        
        // Fallback: Trả về cột todo
        console.log("[COLLISION] Fallback to first column: todo");
        return [{ id: 'todo' }];
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
      autoScroll={{
        enabled: true,
        threshold: { x: 0.1, y: 0.2 },
        acceleration: 10,
        interval: 5
      }}
    >
      <Grid container spacing={3} sx={{ 
        zIndex: 0, 
        minHeight: "calc(100vh - 200px)",
        maxHeight: "calc(100vh - 100px)",
        alignItems: "flex-start", // Đảm bảo các cột bắt đầu từ trên cùng
        justifyContent: "center", // Căn giữa các cột
        px: 2, // Thêm padding ngang để cân đối
        overflow: "hidden", // Ẩn thanh cuộn của container chính
        mb: 0, // Không cần margin bottom
      }} className={isDragActive ? 'dragging-active' : ''}>
        {/* COLUMN: TODO */}
        <Grid item xs={12} md={4} aria-label="Todo column" sx={{ height: "100%" }}>
          <DroppableKanbanColumn
            id="todo"
            title="Chưa bắt đầu"
            status="todo"
            count={tasks.todo.length}
            color="#1976d2"
            onAddTask={() => handleAddTask('todo')}
          >
            <SortableContext items={tasks.todo.map(task => task._id)} strategy={verticalListSortingStrategy}>
              <Box className="task-list" sx={{ minHeight: 100 }}>
                {renderTaskCards('todo')}
              </Box>
            </SortableContext>
          </DroppableKanbanColumn>
        </Grid>

        {/* COLUMN: IN PROGRESS */}
        <Grid item xs={12} md={4} aria-label="In Progress column" sx={{ height: "100%" }}>
          <DroppableKanbanColumn
            id="inProgress"
            title="Đang thực hiện"
            status="inProgress"
            count={tasks.inProgress.length}
            color="#ff9800"
            onAddTask={() => handleAddTask('inProgress')}
          >
            <SortableContext items={tasks.inProgress.map(task => task._id)} strategy={verticalListSortingStrategy}>
              <Box className="task-list" sx={{ minHeight: 100 }}>
                {renderTaskCards('inProgress')}
              </Box>
            </SortableContext>
          </DroppableKanbanColumn>
        </Grid>

        {/* COLUMN: DONE */}
        <Grid item xs={12} md={4} aria-label="Done column" sx={{ height: "100%" }}>
          <DroppableKanbanColumn
            id="done"
            title="Hoàn thành"
            status="done"
            count={tasks.done.length}
            color="#2e7d32"
            onAddTask={() => handleAddTask('done')}
          >
            <SortableContext items={tasks.done.map(task => task._id)} strategy={verticalListSortingStrategy}>
              <Box className="task-list" sx={{ minHeight: 100 }}>
                {renderTaskCards('done')}
              </Box>
            </SortableContext>
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

export default KanbanView; 