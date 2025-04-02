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
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import TaskCard from "./TaskCard";

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
  handleDeleteTask,
  handleAddComment,
  handleAddAttachment,
  project,
  canEditTask,
  canDeleteTask,
}) => {
  // Render task cards cho từng cột
  const renderTaskCards = (columnTasks, status) => {
    if (!columnTasks || columnTasks.length === 0) {
      return (
        <Box
          sx={{
            p: 2,
            textAlign: "center",
            color: "text.secondary",
            backgroundColor: "rgba(0,0,0,0.02)",
            borderRadius: "10px",
            mt: 2
          }}
        >
          <Typography variant="body2">Chưa có công việc nào</Typography>
        </Box>
      );
    }

    return columnTasks.map((task) => (
      <TaskCard
        key={task._id}
        task={task}
        container={status}
        project={project}
        onEdit={handleViewTaskDetail}
        onDelete={handleDeleteTask}
        onAddComment={handleAddComment}
        onAddAttachment={handleAddAttachment}
        actionButtons={
          <Box
            className="action-buttons"
            sx={{ 
              position: "absolute", 
              top: 8, 
              right: 8, 
              zIndex: 999,
              backgroundColor: "rgba(255,255,255,0.95)",
              borderRadius: "8px",
              padding: "3px",
              boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
              border: "1px solid rgba(0,0,0,0.05)"
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              return false;
            }}
          >
            <Box display="flex" gap={1}>
              {/* Use inline conditional to avoid requiring ActionButtons component */}
              {(canEditTask && canDeleteTask) && (
                <div className="task-action-buttons">
                  {canEditTask(task, project) && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleViewTaskDetail(task);
                        return false;
                      }}
                      color="primary"
                    >
                      {/* EditIcon would be used here */}
                    </IconButton>
                  )}
                  {canDeleteTask(task, project) && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDeleteTask(task._id);
                        return false;
                      }}
                      color="error"
                    >
                      {/* DeleteIcon would be used here */}
                    </IconButton>
                  )}
                </div>
              )}
            </Box>
          </Box>
        }
      />
    ));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        // Sử dụng kết hợp nhiều thuật toán để tăng độ chính xác
        const pointerCollisions = pointerWithin(args);
        
        // Nếu phát hiện va chạm bằng pointerWithin, ưu tiên dùng kết quả này
        if (pointerCollisions.length > 0) {
          console.log("Collision detected using pointerWithin:", pointerCollisions);
          return pointerCollisions;
        }
        
        // Nếu không, thử dùng rectIntersection (kiểm tra giao nhau giữa các hình chữ nhật)
        const rectCollisions = rectIntersection(args);
        if (rectCollisions.length > 0) {
          console.log("Collision detected using rectIntersection:", rectCollisions);
          return rectCollisions;
        }
        
        // Cuối cùng, dùng thuật toán closestCenter
        const closestCollisions = closestCenter(args);
        console.log("Collision detected using closestCenter:", closestCollisions);
        return closestCollisions;
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
    >
      <Grid container spacing={2} sx={{ zIndex: 0 }} className={isDragActive ? 'dragging-active' : ''}>
        {/* COLUMN: TODO */}
        <Grid item xs={12} md={3} aria-label="Todo column">
          <Card
            id="todo"
            data-status="todo"
            data-droppable-id="todo"
            className="kanban-column todo-column"
            sx={{
              minHeight: "calc(100vh - 300px)",
              backgroundColor: "#f8f9fc",
              borderRadius: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              border: "1px solid rgba(25, 118, 210, 0.2)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 12px 32px rgba(25, 118, 210, 0.15)",
                border: "1px solid rgba(25, 118, 210, 0.4)",
              },
              "&.drag-over": {
                border: "2px dashed rgba(25, 118, 210, 0.6)",
                backgroundColor: "rgba(25, 118, 210, 0.05)",
                transform: "translateY(-5px)",
                boxShadow: "0 16px 32px rgba(25, 118, 210, 0.2)",
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(25, 118, 210, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "rgb(25, 118, 210)",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.todo.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Chưa bắt đầu
                  </Typography>
                </Box>
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      status: "todo",
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
                  }}
                  sx={{
                    color: "#1976d2",
                    '&:hover': {
                      backgroundColor: "rgba(25, 118, 210, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              
              <SortableContext items={tasks.todo.map(task => task._id)} strategy={verticalListSortingStrategy}>
                <Box className="task-list" sx={{ minHeight: 100 }}>
                  {renderTaskCards(tasks.todo, "todo")}
                </Box>
              </SortableContext>
            </CardContent>
          </Card>
        </Grid>

        {/* COLUMN: IN PROGRESS */}
        <Grid item xs={12} md={3} aria-label="In Progress column">
          <Card
            id="inProgress"
            data-status="inProgress"
            data-droppable-id="inProgress"
            className="kanban-column inProgress-column"
            sx={{
              minHeight: "calc(100vh - 300px)",
              backgroundColor: "#f8f9fc",
              borderRadius: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              border: "1px solid rgba(255, 152, 0, 0.2)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 12px 32px rgba(255, 152, 0, 0.15)",
                border: "1px solid rgba(255, 152, 0, 0.4)",
              },
              "&.drag-over": {
                border: "2px dashed rgba(255, 152, 0, 0.6)",
                backgroundColor: "rgba(255, 152, 0, 0.05)",
                transform: "translateY(-5px)",
                boxShadow: "0 16px 32px rgba(255, 152, 0, 0.2)",
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 152, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "rgb(255, 152, 0)",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.inProgress.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Đang thực hiện
                  </Typography>
                </Box>
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      status: "inProgress",
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
                  }}
                  sx={{
                    color: "#ff9800",
                    '&:hover': {
                      backgroundColor: "rgba(255, 152, 0, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              
              <SortableContext items={tasks.inProgress.map(task => task._id)} strategy={verticalListSortingStrategy}>
                <Box className="task-list" sx={{ minHeight: 100 }}>
                  {renderTaskCards(tasks.inProgress, "inProgress")}
                </Box>
              </SortableContext>
            </CardContent>
          </Card>
        </Grid>

        {/* COLUMN: REVIEW */}
        <Grid item xs={12} md={3} aria-label="Review column">
          <Card
            id="review"
            data-status="review"
            data-droppable-id="review"
            className="kanban-column review-column"
            sx={{
              minHeight: "calc(100vh - 300px)",
              backgroundColor: "#f8f9fc",
              borderRadius: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              border: "1px solid rgba(156, 39, 176, 0.2)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 12px 32px rgba(156, 39, 176, 0.15)",
                border: "1px solid rgba(156, 39, 176, 0.4)",
              },
              "&.drag-over": {
                border: "2px dashed rgba(156, 39, 176, 0.6)",
                backgroundColor: "rgba(156, 39, 176, 0.05)",
                transform: "translateY(-5px)",
                boxShadow: "0 16px 32px rgba(156, 39, 176, 0.2)",
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(156, 39, 176, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "rgb(156, 39, 176)",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.review.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Đang kiểm tra
                  </Typography>
                </Box>
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      status: "review",
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
                  }}
                  sx={{
                    color: "#9c27b0",
                    '&:hover': {
                      backgroundColor: "rgba(156, 39, 176, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              
              <SortableContext items={tasks.review.map(task => task._id)} strategy={verticalListSortingStrategy}>
                <Box className="task-list" sx={{ minHeight: 100 }}>
                  {renderTaskCards(tasks.review, "review")}
                </Box>
              </SortableContext>
            </CardContent>
          </Card>
        </Grid>

        {/* COLUMN: DONE */}
        <Grid item xs={12} md={3} aria-label="Done column">
          <Card
            id="done"
            data-status="done"
            data-droppable-id="done"
            className="kanban-column done-column"
            sx={{
              minHeight: "calc(100vh - 300px)",
              backgroundColor: "#f8f9fc",
              borderRadius: "20px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              border: "1px solid rgba(46, 125, 50, 0.2)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 12px 32px rgba(46, 125, 50, 0.15)",
                border: "1px solid rgba(46, 125, 50, 0.4)",
              },
              "&.drag-over": {
                border: "2px dashed rgba(46, 125, 50, 0.6)",
                backgroundColor: "rgba(46, 125, 50, 0.05)",
                transform: "translateY(-5px)",
                boxShadow: "0 16px 32px rgba(46, 125, 50, 0.2)",
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      backgroundColor: "rgba(46, 125, 50, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mr: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "rgb(46, 125, 50)",
                        fontWeight: 600,
                        fontSize: "1.2rem",
                      }}
                    >
                      {tasks.done.length}
                    </Typography>
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: "#1a1a1a",
                      fontSize: "1.1rem",
                    }}
                  >
                    Hoàn thành
                  </Typography>
                </Box>
                <IconButton 
                  onClick={() => {
                    setNewTask({
                      status: "done",
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
                  }}
                  sx={{
                    color: "#2e7d32",
                    '&:hover': {
                      backgroundColor: "rgba(46, 125, 50, 0.1)"
                    }
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Box>
              
              <SortableContext items={tasks.done.map(task => task._id)} strategy={verticalListSortingStrategy}>
                <Box className="task-list" sx={{ minHeight: 100 }}>
                  {renderTaskCards(tasks.done, "done")}
                </Box>
              </SortableContext>
            </CardContent>
          </Card>
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