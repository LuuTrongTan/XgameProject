import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Container,
  Card,
  CardContent,
  Tabs,
  Tab,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel, 
  Select,
  MenuItem,
  Stack,
  Divider,
  Paper,
  alpha,
  useTheme,
  styled,
  Fade,
  Zoom,
  Badge,
  Chip
} from "@mui/material";
import { 
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Timeline as TimelineIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Speed as SpeedIcon,
  Group as GroupIcon,
  AccessTime as AccessTimeIcon,
  Event as CalendarIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import API from "../api/api";
import BurndownChart from "../components/Dashboard/BurndownChart";
import TeamPerformance from "../components/Dashboard/TeamPerformance";
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

// Framer Motion Animated Components
const MotionContainer = styled(motion.div)({
  width: '100%'
});

// Styled components cho UI nâng cao
const StyledTab = styled(Tab)(({ theme }) => ({
  fontWeight: 500,
  minHeight: 50,
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 600,
  },
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  '& .MuiTabs-indicator': {
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
}));

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 10px 30px 0 rgba(0,0,0,0.05)',
  transition: 'transform 0.3s, box-shadow 0.3s',
  overflow: 'hidden',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 15px 35px 0 rgba(0,0,0,0.1)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '5px',
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
}));

const SummaryCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'colorStart' && prop !== 'colorEnd'
})(({ theme, colorStart, colorEnd }) => ({
  borderRadius: 16,
  padding: 0,
  overflow: 'hidden',
  position: 'relative',
  boxShadow: '0 8px 20px 0 rgba(0,0,0,0.05)',
  height: '100%',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 12px 25px 0 rgba(0,0,0,0.08)',
    '& .MuiSvgIcon-root': {
      transform: 'scale(1.1)',
    }
  },
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(135deg, ${colorStart || theme.palette.primary.light} 0%, ${colorEnd || theme.palette.primary.main} 100%)`,
    opacity: 0.08,
  }
}));

const CustomSelect = styled(Select)(({ theme }) => ({
  borderRadius: 12,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha(theme.palette.primary.main, 0.2),
    borderWidth: 1.5,
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
  },
  transition: 'all 0.2s ease-in-out',
}));

const SectionHeader = styled(Typography)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(3),
  fontWeight: 600,
  display: 'inline-block',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: '30%',
    height: 3,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: 3,
    bottom: -8,
    left: 0,
  },
}));

const IconBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color'
})(({ theme, color }) => ({
  width: 48,
  height: 48,
  borderRadius: 12,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: alpha(color || theme.palette.primary.main, 0.15),
  color: color || theme.palette.primary.main,
  marginBottom: theme.spacing(1),
  transition: 'all 0.3s ease',
  '& .MuiSvgIcon-root': {
    transition: 'transform 0.3s ease',
  },
}));

const Reports = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [summaryData, setSummaryData] = useState({
    totalTasks: 0,
    completedTasks: 0,
    totalMembers: 0,
    totalHours: 0
  });
  const [chartData, setChartData] = useState({
    labels: ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"],
    datasets: [
      {
        label: "Thời gian đã làm",
        data: [0, 0, 0, 0, 0, 0, 0],
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
        tension: 0.4,
      },
    ],
  });

  // Tải danh sách dự án khi component mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Tải danh sách sprints khi dự án được chọn
  useEffect(() => {
    if (selectedProject) {
      fetchSprints();
      fetchWorkTimeData();
      fetchSummaryData();
    } else {
      setSprints([]);
      setSelectedSprint("all");
    }
  }, [selectedProject]);

  // Tải dữ liệu thời gian làm việc khi dự án hoặc sprint được chọn
  useEffect(() => {
    if (selectedProject) {
      fetchWorkTimeData();
      fetchSummaryData();
    }
  }, [selectedSprint]);

  // Hàm lấy dữ liệu tổng quan
  const fetchSummaryData = async () => {
    if (!selectedProject) return;

    try {
      let url = `/reports/projects/${selectedProject}/overview`;
      if (selectedSprint && selectedSprint !== "all") {
        url += `?sprint=${selectedSprint}`;
      }
      
      const response = await API.get(url);
      
      if (response?.data?.success) {
        const data = response.data.data || {};
        
        // Thời gian luôn được gửi từ backend ở đơn vị phút, cần chia 60 để chuyển sang giờ
        const totalHours = (data.totalTime || 0) / 60;
        
        setSummaryData({
          totalTasks: data.totalTasks || 0,
          completedTasks: data.completedTasks || 0,
          totalMembers: data.totalMembers || 0,
          totalHours: totalHours
        });
        
        console.log("Report time data:", {
          totalTime: data.totalTime,
          source: data.actualTimeSource,
          convertedHours: totalHours
        });
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu tổng quan:", error);
    }
  };

  // Hàm lấy danh sách dự án
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Sử dụng tham số để lấy dự án mà người dùng là admin hoặc project manager
      const response = await API.get('/projects?role=manager');
      
      if (response?.data?.success) {
        // Đảm bảo dữ liệu dự án là một mảng
        let projectsList = [];
        
        // Kiểm tra cấu trúc dữ liệu trả về
        if (response.data.data && Array.isArray(response.data.data)) {
          projectsList = response.data.data;
        } else if (response.data.data?.projects && Array.isArray(response.data.data.projects)) {
          projectsList = response.data.data.projects;
        } else {
          console.warn("Cấu trúc dữ liệu dự án không đúng định dạng:", response.data);
          projectsList = [];
        }
        
        setProjects(projectsList);
        
        // Chỉ thiết lập dự án được chọn nếu có ít nhất một dự án và chưa có dự án nào được chọn
        if (projectsList.length > 0 && !selectedProject) {
          setSelectedProject(projectsList[0]._id);
        }
      } else {
        console.warn("API không trả về success:", response?.data);
        setProjects([]);
        setError("Không thể tải danh sách dự án");
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách dự án:", error);
      setProjects([]);
      setError("Lỗi kết nối: Không thể tải danh sách dự án");
    } finally {
      setLoading(false);
    }
  };

  // Hàm lấy danh sách sprint của dự án
  const fetchSprints = async () => {
    if (!selectedProject) return;
    
    try {
      setSprintsLoading(true);
      const response = await API.get(`/projects/${selectedProject}/sprints`);
      
      if (response?.data?.success) {
        // Sửa phần này để lấy đúng dữ liệu sprint từ API
        const sprintsList = response.data.data || [];
        setSprints(sprintsList);
        // Mặc định chọn "Tất cả"
        setSelectedSprint("all");
      } else {
        console.warn("API sprints không trả về success:", response?.data);
        setSprints([]);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sprint:", error);
      setSprints([]);
    } finally {
      setSprintsLoading(false);
    }
  };

  // Hàm lấy dữ liệu thời gian làm việc
  const fetchWorkTimeData = async () => {
    if (!selectedProject) {
      console.warn("Không có dự án nào được chọn");
      return;
    }

    try {
      setLoading(true);
      
      // Thêm tham số sprint nếu đã chọn sprint cụ thể
      let url = `/reports/projects/${selectedProject}/time-report?groupBy=day`;
      if (selectedSprint && selectedSprint !== "all") {
        url += `&sprint=${selectedSprint}`;
      }
      
      console.log("Fetching time report data with URL:", url);
      const response = await API.get(url);
      
      if (response?.data?.success) {
        const timeData = response.data.data || {};
        console.log("Time report API response:", timeData);
        
        // Log chi tiết hơn về dữ liệu byPeriod
        if (timeData.byPeriod) {
          console.log("Time periods:", Object.keys(timeData.byPeriod));
          
          Object.entries(timeData.byPeriod).forEach(([date, value]) => {
            console.log(`Period ${date}:`, {
              totalTime: value.totalTime,
              estimatedTime: value.estimatedTime
            });
          });
        }
        
        // Chuẩn bị dữ liệu cho biểu đồ
        const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const actualValues = Array(7).fill(0); // Thời gian đã làm
        const estimatedValues = Array(7).fill(0); // Thời gian ước tính
        
        // Cập nhật dữ liệu thực tế nếu có
        if (timeData.byPeriod && typeof timeData.byPeriod === 'object') {
          Object.entries(timeData.byPeriod).forEach(([date, value]) => {
            try {
              // Xác định ngày trong tuần từ chuỗi ngày
              const dayOfWeek = new Date(date).getDay();
              console.log(`Converting date ${date} to day of week: ${dayOfWeek}`);
              
              // Kiểm tra tính hợp lệ của chỉ số ngày và giá trị
              if (dayOfWeek >= 0 && dayOfWeek < 7) {
                // Thời gian thực tế (đã làm)
                if (value && typeof value.totalTime === 'number') {
                  actualValues[dayOfWeek] = value.totalTime / 60; // Chuyển đổi từ phút sang giờ
                  console.log(`Set actual time for day ${dayOfWeek}: ${actualValues[dayOfWeek]} hours`);
                }
                
                // Thời gian ước tính
                if (value && typeof value.estimatedTime === 'number') {
                  estimatedValues[dayOfWeek] = value.estimatedTime / 60; // Chuyển đổi từ phút sang giờ
                  console.log(`Set estimated time for day ${dayOfWeek}: ${estimatedValues[dayOfWeek]} hours`);
                }
              }
            } catch (e) {
              console.error("Lỗi xử lý dữ liệu ngày:", e, "Dữ liệu:", date, value);
            }
          });
        }
        
        console.log("Final chart data:", {
          actualValues,
          estimatedValues
        });
        
        // Cập nhật dữ liệu biểu đồ
        setChartData({
          labels: days,
          datasets: [
            {
              label: "Thời gian đã làm",
              data: actualValues,
              borderColor: `rgba(${hexToRgb(theme.palette.primary.main)}, 1)`,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                gradient.addColorStop(0, `rgba(${hexToRgb(theme.palette.primary.main)}, 0.4)`);
                gradient.addColorStop(1, `rgba(${hexToRgb(theme.palette.primary.main)}, 0.0)`);
                return gradient;
              },
              tension: 0.4,
              fill: true,
              pointBackgroundColor: theme.palette.primary.main,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: "Thời gian ước tính",
              data: estimatedValues,
              borderColor: `rgba(${hexToRgb(theme.palette.warning.main)}, 1)`,
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              tension: 0.4,
              fill: false,
              pointBackgroundColor: theme.palette.warning.main,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            }
          ],
        });
      } else {
        console.warn("API time-report không trả về success:", response?.data);
        // Giữ nguyên dữ liệu biểu đồ cũ, không cập nhật
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu thời gian làm việc:", error);
      // Không hiển thị lỗi này cho người dùng, chỉ ghi log
    } finally {
      setLoading(false);
    }
  };

  // Hàm chuyển đổi màu hex sang rgb
  const hexToRgb = (hex) => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleProjectChange = (event) => {
    const newProjectId = event.target.value;
    if (newProjectId) {
      setSelectedProject(newProjectId);
      // Reset sprint về "Tất cả" khi đổi dự án
      setSelectedSprint("all");
    }
  };

  const handleSprintChange = (event) => {
    setSelectedSprint(event.target.value);
  };

  const handleRefresh = () => {
    if (activeTab === 2) {
      // Tab Thời gian làm việc
      fetchWorkTimeData();
    } else if (selectedProject) {
      // Tải lại dữ liệu sprint khi cần
      fetchSprints();
      
      // Cho các tab khác, có thể cần gọi API riêng tùy theo tab
      // Chúng ta sẽ phải thêm logic cho BurndownChart và TeamPerformance
      // để chúng xử lý được tham số sprint
    }
    fetchSummaryData();
  };

  const calculateCompletionRate = () => {
    if (summaryData.totalTasks === 0) return 0;
    return Math.round((summaryData.completedTasks / summaryData.totalTasks) * 100);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Giờ làm việc',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: alpha(theme.palette.text.primary, 0.05),
          drawBorder: false,
        },
        ticks: {
          precision: 1
        }
      },
      x: {
        title: {
          display: true,
          text: 'Ngày trong tuần',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          display: false,
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = context.raw || 0;
            return `${context.dataset.label}: ${value.toFixed(1)} giờ`;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 8 }}>
      <Fade in={true} timeout={800}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3, 
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`,
            boxShadow: '0 10px 40px 0 rgba(31, 38, 135, 0.07)'
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Stack direction="column" spacing={1}>
              <SectionHeader variant="h4">Báo Cáo & Thống Kê</SectionHeader>
              <Typography color="text.secondary" variant="subtitle1">
                Phân tích và đánh giá hiệu suất dự án
              </Typography>
            </Stack>
            <IconButton 
              color="primary" 
              onClick={handleRefresh}
              disabled={loading}
              title="Làm mới dữ liệu"
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  transform: 'rotate(30deg)'
                },
                transition: 'transform 0.3s ease-in-out',
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Paper>
      </Fade>

      {error && (
        <Zoom in={true}>
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              <Button color="error" variant="outlined" size="small" onClick={fetchProjects}>
                Thử lại
              </Button>
            }
          >
            {error}
          </Alert>
        </Zoom>
      )}

      <Fade in={true} timeout={600} style={{ transitionDelay: '100ms' }}>
        <Box>
          <StyledTabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="report tabs"
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            <StyledTab 
              label="Biểu đồ Burndown" 
              icon={<BarChartIcon />} 
              iconPosition="start"
            />
            <StyledTab 
              label="Hiệu suất thành viên"
              icon={<PieChartIcon />} 
              iconPosition="start" 
            />
            <StyledTab 
              label="Thời gian làm việc"
              icon={<TimelineIcon />} 
              iconPosition="start" 
            />
          </StyledTabs>
        </Box>
      </Fade>

      {/* Project và Sprint selector */}
      <Fade in={true} timeout={600} style={{ transitionDelay: '200ms' }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            background: theme.palette.background.paper,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
          }}
        >
          <Grid container spacing={3} alignItems="center">
            {/* Project selector */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={loading || projects.length === 0}>
                <InputLabel>Chọn dự án</InputLabel>
                <CustomSelect
                  value={selectedProject || ''}
                  label="Chọn dự án"
                  onChange={handleProjectChange}
                  displayEmpty
                >
                  {projects.length === 0 && (
                    <MenuItem value="" disabled>
                      <em>Không có dự án nào</em>
                    </MenuItem>
                  )}
                  {projects.map(project => (
                    <MenuItem key={project._id} value={project._id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </FormControl>
            </Grid>

            {/* Sprint selector */}
            <Grid item xs={12} md={6}>
              <FormControl 
                fullWidth
                disabled={sprintsLoading || !selectedProject}
              >
                <InputLabel>Chọn Sprint</InputLabel>
                <CustomSelect
                  value={selectedSprint}
                  label="Chọn Sprint"
                  onChange={handleSprintChange}
                  displayEmpty
                >
                  <MenuItem value="all">
                    <em>Tất cả Sprint</em>
                  </MenuItem>
                  {sprintsLoading ? (
                    <MenuItem value="" disabled>
                      <em>Đang tải...</em>
                    </MenuItem>
                  ) : sprints.length === 0 ? (
                    <MenuItem value="" disabled>
                      <em>Không có Sprint nào</em>
                    </MenuItem>
                  ) : (
                    sprints.map(sprint => (
                      <MenuItem key={sprint._id} value={sprint._id}>
                        {sprint.name}
                      </MenuItem>
                    ))
                  )}
                </CustomSelect>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      {/* Summary Cards */}
      {selectedProject && (
        <Fade in={true} timeout={800} style={{ transitionDelay: '300ms' }}>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard colorStart={theme.palette.primary.light} colorEnd={theme.palette.primary.dark}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <IconBox color={theme.palette.primary.main}>
                      <AssignmentTurnedInIcon />
                    </IconBox>
                    <Badge
                      badgeContent={calculateCompletionRate() + '%'}
                      color={calculateCompletionRate() >= 70 ? "success" : calculateCompletionRate() >= 40 ? "warning" : "error"}
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', padding: '0 5px', height: 20 } }}
                    />
                  </Box>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    {summaryData.totalTasks || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng số công việc
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Hoàn thành: {summaryData.completedTasks || 0} task
                  </Typography>
                </CardContent>
              </SummaryCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard colorStart={theme.palette.success.light} colorEnd={theme.palette.success.dark}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <IconBox color={theme.palette.success.main}>
                      <SpeedIcon />
                    </IconBox>
                    <Chip size="small" label="Hiệu suất" color="success" variant="outlined" />
                  </Box>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    {calculateCompletionRate()}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tỷ lệ hoàn thành
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Tiến độ: {summaryData.completedTasks || 0}/{summaryData.totalTasks || 0}
                  </Typography>
                </CardContent>
              </SummaryCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard colorStart={theme.palette.info.light} colorEnd={theme.palette.info.dark}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <IconBox color={theme.palette.info.main}>
                      <CalendarIcon />
                    </IconBox>
                    <Chip size="small" label="Sprint" color="info" variant="outlined" />
                  </Box>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    {summaryData.totalMembers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sprint
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Trong dự án
                  </Typography>
                </CardContent>
              </SummaryCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <SummaryCard colorStart={theme.palette.warning.light} colorEnd={theme.palette.warning.dark}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <IconBox color={theme.palette.warning.main}>
                      <AccessTimeIcon />
                    </IconBox>
                    <Chip size="small" label="Thời gian" color="warning" variant="outlined" />
                  </Box>
                  <Typography variant="h5" fontWeight={600} gutterBottom>
                    {Math.floor(summaryData.totalHours || 0)} h {Math.round(((summaryData.totalHours || 0) % 1) * 60)} m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tổng thời gian
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Thời gian thực tế làm việc
                  </Typography>
                </CardContent>
              </SummaryCard>
            </Grid>
          </Grid>
        </Fade>
      )}

      {/* Tab content */}
      <MotionContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {/* Biểu đồ Burndown */}
        {activeTab === 0 && selectedProject && (
          <BurndownChart 
            projectId={selectedProject} 
            sprintId={selectedSprint} 
          />
        )}
        
        {activeTab === 0 && !selectedProject && (
          <StyledCard>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" py={4}>
                Vui lòng chọn một dự án để xem biểu đồ Burndown
              </Typography>
            </CardContent>
          </StyledCard>
        )}

        {/* Hiệu suất thành viên */}
        {activeTab === 1 && selectedProject && (
          <TeamPerformance 
            projectId={selectedProject} 
            sprintId={selectedSprint !== "all" ? selectedSprint : null}
          />
        )}
        
        {activeTab === 1 && !selectedProject && (
          <StyledCard>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" py={4}>
                Vui lòng chọn một dự án để xem hiệu suất thành viên
              </Typography>
            </CardContent>
          </StyledCard>
        )}

        {/* Biểu đồ thời gian làm việc */}
        {activeTab === 2 && (
          <StyledCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Thời gian làm việc theo ngày
                {selectedSprint !== "all" && sprints.length > 0 && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (Sprint: {sprints.find(s => s._id === selectedSprint)?.name || selectedSprint})
                  </Typography>
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                So sánh thời gian ước tính và thời gian thực tế đã làm
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                  <CircularProgress />
                </Box>
              ) : !selectedProject ? (
                <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
                  <Typography color="text.secondary" align="center">
                    Vui lòng chọn một dự án để xem thời gian làm việc
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: 400, mt: 4 }}>
                  <Line data={chartData} options={chartOptions} />
                </Box>
              )}
            </CardContent>
          </StyledCard>
        )}
      </MotionContainer>
    </Container>
  );
};

export default Reports; 