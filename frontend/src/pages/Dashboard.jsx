import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Container,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckIcon,
  Timer as TimerIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import UpcomingTasks from "../components/Tasks/UpcomingTasks";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../contexts/AuthContext";
import { getProjects } from "../api/projectApi";

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [timeView, setTimeView] = useState("week");
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingTasks: 0,
  });
  const [projectId, setProjectId] = useState(null);
  const [sprintId, setSprintId] = useState(null);

  // Bổ sung useEffect để lấy projectId và sprintId gần nhất hoặc active
  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        const data = await getProjects();
        
        if (data && data.data && data.data.length > 0) {
          // Lấy dự án active hoặc dự án đầu tiên
          const activeProject = data.data.find(p => p.status === 'active') || data.data[0];
          console.log("Dashboard - Selected project:", activeProject);
          setProjectId(activeProject._id);
          
          // Nếu dự án có sprint, lấy sprint active hoặc sprint mới nhất
          if (activeProject.sprints && activeProject.sprints.length > 0) {
            const activeSprint = activeProject.sprints.find(s => s.status === 'active') 
              || activeProject.sprints[activeProject.sprints.length - 1];
            console.log("Dashboard - Selected sprint:", activeSprint);
            setSprintId(activeSprint._id);
          }
        } else {
          console.log("Dashboard - No projects found or data format unexpected:", data);
        }
      } catch (error) {
        console.error('Error fetching user projects:', error);
      }
    };
    
    fetchUserProjects();
  }, []);

  const features = [
    {
      title: "Công việc",
      description: "Quản lý và theo dõi các công việc",
      icon: <DashboardIcon sx={{ fontSize: 40 }} />,
      path: "/tasks",
      color: theme.palette.primary.main,
      badge: stats.pendingTasks > 0 ? stats.pendingTasks.toString() : null,
    },
    {
      title: "Báo cáo & Thống kê",
      description: "Xem báo cáo và thống kê",
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      path: "/reports",
      color: theme.palette.success.main,
    },
    {
      title: "Quản lý Người dùng",
      description: "Quản lý tài khoản và phân quyền",
      icon: <GroupIcon sx={{ fontSize: 40 }} />,
      path: "/users",
      color: theme.palette.warning.main,
    },
    {
      title: "Cài đặt",
      description: "Cấu hình hệ thống",
      icon: <SettingsIcon sx={{ fontSize: 40 }} />,
      path: "/settings",
      color: theme.palette.info.main,
    },
  ];

  // Data cho biểu đồ
  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Giờ làm việc",
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#3f2b96",
        backgroundColor: "rgba(63, 43, 150, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 4,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Xin chào, {user?.name || "Người dùng"}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Chào mừng bạn quay trở lại với hệ thống quản lý.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Truy cập nhanh
          </Typography>
          <Grid container spacing={3}>
            {features.map((feature) => (
              <Grid item xs={12} sm={6} md={3} key={feature.title}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    "&:hover": {
                      boxShadow: 6,
                      transform: "translateY(-4px)",
                      transition: "all 0.3s",
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <IconButton
                        sx={{
                          backgroundColor: feature.color,
                          color: "white",
                          "&:hover": {
                            backgroundColor: feature.color,
                          },
                        }}
                      >
                        {feature.icon}
                      </IconButton>
                      {feature.badge && (
                        <Chip
                          label={feature.badge}
                          color="error"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 2 }}
                    >
                      {feature.description}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      href={feature.path}
                    >
                      Truy cập
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Project Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê dự án
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tổng số dự án
                  </Typography>
                  <Typography variant="h4">{stats.totalProjects}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Dự án đang hoạt động
                  </Typography>
                  <Typography variant="h4">{stats.activeProjects}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Dự án đã hoàn thành
                  </Typography>
                  <Typography variant="h4">
                    {stats.completedProjects}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Công việc đang chờ
                  </Typography>
                  <Typography variant="h4">{stats.pendingTasks}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Tasks */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Công việc sắp đến hạn
          </Typography>
          {projectId && sprintId ? (
            <UpcomingTasks projectId={projectId} sprintId={sprintId} />
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Không tìm thấy dự án hoặc sprint nào.
            </Typography>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
