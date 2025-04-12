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
  Paper,
  useMediaQuery,
  alpha,
  Tooltip
} from "@mui/material";
import {
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckIcon,
  Timer as TimerIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  BarChart as ChartIcon,
  Dashboard as DashboardIcon,
  Autorenew as AutorenewIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  LocalFireDepartment as FireIcon,
  Person
} from "@mui/icons-material";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from "chart.js";
import UpcomingTasks from "../components/Tasks/UpcomingTasks";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../contexts/AuthContext";
import { useAdminView } from "../contexts/AdminViewContext";
import UserSelector from "../components/admin/UserSelector";
import API from "../api/api";
import ProjectProgress from "../components/Dashboard/ProjectProgress";
import TaskOverview from "../components/Dashboard/TaskOverview";
import ActivityLog from "../components/Dashboard/ActivityLog";
import MyTasks from "../components/Dashboard/MyTasks";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getDashboardData } from "../api/dashboardApi";

// Đăng ký các components cần thiết cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Styled components sử dụng styles từ theme
const StyledCard = ({ children, elevation = 0, sx = {} }) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={elevation}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 6px 15px rgba(0,0,0,0.04)',
        },
        ...sx
      }}
    >
      {children}
    </Paper>
  );
};

const StatCard = ({ icon, title, value, color, sx }) => {
  const theme = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <StyledCard>
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative', 
          overflow: 'hidden',
          ...sx
        }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              top: -10, 
              right: -10, 
              p: 2,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette[color].main, 0.06),
              color: alpha(theme.palette[color].main, 0.8),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 0
            }}
          >
            {React.cloneElement(icon, { fontSize: 'medium' })}
          </Box>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="medium" sx={{ mt: 0.5, color: alpha(theme.palette[color].main, 0.8) }}>
            {value}
          </Typography>
        </Box>
      </StyledCard>
    </motion.div>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { selectedUser, isAdminView } = useAdminView();
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
    labels: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    datasets: [
      {
        label: "Giờ làm việc",
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        tension: 0.4,
      },
    ],
  });
  const [activeProject, setActiveProject] = useState(null);
  const [activeSprint, setActiveSprint] = useState(null);
  const [projectsProgress, setProjectsProgress] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [totalWorkHours, setTotalWorkHours] = useState(0);

  // Chart options
  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    scale: {
      ticks: {
        precision: 1
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMin: 0,
        suggestedMax: 10,
        ticks: {
          stepSize: 0.5,
          precision: 1,
          font: {
            size: 11
          },
          callback: function(value) {
            return value + ' giờ';
          }
        },
        title: {
          display: true,
          text: 'Giờ làm việc',
          font: {
            size: 11
          },
          color: alpha(theme.palette.text.secondary, 0.7)
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: 'bold'
          },
          color: theme.palette.text.primary,
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        cornerRadius: 8,
        callbacks: {
          title: function(context) {
            return `Dự án: ${context[0].label}`;
          },
          label: function(context) {
            return `Thời gian làm việc: ${context.parsed.y} giờ`;
          }
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 2,
        fill: true,
      },
      point: {
        radius: 4,
        borderWidth: 2,
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.background.paper,
        hoverRadius: 6,
        hoverBorderWidth: 2
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };

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
      
      // Nếu admin đang xem dữ liệu của user cụ thể
      const params = {};
      if (isAdminView && selectedUser) {
        params.userId = selectedUser._id;
      }
      
      try {
        const response = await getDashboardData(params);
        console.log('Dashboard API response:', response);
        
        if (response.success) {
          const { data } = response;
          
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
          console.log('Projects Progress data received:', data.projectsProgress);
          console.log('Projects Progress count:', data.projectsProgress?.length || 0);
          
          // Lọc các hoạt động để chỉ hiển thị hoạt động của người dùng hiện tại 
          // hoặc người dùng được chọn (nếu đang trong chế độ admin view)
          let userActivities = [];
          
          if (Array.isArray(data.recentActivities)) {
            const targetUserId = selectedUser ? selectedUser._id : user.id;
            
            // Lọc hoạt động của người dùng cụ thể
            userActivities = data.recentActivities.filter(activity => 
              activity.user && 
              (activity.user._id === targetUserId || activity.user === targetUserId)
            );
            
            console.log(`Đã lọc ${userActivities.length} hoạt động của user: ${targetUserId} từ tổng số ${data.recentActivities.length} hoạt động`);
          }
          
          // Set hoạt động sau khi đã lọc
          setRecentActivities(userActivities);
          setAssignedTasks(data.assignedTasks || []);

          // Cập nhật dữ liệu biểu đồ
          if (data.timeChartData && Array.isArray(data.timeChartData)) {
            console.log('Time chart data from API:', JSON.stringify(data.timeChartData, null, 2));
            
            // Debug thông tin chi tiết về dữ liệu thời gian
            if (data.timeChartData.length > 0) {
              console.log('First time data item:', data.timeChartData[0]);
              console.log('Hours value:', data.timeChartData[0].hours);
              console.log('Data type:', typeof data.timeChartData[0].hours);
            }
            
            // Kiểm tra nếu có bất kỳ giá trị nào > 0
            const hasNonZeroValues = data.timeChartData.some(item => item.hours > 0);
            console.log('Has non-zero time values:', hasNonZeroValues);
            
            setChartData({
              labels: data.timeChartData.map(item => item.day),
              datasets: [
                {
                  label: "Giờ làm việc",
                  data: data.timeChartData.map(item => item.hours),
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  tension: 0.4,
                  fill: true,
                  borderWidth: 2,
                  pointBackgroundColor: theme.palette.primary.main,
                  pointBorderColor: theme.palette.background.paper,
                  pointBorderWidth: 2,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointHoverBackgroundColor: theme.palette.primary.dark,
                  pointHoverBorderColor: theme.palette.background.paper,
                  pointHoverBorderWidth: 2,
                  hoverBackgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              ],
            });
          }

          // Cập nhật dự án và sprint active
          setActiveProject(data.activeProject);
          setActiveSprint(data.activeSprint);

          // Lưu tổng thời gian làm việc
          if (data.timeChartData && Array.isArray(data.timeChartData) && data.timeChartData.length > 0) {
            const hours = data.timeChartData[0].hours || 0;
            console.log('Setting total work hours:', hours);
            setTotalWorkHours(hours);
          }
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

  // Hiển thị hoặc ẩn debug info
  const toggleDebugMode = () => {
    setDebugMode(prev => !prev);
  };

  // Lấy dữ liệu khi component được mount
  useEffect(() => {
    fetchDashboardData();
    
    // Debug: Hiển thị giá trị đã nhận từ API
    console.log("Current timeChartData:", debugInfo?.responseData?.timeChartData);
    
    // Thêm biến để theo dõi thời gian thực tế
    if (debugInfo?.responseData?.timeChartData) {
      const hours = debugInfo?.responseData?.timeChartData[0]?.hours || 0;
      console.log("Total hours from API:", hours, typeof hours);
    }
  }, [selectedUser]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexDirection={{ xs: 'column', md: 'row' }} mb={4}>
          <Box mb={{ xs: 3, md: 0 }}>
            <Typography variant="h3" fontWeight="bold" color="primary">
              Xin chào, {user?.name || "Test User"}!
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Chào mừng bạn quay trở lại với hệ thống quản lý.
            </Typography>
          </Box>
          
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={3}>
            {isAdminView && (
              <UserSelector width={{ xs: '100%', sm: 350 }} />
            )}
            <Tooltip title="Làm mới dữ liệu">
              <Button 
                onClick={fetchDashboardData}
                color="primary"
                variant="outlined"
                startIcon={<AutorenewIcon />}
                size="medium"
                sx={{ 
                  ml: { xs: 0, sm: 2 }, 
                  borderRadius: 2, 
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  minWidth: { xs: '100%', sm: 'auto' }
                }}
              >
                Làm mới
              </Button>
            </Tooltip>
          </Box>
        </Box>
      </motion.div>
      
      {isAdminView && selectedUser && (
        <Alert 
          severity="info" 
          sx={{ mb: 4, borderRadius: 2 }}
          icon={<Person />}
        >
          Đang xem dữ liệu của người dùng: <strong>{selectedUser.name || selectedUser.email}</strong>
        </Alert>
      )}

      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 4, 
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}
          action={
            <Button color="inherit" size="small" onClick={fetchDashboardData}>
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="50vh"
          flexDirection="column"
          gap={2}
        >
          <CircularProgress size={60} thickness={4} />
          <Typography color="textSecondary">Đang tải dữ liệu...</Typography>
        </Box>
      ) : (
        <Box component="div">
          {/* Thống kê dự án */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Typography variant="subtitle1" fontWeight="medium" mb={2}>
              Thống kê dự án
            </Typography>
            <Grid container spacing={1.5} mb={3}>
              <Grid item xs={12} sm={6} md={2.4}>
                <StatCard 
                  icon={<FolderIcon fontSize="large" />}
                  title="Tổng số dự án"
                  value={stats.totalProjects}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <StatCard 
                  icon={<FolderIcon fontSize="large" />}
                  title="Dự án đang hoạt động"
                  value={stats.activeProjects}
                  color="info"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <StatCard 
                  icon={<CheckIcon fontSize="large" />}
                  title="Dự án đã hoàn thành"
                  value={stats.completedProjects}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <StatCard 
                  icon={<FolderIcon fontSize="large" />}
                  title="Dự án đã đóng"
                  value={stats.closedProjects}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2.4}>
                <StatCard 
                  icon={<FolderIcon fontSize="large" />}
                  title="Dự án lưu trữ"
                  value={stats.archivedProjects}
                  color="secondary"
                />
              </Grid>
            </Grid>
          </motion.div>
        
          <Grid container spacing={1.5}>
            {/* Task Overview */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <StyledCard elevation={0}>
                  <CardContent sx={{ p: 2 }}>
                    <TaskOverview stats={{
                      total: stats.totalTasks,
                      completed: stats.completedTasks,
                      inProgress: stats.inProgressTasks,
                      pending: stats.pendingTasks,
                      highPriority: stats.highPriorityTasks,
                      overdue: stats.overdueTasks
                    }} />
                  </CardContent>
                </StyledCard>
              </motion.div>
            </Grid>

            {/* Project Progress */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <StyledCard elevation={0}>
                  <CardContent sx={{ p: 2 }}>
                    <ProjectProgress projects={projectsProgress} />
                  </CardContent>
                </StyledCard>
              </motion.div>
            </Grid>
          
            {/* My Tasks */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <StyledCard elevation={0}>
                  <CardContent sx={{ p: 2 }}>
                    <MyTasks tasks={assignedTasks} />
                  </CardContent>
                </StyledCard>
              </motion.div>
            </Grid>
          
            {/* Activity Log */}
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <StyledCard elevation={0}>
                  <CardContent sx={{ p: 2 }}>
                    <ActivityLog activities={recentActivities} />
                  </CardContent>
                </StyledCard>
              </motion.div>
            </Grid>

            {/* Time Chart - Thẻ thống kê tổng thời gian làm việc của người dùng */}
            <Grid item xs={12}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <StyledCard 
                  elevation={0}
                  sx={{
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    minHeight: 150
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                    Tổng thời gian làm việc của bạn
                  </Typography>
                  
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 1, 
                      mb: 2
                    }}
                  >
                    <TimerIcon 
                      color="primary" 
                      sx={{ 
                        fontSize: '3rem', 
                        mr: 2,
                        opacity: 0.8
                      }} 
                    />
                    <Typography 
                      variant="h2" 
                      fontWeight="bold" 
                      color="primary.main"
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline'
                      }}
                    >
                      {/* Hiển thị trực tiếp từ state totalWorkHours */}
                      {totalWorkHours > 0 
                        ? totalWorkHours.toFixed(1) 
                        : "0.0"}
                      <Typography 
                        component="span" 
                        variant="h5" 
                        fontWeight="medium" 
                        color="primary.main" 
                        sx={{ ml: 1, opacity: 0.8 }}
                      >
                        giờ
                      </Typography>
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mt: 2, mb: 3 }}>
                    <Typography variant="body2" color="textSecondary">
                      Tổng số giờ làm việc của bạn đã được ghi nhận từ các công việc đã hoàn thành
                    </Typography>
                    {debugMode && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                        Debug: API data={JSON.stringify(debugInfo?.responseData?.timeChartData)}
                      </Typography>
                    )}
                  </Box>
                  
                  <Tooltip title="Làm mới dữ liệu">
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<RefreshIcon />}
                      onClick={fetchDashboardData}
                      disabled={loading}
                      size="small"
                      sx={{ borderRadius: 2 }}
                    >
                      Làm mới
                    </Button>
                  </Tooltip>
                </StyledCard>
              </motion.div>
            </Grid>
          </Grid>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
