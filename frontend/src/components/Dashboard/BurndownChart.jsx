import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  styled,
  Divider,
  Paper,
  Zoom,
  Fade,
  Tooltip,
  Chip
} from "@mui/material";
import { 
  Timeline as TimelineIcon,
  Info as InfoIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { Line } from "react-chartjs-2";
import API from "../../api/api";

// Styled components cho giao diện nâng cao
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 10px 30px 0 rgba(0,0,0,0.05)',
  transition: 'all 0.3s ease',
  height: '100%',
  overflow: 'hidden',
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
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.error.main})`,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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

const ChartHeader = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: '40px',
    height: 3,
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.error.main})`,
    borderRadius: 3,
    bottom: -8,
    left: 0,
    transition: 'width 0.3s ease',
  },
  '&:hover:after': {
    width: '70px',
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  borderRadius: 8,
  fontWeight: 500,
  height: 28,
  '& .MuiChip-label': {
    paddingLeft: 10,
    paddingRight: 10,
  },
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'scale(1.05)',
  }
}));

const InfoTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .MuiTooltip-tooltip`]: {
    backgroundColor: alpha(theme.palette.background.paper, 0.9),
    color: theme.palette.text.primary,
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: theme.spacing(1.5),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    fontSize: '0.8rem',
    maxWidth: 300,
  },
}));

// Helper function để chuyển đổi hex sang rgba
const hexToRgba = (hex, alpha = 1) => {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const BurndownChart = ({ projectId, sprintId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [rawBurndownData, setRawBurndownData] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [projects, setProjects] = useState([]);
  const [sprintName, setSprintName] = useState(sprintId ? `Sprint ${sprintId}` : '');
  const [burndownStats, setBurndownStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    remainingTasks: 0
  });

  useEffect(() => {
    if (!selectedProject && projects && projects.length > 0) {
      setSelectedProject(projects[0]._id);
    }
  }, [projects]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await API.get('/projects');
        if (response.data && response.data.success) {
          setProjects(response.data.data || []);
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách dự án:", error);
        setProjects([]);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
      setSelectedProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedProject) {
      fetchBurndownData();
    }
  }, [selectedProject, sprintId]);

  const fetchBurndownData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/reports/projects/${selectedProject}/burndown`;
      
      // Thêm tham số sprint vào URL nếu có
      const params = new URLSearchParams();
      
      if (sprintId && sprintId !== 'all') {
        console.log("Using sprintId:", sprintId);
        params.append('sprint', sprintId);
      } else {
        console.log("No sprintId or using 'all'");
      }
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log("Fetching burndown data from:", url);
      const response = await API.get(url);
      
      // Kiểm tra chi tiết hơn về response
      console.log("Burndown API response:", {
        success: response.data?.success,
        dataLength: response.data?.data?.burndown?.length || 0,
        sprintName: response.data?.data?.sprint,
        dateRange: response.data?.data?.dateRange
      });
      
      if (response.data && response.data.success) {
        const burndownData = response.data.data.burndown || [];
        console.log("Received burndown data:", burndownData);
        
        // Store raw data for tooltip access
        setRawBurndownData(burndownData);
        
        // Set sprint name from response
        if (response.data.data.sprint) {
          setSprintName(response.data.data.sprint);
        }
        
        // DEBUG: Log the date range information
        if (response.data.data.dateRange) {
          console.log("Date range information:", response.data.data.dateRange);
        }
        
        // DEBUG: Log the first few date strings to check format
        if (burndownData.length > 0) {
          console.log("Date formats from backend:");
          console.log("Total points:", burndownData.length);
          console.log("First date:", burndownData[0].date);
          console.log("Last date:", burndownData[burndownData.length - 1].date);
          
          burndownData.slice(0, 3).forEach((item, i) => {
            console.log(`Item ${i}:`, {
              rawDate: item.date,
              parsedParts: item.date.split('-').map(num => parseInt(num, 10))
            });
          });
          
          // If we have more than 3 dates, also log the last one
          if (burndownData.length > 3) {
            const lastItem = burndownData[burndownData.length - 1];
            console.log(`Last item:`, {
              rawDate: lastItem.date,
              parsedParts: lastItem.date.split('-').map(num => parseInt(num, 10))
            });
          }
        }
        
        if (burndownData.length === 0) {
          console.log("No burndown data received");
          setChartData(null);
          setBurndownStats({
            totalTasks: 0,
            completedTasks: 0,
            remainingTasks: 0
          });
          return;
        }
        
        const firstDay = burndownData[0];
        const lastDay = burndownData[burndownData.length - 1];
        
        console.log("First day data:", firstDay);
        console.log("Last day data:", lastDay);
        
        setBurndownStats({
          totalTasks: firstDay ? firstDay.remaining + firstDay.completed : 0,
          completedTasks: lastDay ? lastDay.completed : 0,
          remainingTasks: lastDay ? lastDay.remaining : 0
        });
        
        // Tính số ngày trong burndownData
        const numDays = burndownData.length;
        console.log("Number of days in burndown data:", numDays);
        
        // Tối ưu hiển thị nhãn dựa trên số lượng ngày
        const optimizedLabels = burndownData.map((item, index) => {
          // Fix timezone issues: parse date string in YYYY-MM-DD format directly
          // This ensures that we correctly display the date without timezone shifts
          const [year, month, day] = item.date.split('-').map(num => parseInt(num, 10));
          
          // Create date with fixed components to avoid timezone shift
          const date = new Date(year, month - 1, day);
          
          // Nếu có nhiều hơn 15 ngày, chỉ hiển thị một vài điểm
          if (numDays > 15) {
            // Hiển thị ngày đầu, cuối và khoảng 5-7 điểm giữa
            if (index === 0 || index === numDays - 1 || index % Math.ceil(numDays / 7) === 0) {
              // Format date manually to avoid timezone issues
              return `${day}/${month}/${year}`;
            }
            return '';
          }
          
          // Nếu ít hơn 15 ngày, hiển thị tất cả
          // Format date manually to avoid timezone issues
          return `${day}/${month}/${year}`;
        });
        
        setChartData({
          labels: optimizedLabels,
          datasets: [
            {
              label: "Công việc còn lại",
              data: burndownData.map(item => item.remaining),
              borderColor: theme.palette.error.main,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                gradient.addColorStop(0, hexToRgba(theme.palette.error.main, 0.4));
                gradient.addColorStop(1, hexToRgba(theme.palette.error.main, 0.0));
                return gradient;
              },
              fill: true,
              tension: numDays <= 2 ? 0 : 0.4,
              pointBackgroundColor: theme.palette.error.main,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: numDays <= 2 ? 6 : 4,
              pointHoverRadius: 6,
            },
            {
              label: "Đường lý tưởng",
              data: burndownData.map(item => item.ideal),
              borderColor: theme.palette.primary.main,
              borderWidth: 2,
              backgroundColor: 'transparent',
              borderDash: [6, 6],
              tension: 0,
              pointRadius: numDays <= 2 ? 5 : 0,
              pointBackgroundColor: theme.palette.primary.main,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: theme.palette.primary.main,
              pointHoverBorderColor: '#fff',
            }
          ]
        });
      } else {
        setError(response.data?.message || "Không thể lấy dữ liệu burndown");
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu burndown:", error);
      setError(error.response?.data?.message || "Lỗi khi lấy dữ liệu burndown");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (event) => {
    setSelectedProject(event.target.value);
  };

  // Tính phần trăm đã hoàn thành
  const completionPercentage = () => {
    const { totalTasks, completedTasks } = burndownStats;
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // Cấu hình biểu đồ nâng cao
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Công việc còn lại',
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: alpha(theme.palette.text.primary, 0.05),
          drawBorder: false,
        },
        ticks: {
          stepSize: 1,
          precision: 0
        }
      },
      x: {
        title: {
          display: true,
          text: 'Ngày',
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
      tooltip: {
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          title: function(context) {
            // Get the date string from the dataset
            const index = context[0].dataIndex;
            
            // Use the label that's already correctly formatted
            return `Ngày: ${chartData.labels[index]}`;
          },
          label: function(context) {
            const index = context.dataIndex;
            const dataPoint = rawBurndownData[index];
            
            // Handle the case where dataPoint might be undefined
            if (!dataPoint) {
              return `${context.dataset.label}: ${Math.floor(context.raw)}`;
            }
            
            // Return more detailed information
            if (context.dataset.label === "Công việc còn lại") {
              return `Còn lại: ${dataPoint.remaining} (Đã hoàn thành: ${dataPoint.completed})`;
            } else {
              return `${context.dataset.label}: ${Math.floor(context.raw)}`;
            }
          }
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart'
    },
    elements: {
      line: {
        capBezierPoints: true
      }
    }
  };

  return (
    <Fade in={true} timeout={800}>
      <StyledCard>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <TimelineIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <ChartHeader variant="h6">
                Biểu đồ Burndown
                {sprintName && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (Sprint: {sprintName})
                    {rawBurndownData.length > 1 && (
                      <span> - {rawBurndownData[0].date} đến {rawBurndownData[rawBurndownData.length - 1].date}</span>
                    )}
                  </Typography>
                )}
              </ChartHeader>
            </Box>
            
            <Box display="flex" gap={2}>
              {/* Chọn dự án nếu chưa truyền vào */}
              {!projectId && projects && projects.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <InputLabel>Dự án</InputLabel>
                  <CustomSelect
                    value={selectedProject}
                    label="Dự án"
                    onChange={handleProjectChange}
                  >
                    {projects.map(project => (
                      <MenuItem key={project._id} value={project._id}>
                        {project.name}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </FormControl>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Thống kê Burndown */}
          {!loading && !error && chartData && (
            <Zoom in={true} style={{ transformOrigin: '0 0 0' }} timeout={600}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 2, 
                  mb: 3,
                  mt: 1 
                }}
              >
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 120
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tổng công việc
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color={theme.palette.primary.main}>
                    {burndownStats.totalTasks}
                  </Typography>
                </Box>
                
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 120
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Đã hoàn thành
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color={theme.palette.success.main}>
                    {burndownStats.completedTasks}
                  </Typography>
                </Box>
                
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 120
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Còn lại
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color={theme.palette.error.main}>
                    {burndownStats.remainingTasks}
                  </Typography>
                </Box>
                
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    backgroundColor: alpha(theme.palette.background.paper, 0.7),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 120,
                    ml: 'auto'
                  }}
                >
                  <Box display="flex" alignItems="center">
                    <Typography variant="body2" color="text.secondary" gutterBottom mr={0.5}>
                      Tiến độ
                    </Typography>
                    <InfoTooltip 
                      title="Phần trăm công việc đã hoàn thành so với tổng số công việc"
                      arrow
                    >
                      <InfoIcon fontSize="small" sx={{ color: theme.palette.info.main, fontSize: 16 }} />
                    </InfoTooltip>
                  </Box>
                  <Typography variant="h5" fontWeight={600} color={
                    completionPercentage() >= 75 ? theme.palette.success.main :
                    completionPercentage() >= 50 ? theme.palette.info.main :
                    completionPercentage() >= 25 ? theme.palette.warning.main :
                    theme.palette.error.main
                  }>
                    {completionPercentage()}%
                  </Typography>
                </Box>
              </Box>
            </Zoom>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={350}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && chartData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  borderRadius: 3, 
                  backgroundColor: alpha(theme.palette.background.paper, 0.6),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  height: 350,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10, 
                    zIndex: 10,
                    display: 'flex',
                    gap: 1
                  }}
                >
                  <StyledChip 
                    label="Công việc còn lại" 
                    size="small" 
                    sx={{ 
                      backgroundColor: alpha(theme.palette.error.main, 0.1),
                      color: theme.palette.error.main,
                      border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`
                    }} 
                  />
                  <StyledChip 
                    label="Đường lý tưởng" 
                    size="small" 
                    sx={{ 
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`
                    }} 
                  />
                </Box>
                <Line 
                  data={chartData} 
                  options={chartOptions}
                />
              </Paper>
            </motion.div>
          )}

          {!loading && !error && !chartData && (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
              <Typography color="text.secondary" align="center" py={4}>
                {sprintId 
                  ? `Không có dữ liệu burndown cho sprint này` 
                  : `Không có dữ liệu burndown cho dự án này`
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </StyledCard>
    </Fade>
  );
};

export default BurndownChart; 