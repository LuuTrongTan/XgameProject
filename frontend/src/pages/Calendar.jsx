import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Tooltip } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import { getProjects } from "../api/projectApi";
import { getSprintTasks } from "../api/taskApi";
import { useSnackbar } from "notistack";
import { Link as RouterLink } from "react-router-dom";
import { Edit as EditIcon, OpenInNew as OpenInNewIcon, CalendarToday as CalendarIcon } from "@mui/icons-material";
import "../styles/Calendar.css";

const Calendar = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch tasks from all projects and synced tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        
        // Fetch projects with tasks
        const response = await getProjects();
        let allTasks = [];
        
        if (response && response.data) {
          // Transform tasks from all projects into calendar events
          allTasks = response.data.reduce((acc, project) => {
            if (project.tasks) {
              const projectEvents = project.tasks.map((task) => ({
                id: task._id,
                title: task.title,
                start: task.startDate,
                end: task.dueDate,
                backgroundColor: getStatusColor(task.status),
                borderColor: getStatusColor(task.status),
                extendedProps: {
                  description: task.description,
                  status: task.status,
                  project: project.name,
                  projectId: project._id,
                  sprint: task.sprint,
                  priority: task.priority,
                  assignees: task.assignees || [],
                  syncWithCalendar: task.syncWithCalendar || false,
                  googleCalendarEventId: task.googleCalendarEventId
                },
              }));
              return [...acc, ...projectEvents];
            }
            return acc;
          }, []);
        }
        
        // Filter out tasks with invalid dates
        const validTasks = allTasks.filter(task => {
          const hasValidDates = task.start && task.end;
          if (!hasValidDates) {
            console.log(`Task ${task.id} skipped: Missing valid dates`);
          }
          return hasValidDates;
        });
        
        console.log(`Loaded ${validTasks.length} tasks for calendar view`);
        setTasks(validTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        enqueueSnackbar(
          "Không thể tải dữ liệu công việc. Vui lòng kiểm tra kết nối và thử lại sau.",
          { variant: "error" }
        );
        setError(
          "Không thể tải dữ liệu công việc. Vui lòng kiểm tra kết nối và thử lại sau."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [enqueueSnackbar]);

  // Get color based on task status
  const getStatusColor = (status) => {
    if (!status) return "#FF9800"; // Orange default

    switch (status.toLowerCase()) {
      case "todo":
        return "#FF9800"; // Orange
      case "inprogress":
        return "#2196F3"; // Blue
      case "done":
        return "#4CAF50"; // Green
      default:
        return "#9E9E9E"; // Grey
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    if (!priority) return "#757575"; // Grey default
    
    switch (priority.toLowerCase()) {
      case "high":
        return "#f44336"; // Red
      case "medium":
        return "#fb8c00"; // Orange
      case "low":
        return "#4caf50"; // Green
      default:
        return "#757575"; // Grey
    }
  };

  // Handle event click
  const handleEventClick = (clickInfo) => {
    const task = clickInfo.event.extendedProps;
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.start,
      end: clickInfo.event.end,
      ...task
    });
    setDialogOpen(true);
  };
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Close event details dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedEvent(null);
  };

  // Get status label
  const getStatusLabel = (status) => {
    if (!status) return "Chưa xác định";
    
    switch (status.toLowerCase()) {
      case "todo":
        return "Chưa bắt đầu";
      case "inprogress":
        return "Đang thực hiện";
      case "done":
        return "Hoàn thành";
      default:
        return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Lịch công việc
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Xem và quản lý các công việc theo lịch
      </Typography>

      <Paper sx={{ p: 2, height: "75vh", position: "relative" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : (
          <div className="calendar-container">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={tasks}
              eventClick={handleEventClick}
              locale={viLocale}
              height="100%"
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }}
              loading={false}
              nowIndicator={true}
              editable={false}
              selectable={false}
              selectMirror={true}
              dayMaxEvents={true}
              displayEventEnd={true}
              fixedWeekCount={true}
              showNonCurrentDates={true}
              firstDay={1}
              contentHeight="auto"
              weekNumbers={false}
              dayMaxEventRows={4}
            />
          </div>
        )}
      </Paper>
      
      {/* Task Detail Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {selectedEvent.title}
              <Box>
                {selectedEvent.syncWithCalendar && (
                  <Tooltip title="Đã đồng bộ với Google Calendar">
                    <Chip 
                      icon={<CalendarIcon />} 
                      label="Đã đồng bộ"
                      color="primary"
                      size="small"
                      sx={{ mr: 1 }}
                    />
                  </Tooltip>
                )}
                <Tooltip title="Mở task">
                  <IconButton 
                    component={RouterLink} 
                    to={`/projects/${selectedEvent.projectId}?task=${selectedEvent.id}`}
                    size="small"
                  >
                    <OpenInNewIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Dự án
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEvent.project || "Không có dự án"}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Mô tả
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEvent.description || "Không có mô tả"}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', mb: 2, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Trạng thái
                  </Typography>
                  <Chip 
                    label={getStatusLabel(selectedEvent.status)}
                    sx={{ 
                      bgcolor: getStatusColor(selectedEvent.status),
                      color: 'white'
                    }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Độ ưu tiên
                  </Typography>
                  <Chip 
                    label={selectedEvent.priority || "Thông thường"}
                    sx={{ 
                      bgcolor: getPriorityColor(selectedEvent.priority),
                      color: 'white'
                    }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Thời gian bắt đầu
                </Typography>
                <Typography variant="body1">
                  {formatDate(selectedEvent.start)}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Thời hạn kết thúc
                </Typography>
                <Typography variant="body1" fontWeight="bold" color={
                  new Date(selectedEvent.end) < new Date() && selectedEvent.status !== 'done' 
                    ? 'error.main' 
                    : 'text.primary'
                }>
                  {formatDate(selectedEvent.end)}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Đóng</Button>
              <Button 
                variant="contained" 
                color="primary" 
                component={RouterLink} 
                to={`/projects/${selectedEvent.projectId}?task=${selectedEvent.id}`}
              >
                Xem chi tiết
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Calendar;
