import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import { getProjects } from "../api/projectApi";
import "../styles/Calendar.css";

const Calendar = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch tasks from all projects
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await getProjects();
        if (response && response.data) {
          // Transform tasks from all projects into calendar events
          const events = response.data.reduce((acc, project) => {
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
                },
              }));
              return [...acc, ...projectEvents];
            }
            return acc;
          }, []);
          setTasks(events);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setError(
          "Không thể tải dữ liệu công việc. Vui lòng kiểm tra kết nối và thử lại sau."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Get color based on task status
  const getStatusColor = (status) => {
    if (!status) return "#FF9800";

    switch (status.toLowerCase()) {
      case "đang hoạt động":
        return "#4CAF50";
      case "hoàn thành":
        return "#2196F3";
      case "đóng":
        return "#9E9E9E";
      default:
        return "#FF9800";
    }
  };

  // Handle event click
  const handleEventClick = (clickInfo) => {
    const task = clickInfo.event.extendedProps;
    alert(
      `Chi tiết công việc:\nTên: ${clickInfo.event.title}\nTrạng thái: ${task.status}\nDự án: ${task.project}\nMô tả: ${task.description}`
    );
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
            />
          </div>
        )}
      </Paper>
    </Box>
  );
};

export default Calendar;
