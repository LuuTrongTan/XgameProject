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
  Alert,
  Divider,
} from "@mui/material";
import {
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
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
import API from "../api/api";
import ProjectProgress from "../components/Dashboard/ProjectProgress";
import TaskOverview from "../components/Dashboard/TaskOverview";
import ActivityLog from "../components/Dashboard/ActivityLog";
import MyTasks from "../components/Dashboard/MyTasks";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    closedProjects: 0,
    archivedProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalTasks: 0,
    highPriorityTasks: 0,
    overdueTasks: 0,
    totalSprints: 0,
    activeSprints: 0,
    planningSprints: 0,
    completedSprints: 0
  });
  const [chartData, setChartData] = useState({
    labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    datasets: [
      {
        label: "Giờ làm việc",
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: "#3f2b96",
        backgroundColor: "rgba(63, 43, 150, 0.1)",
        tension: 0.4,
      },
    ],
  });
  const [activeProject, setActiveProject] = useState(null);
  const [activeSprint, setActiveSprint] = useState(null);
  const [projectsProgress, setProjectsProgress] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);
      
      console.log('Fetching dashboard data...');
      
      // Kiểm tra API endpoint có hoạt động không
      let systemCheckSuccess = false;
      try {
        const pingResponse = await API.get('/system-check');
        console.log('API system check:', pingResponse.data);
        // Lưu thông tin debug system
        setDebugInfo(prev => ({
          ...prev,
          systemCheck: pingResponse.data
        }));
        systemCheckSuccess = true;
      } catch (pingError) {
        console.error('API system check failed:', pingError);
        setDebugInfo(prev => ({
          ...prev,
          systemCheckError: {
            message: pingError.message,
            stack: pingError.stack,
            response: pingError.response?.data
          }
        }));
      }
      
      try {
        const response = await API.get('/dashboard/data');
        console.log('Dashboard API response:', response);
        
        if (response.data && response.data.success) {
          const { data } = response.data;
          
          // Lưu thông tin debug
          setDebugInfo(prev => ({
            ...prev,
            responseData: data,
            timestamp: new Date().toISOString()
          }));

          // Cập nhật thống kê
          setStats({
            totalProjects: data.projectStats?.total || 0,
            activeProjects: data.projectStats?.active || 0,
            completedProjects: data.projectStats?.completed || 0,
            closedProjects: data.projectStats?.closed || 0,
            archivedProjects: data.projectStats?.archived || 0,
            pendingTasks: data.taskStats?.pending || 0,
            completedTasks: data.taskStats?.completed || 0,
            inProgressTasks: data.taskStats?.inProgress || 0,
            totalTasks: data.taskStats?.total || 0,
            highPriorityTasks: data.taskStats?.highPriority || 0,
            overdueTasks: data.taskStats?.overdue || 0,
            totalSprints: data.sprintStats?.total || 0,
            activeSprints: data.sprintStats?.active || 0,
            planningSprints: data.sprintStats?.planning || 0,
            completedSprints: data.sprintStats?.completed || 0
          });

          // Cập nhật dữ liệu khác
          setProjectsProgress(data.projectsProgress || []);
          setRecentActivities(data.recentActivities || []);
          setAssignedTasks(data.assignedTasks || []);

          // Cập nhật dữ liệu biểu đồ
          if (data.timeChartData && Array.isArray(data.timeChartData)) {
            setChartData({
              labels: data.timeChartData.map(item => item.day),
              datasets: [
                {
                  label: "Giờ làm việc",
                  data: data.timeChartData.map(item => item.hours),
                  borderColor: "#3f2b96",
                  backgroundColor: "rgba(63, 43, 150, 0.1)",
                  tension: 0.4,
                },
              ],
            });
          }

          // Cập nhật dự án và sprint active
          setActiveProject(data.activeProject);
          setActiveSprint(data.activeSprint);
        } else {
          // Sử dụng dữ liệu mẫu khi API trả về lỗi
          useSampleData();
          setError("Không thể tải dữ liệu dashboard: " + (response.data?.message || "Lỗi không xác định"));
        }
      } catch (apiError) {
        console.error('Error fetching dashboard data:', apiError);
        // Sử dụng dữ liệu mẫu khi API không hoạt động
        useSampleData();
        setDebugInfo(prev => ({
          ...prev,
          error: {
            message: apiError.message,
            stack: apiError.stack,
            response: apiError.response?.data
          },
          timestamp: new Date().toISOString()
        }));
        
        setError(
          apiError.response?.data?.message || 
          apiError.message || 
          'Không thể tải dữ liệu dashboard'
        );
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      useSampleData();
      setLoading(false);
      setError('Lỗi không mong đợi xảy ra');
    }
  };

  // Hàm tạo dữ liệu mẫu khi API không hoạt động
  const useSampleData = () => {
    // Sample project stats
    setStats({
      totalProjects: 5,
      activeProjects: 3,
      completedProjects: 2,
      closedProjects: 0,
      archivedProjects: 1,
      pendingTasks: 8,
      completedTasks: 12,
      inProgressTasks: 5,
      totalTasks: 25,
      highPriorityTasks: 3,
      overdueTasks: 2,
      totalSprints: 4,
      activeSprints: 1,
      planningSprints: 1,
      completedSprints: 2
    });
    
    // Cập nhật dữ liệu mẫu khác
    setProjectsProgress([
      { _id: 'p1', name: 'Dự án mẫu A', status: 'Đang hoạt động', progress: 65 },
      { _id: 'p2', name: 'Dự án mẫu B', status: 'Đang hoạt động', progress: 30 },
      { _id: 'p3', name: 'Dự án mẫu C', status: 'Hoàn thành', progress: 100 },
    ]);
    
    setRecentActivities([
      { 
        _id: 'a1', 
        type: 'task', 
        action: 'completed', 
        title: 'Hoàn thành task',
        description: 'Đã hoàn thành công việc "Tạo trang dashboard"',
        user: { name: 'Người dùng', avatar: '' },
        project: { name: 'Dự án mẫu A' },
        createdAt: new Date().toISOString()
      },
      { 
        _id: 'a2', 
        type: 'project', 
        action: 'created', 
        title: 'Tạo dự án mới',
        description: 'Đã tạo dự án "Dự án mẫu B"',
        user: { name: 'Người dùng', avatar: '' },
        project: { name: 'Dự án mẫu B' },
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
    ]);
    
    setAssignedTasks([
      { 
        _id: 't1', 
        title: 'Thiết kế UI Dashboard', 
        status: 'inProgress', 
        priority: 'high',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        project: { _id: 'p1', name: 'Dự án mẫu A' } 
      },
      { 
        _id: 't2', 
        title: 'Fix lỗi đăng nhập', 
        status: 'todo', 
        priority: 'urgent',
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        project: { _id: 'p1', name: 'Dự án mẫu A' } 
      },
    ]);

    // Sample chart data
    setChartData({
      labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      datasets: [
        {
          label: "Giờ làm việc",
          data: [1, 2.5, 3, 4, 2, 1.5, 0],
          borderColor: "#3f2b96",
          backgroundColor: "rgba(63, 43, 150, 0.1)",
          tension: 0.4,
        },
      ],
    });

    // Sample project
    setActiveProject({
      id: "sample-project-1",
      name: "Dự án mẫu"
    });

    // Sample sprint
    setActiveSprint({
      id: "sample-sprint-1",
      name: "Sprint mẫu"
    });

    // Add debug info
    setDebugInfo(prev => ({
      ...prev,
      usingSampleData: true,
      timestamp: new Date().toISOString()
    }));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
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
        max: 8,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" gutterBottom>
            Xin chào, {user?.name || "Người dùng"}!
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Chào mừng bạn quay trở lại với hệ thống quản lý.
          </Typography>
        </Box>
        <Box>
          <IconButton 
            color="secondary"
            onClick={toggleDebugMode}
            title="Toggle Debug Mode"
            sx={{ mr: 1 }}
          >
            <BugReportIcon />
          </IconButton>
          <IconButton 
            color="primary" 
            onClick={fetchDashboardData}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {debugMode && debugInfo && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Debug Information
          </Typography>
          <Typography variant="caption">Last updated: {debugInfo.timestamp}</Typography>
          <Box sx={{ mt: 2 }}>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </Box>
          <Typography variant="caption">API Base URL: {API.defaults.baseURL}</Typography>
        </Card>
      )}

      <Grid container spacing={3}>
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
                    Dự án đã đóng
                  </Typography>
                  <Typography variant="h4">{stats.closedProjects}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Dự án lưu trữ
                  </Typography>
                  <Typography variant="h4">{stats.archivedProjects}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Task Overview */}
        <Grid item xs={12} md={6}>
          <TaskOverview stats={{
            total: stats.totalTasks,
            completed: stats.completedTasks,
            inProgress: stats.inProgressTasks,
            pending: stats.pendingTasks,
            highPriority: stats.highPriorityTasks,
            overdue: stats.overdueTasks
          }} />
        </Grid>

        {/* Project Progress */}
        <Grid item xs={12} md={6}>
          <ProjectProgress projects={projectsProgress} />
        </Grid>
        
        {/* Sprint Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê Sprint
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tổng số Sprint
                  </Typography>
                  <Typography variant="h4">{stats.totalSprints}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Sprint đang lập kế hoạch
                  </Typography>
                  <Typography variant="h4">{stats.planningSprints}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Sprint đang hoạt động
                  </Typography>
                  <Typography variant="h4">{stats.activeSprints}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Sprint đã hoàn thành
                  </Typography>
                  <Typography variant="h4">{stats.completedSprints}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Task Statistics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thống kê công việc
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tổng công việc
                  </Typography>
                  <Typography variant="h4">{stats.totalTasks}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Công việc đang thực hiện
                  </Typography>
                  <Typography variant="h4">{stats.inProgressTasks}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Công việc đang chờ
                  </Typography>
                  <Typography variant="h4">{stats.pendingTasks}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Công việc đã hoàn thành
                  </Typography>
                  <Typography variant="h4">{stats.completedTasks}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* My Tasks */}
        <Grid item xs={12} md={6}>
          <MyTasks tasks={assignedTasks} />
        </Grid>
        
        {/* Activity Log */}
        <Grid item xs={12} md={6}>
          <ActivityLog activities={recentActivities} />
        </Grid>

        {/* Time Chart */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Thời gian làm việc
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Tasks */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Công việc sắp đến hạn và quá hạn chưa hoàn thành
          </Typography>
          {activeProject && activeSprint ? (
            <UpcomingTasks 
              projectId={activeProject.id} 
              sprintId={activeSprint.id} 
            />
          ) : (
            <Card sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Không tìm thấy dự án hoặc sprint nào. Hãy tạo dự án và sprint để bắt đầu.
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
