import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, Box, Typography, IconButton } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

/**
 * Component cột Kanban có thể thả task vào
 * 
 * @param {Object} props - Props của component
 * @param {string} props.id - ID của cột
 * @param {string} props.title - Tiêu đề cột
 * @param {string} props.status - Trạng thái của cột
 * @param {number} props.count - Số lượng task
 * @param {string} props.color - Màu của cột
 * @param {Function} props.onAddTask - Hàm thêm task mới
 * @param {React.ReactNode} props.children - Component con
 * @returns {JSX.Element} - Component cột có thể thả task
 */
const DroppableKanbanColumn = ({
  id,
  title,
  status,
  count,
  color = '#1976d2',
  onAddTask,
  children
}) => {
  // Kết nối với DndContext thông qua useDroppable hook
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      accepts: ['task'],
      type: 'column',
      status: status,
      isDroppable: true,
      droppableId: status
    }
  });

  // Effect để log trạng thái isOver khi thay đổi (debug)
  React.useEffect(() => {
    if (isOver) {
      console.log(`[DROPPABLE] Column ${status} is now OVER`);
    }
  }, [isOver, status]);

  // Thiết lập các style dựa trên status
  let backgroundColor = "rgba(25, 118, 210, 0.1)";
  let textColor = "rgb(25, 118, 210)";
  let borderColor = "rgba(25, 118, 210, 0.2)";
  let hoverBorderColor = "rgba(25, 118, 210, 0.4)";
  let dashBorderColor = "rgba(25, 118, 210, 0.6)";
  let hoverBgColor = "rgba(25, 118, 210, 0.05)";
  
  switch (status) {
    case 'todo':
      backgroundColor = "rgba(25, 118, 210, 0.1)";
      textColor = "rgb(25, 118, 210)";
      borderColor = "rgba(25, 118, 210, 0.2)";
      hoverBorderColor = "rgba(25, 118, 210, 0.4)";
      dashBorderColor = "rgba(25, 118, 210, 0.6)";
      hoverBgColor = "rgba(25, 118, 210, 0.05)";
      break;
    case 'inProgress':
      backgroundColor = "rgba(255, 152, 0, 0.1)";
      textColor = "rgb(255, 152, 0)";
      borderColor = "rgba(255, 152, 0, 0.2)";
      hoverBorderColor = "rgba(255, 152, 0, 0.4)";
      dashBorderColor = "rgba(255, 152, 0, 0.6)";
      hoverBgColor = "rgba(255, 152, 0, 0.05)";
      break;
    case 'review':
      backgroundColor = "rgba(156, 39, 176, 0.1)";
      textColor = "rgb(156, 39, 176)";
      borderColor = "rgba(156, 39, 176, 0.2)";
      hoverBorderColor = "rgba(156, 39, 176, 0.4)";
      dashBorderColor = "rgba(156, 39, 176, 0.6)";
      hoverBgColor = "rgba(156, 39, 176, 0.05)";
      break;
    case 'done':
      backgroundColor = "rgba(46, 125, 50, 0.1)";
      textColor = "rgb(46, 125, 50)";
      borderColor = "rgba(46, 125, 50, 0.2)";
      hoverBorderColor = "rgba(46, 125, 50, 0.4)";
      dashBorderColor = "rgba(46, 125, 50, 0.6)";
      hoverBgColor = "rgba(46, 125, 50, 0.05)";
      break;
    default:
      break;
  }

  return (
    <Card
      ref={setNodeRef}
      id={status}
      data-column-status={status}
      data-status={status}
      data-droppable="true"
      data-droppable-id={status}
      data-type="kanban-column"
      data-column-id={status}
      className={`kanban-column ${status}-column ${isOver ? 'drag-over' : ''}`}
      sx={{
        minHeight: "calc(100vh - 300px)",
        backgroundColor: isOver ? hoverBgColor : "#f8f9fc",
        borderRadius: "20px",
        boxShadow: isOver ? "0 16px 32px rgba(0,0,0,0.15)" : "0 8px 24px rgba(0,0,0,0.08)",
        border: isOver ? `2px dashed ${dashBorderColor}` : `1px solid ${borderColor}`,
        transition: "all 0.3s ease",
        transform: isOver ? "translateY(-5px)" : "translateY(0)",
        position: "relative",
        zIndex: isOver ? 10 : 1,
        "&:hover": {
          boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
          border: `1px solid ${hoverBorderColor}`,
        }
      }}
      onClick={() => {
        console.log(`[CLICK] Column ${status} clicked - id: ${status}`);
      }}
    >
      <CardContent 
        sx={{ 
          p: 3,
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "12px",
                backgroundColor: backgroundColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 2,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: textColor,
                  fontWeight: 600,
                  fontSize: "1.2rem",
                }}
              >
                {count || 0}
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
              {title}
            </Typography>
          </Box>
          <IconButton 
            onClick={onAddTask}
            sx={{
              color: textColor,
              "&:hover": {
                backgroundColor: backgroundColor
              }
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
        
        <Box 
          className="task-list" 
          sx={{ 
            minHeight: 100,
            flexGrow: 1,
            display: "flex",
            flexDirection: "column"
          }}
          data-status={status}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  );
};

export default DroppableKanbanColumn; 