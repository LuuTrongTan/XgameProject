import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  useTheme,
  alpha,
  styled,
  Divider,
  LinearProgress,
  Fade,
  Zoom,
  Badge,
  IconButton
} from "@mui/material";
import {
  Check as CheckIcon,
  Timer as TimerIcon,
  Assignment as TaskIcon,
  Star as StarIcon,
  Group as GroupIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";
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
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
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
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`,
    borderRadius: 3,
    bottom: -8,
    left: 0,
    transition: 'width 0.3s ease',
  },
  '&:hover:after': {
    width: '70px',
  }
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 12,
  overflow: 'hidden',
  '& .MuiTableCell-head': {
    backgroundColor: alpha(theme.palette.primary.light, 0.1),
    color: theme.palette.primary.dark,
    fontWeight: 600,
    padding: '16px 8px',
    textAlign: 'center',
    fontSize: '0.85rem',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  '& .MuiTableRow-root': {
    transition: 'background-color 0.2s ease',
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: alpha(theme.palette.primary.light, 0.05),
  },
  '& .MuiTableCell-body': {
    borderColor: alpha(theme.palette.divider, 0.7),
    padding: '16px 8px',
  }
}));

const StyledTableRow = styled(motion.tr)(({ theme }) => ({
  transition: 'background-color 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.light, 0.05),
  },
}));

const PerformanceChip = styled(Chip)(({ theme, performance }) => {
  let color;
  if (performance >= 80) color = theme.palette.success.main;
  else if (performance >= 50) color = theme.palette.info.main;
  else if (performance >= 30) color = theme.palette.warning.main;
  else color = theme.palette.error.main;
  
  return {
    backgroundColor: alpha(color, 0.1),
    color: color,
    fontWeight: 600,
    border: `1px solid ${alpha(color, 0.3)}`,
    boxShadow: `0 2px 8px ${alpha(color, 0.2)}`,
    '& .MuiChip-label': {
      paddingLeft: 6,
      paddingRight: 6,
    },
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
    }
  };
});

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  borderRadius: '12px',
  boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.15)}`,
  border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1) rotate(5deg)',
    boxShadow: `0 5px 14px ${alpha(theme.palette.primary.main, 0.25)}`,
  }
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: theme.palette.success.main,
    color: theme.palette.common.white,
    fontSize: 10,
    padding: '0 4px',
    height: 16,
    minWidth: 16,
    right: -4,
    top: -4,
    boxShadow: `0 2px 6px ${alpha(theme.palette.success.main, 0.4)}`,
  }
}));

const StyledLinearProgress = styled(LinearProgress)(({ theme, value }) => {
  let color;
  if (value >= 80) color = theme.palette.success.main;
  else if (value >= 50) color = theme.palette.primary.main;
  else if (value >= 30) color = theme.palette.warning.main;
  else color = theme.palette.error.main;
  
  return {
    height: 8,
    borderRadius: 4,
    backgroundColor: alpha(color, 0.1),
    boxShadow: `0 1px 3px ${alpha(color, 0.2)}`,
    '& .MuiLinearProgress-bar': {
      backgroundColor: color,
    }
  };
});

// Helper function để định dạng thời gian (đơn vị phút)
const formatTime = (minutes) => {
  if (!minutes) return "0 phút";
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
};

const TeamPerformance = ({ projectId, sprintId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [projects, setProjects] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: 'performance',
    direction: 'desc'
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
      fetchPerformanceData();
    }
  }, [selectedProject, sprintId]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/reports/projects/${selectedProject}/performance`;
      if (sprintId) {
        url += `?sprint=${sprintId}`;
      }

      const response = await API.get(url);
      
      if (response.data && response.data.success) {
        const { data } = response.data;
        setPerformanceData(data.members || []);
      } else {
        setError(response.data?.message || "Không thể lấy dữ liệu hiệu suất");
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu hiệu suất:", error);
      setError(error.response?.data?.message || "Lỗi khi lấy dữ liệu hiệu suất");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (event) => {
    setSelectedProject(event.target.value);
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    if (!performanceData || performanceData.length === 0) return [];
    
    const sortableData = [...performanceData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        let aValue, bValue;
        
        // Lấy giá trị để so sánh dựa trên sortConfig.key
        switch (sortConfig.key) {
          case 'name':
            aValue = a.user.name.toLowerCase();
            bValue = b.user.name.toLowerCase();
            break;
          case 'totalTasks':
            aValue = a.taskStats?.total || 0;
            bValue = b.taskStats?.total || 0;
            break;
          case 'completedTasks':
            aValue = a.taskStats?.completed || 0;
            bValue = b.taskStats?.completed || 0;
            break;
          case 'time':
            aValue = a.timeStats?.totalTime || 0;
            bValue = b.timeStats?.totalTime || 0;
            break;
          case 'performance':
          default:
            aValue = a.performance || 0;
            bValue = b.performance || 0;
            break;
        }
        
        // So sánh các giá trị
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUpwardIcon fontSize="small" /> : 
      <ArrowDownwardIcon fontSize="small" />;
  };

  // Tính tổng và trung bình hiệu suất
  const calculateSummary = () => {
    if (!performanceData || performanceData.length === 0) {
      return { avgPerformance: 0, totalTasks: 0, completedTasks: 0, totalTime: 0 };
    }
    
    let totalPerformance = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let totalTime = 0;
    
    performanceData.forEach(member => {
      totalPerformance += member.performance || 0;
      totalTasks += member.taskStats?.total || 0;
      completedTasks += member.taskStats?.completed || 0;
      totalTime += member.timeStats?.totalTime || 0;
    });
    
    return {
      avgPerformance: Math.round(totalPerformance / performanceData.length),
      totalTasks,
      completedTasks,
      totalTime
    };
  };

  const summary = calculateSummary();

  return (
    <Fade in={true} timeout={800}>
      <StyledCard>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <GroupIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <ChartHeader variant="h6">
                Hiệu Suất Thành Viên Dự Án
                {sprintId && (
                  <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                    (Sprint: {sprintId})
                  </Typography>
                )}
              </ChartHeader>
            </Box>
            
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

          <Divider sx={{ my: 2 }} />

          {/* Hiển thị thống kê tổng quan */}
          {!loading && !error && performanceData && performanceData.length > 0 && (
            <Zoom in={true} style={{ transformOrigin: '0 0 0' }} timeout={600}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: 2, 
                  mb: 3,
                  mt: 1,
                  justifyContent: 'space-between'
                }}
              >
                <Paper 
                  elevation={0} 
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    flex: 1,
                    minWidth: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: alpha(theme.palette.primary.light, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tổng thành viên
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <GroupIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="h5" fontWeight={600} color="primary">
                      {performanceData.length}
                    </Typography>
                  </Box>
                </Paper>

                <Paper 
                  elevation={0} 
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    flex: 1,
                    minWidth: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: alpha(theme.palette.success.light, 0.05),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Tỷ lệ công việc
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      {summary.completedTasks}/{summary.totalTasks}
                    </Typography>
                  </Box>
                </Paper>

                <Paper 
                  elevation={0} 
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    flex: 1,
                    minWidth: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: alpha(theme.palette.info.light, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Thời gian làm việc
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <TimerIcon sx={{ color: theme.palette.info.main, mr: 1 }} />
                    <Typography variant="h5" fontWeight={600} color="info.main">
                      {Math.round(summary.totalTime / 60)}h
                    </Typography>
                  </Box>
                </Paper>

                <Paper 
                  elevation={0} 
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    flex: 1,
                    minWidth: 150,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: alpha(theme.palette.warning.light, 0.05),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.08)}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Hiệu suất trung bình
                  </Typography>
                  <Box display="flex" alignItems="center">
                    <StarIcon sx={{ color: theme.palette.warning.main, mr: 1 }} />
                    <Typography variant="h5" fontWeight={600} color="warning.main">
                      {summary.avgPerformance}%
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </Zoom>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 350 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && performanceData && performanceData.length > 0 && (
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
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                }}
              >
                <StyledTableContainer component={Paper} variant="outlined">
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Typography variant="body2">Thành viên</Typography>
                            <IconButton size="small" onClick={() => requestSort('name')}>
                              {getSortIcon('name')}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <TaskIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">Công việc</Typography>
                            <IconButton size="small" onClick={() => requestSort('totalTasks')}>
                              {getSortIcon('totalTasks')}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <CheckIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">Hoàn thành</Typography>
                            <IconButton size="small" onClick={() => requestSort('completedTasks')}>
                              {getSortIcon('completedTasks')}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <TimerIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">Thời gian</Typography>
                            <IconButton size="small" onClick={() => requestSort('time')}>
                              {getSortIcon('time')}
                            </IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box display="flex" alignItems="center" justifyContent="center">
                            <StarIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">Hiệu suất</Typography>
                            <IconButton size="small" onClick={() => requestSort('performance')}>
                              {getSortIcon('performance')}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedData().map((member, index) => {
                        const performance = Math.round(member.performance || 0);
                        const completionRate = Math.round(((member.taskStats?.completed || 0) / (member.taskStats?.total || 1)) * 100);
                        
                        return (
                          <TableRow 
                            key={member.user._id} 
                            hover
                            component={motion.tr}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <StyledBadge 
                                  badgeContent={index + 1} 
                                  color={index < 3 ? "success" : "primary"}
                                  anchorOrigin={{
                                    vertical: 'bottom',
                                    horizontal: 'right',
                                  }}
                                >
                                  <StyledAvatar 
                                    src={member.user.avatar} 
                                    alt={member.user.name}
                                  />
                                </StyledBadge>
                                <Box sx={{ ml: 2 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {member.user.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {member.user.email}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Tổng số công việc được giao">
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {member.taskStats?.total || 0}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              <Box sx={{ width: '100%' }}>
                                <Box display="flex" justifyContent="center" alignItems="center" mb={0.5}>
                                  <Typography variant="body2" fontWeight={500} mr={0.5}>
                                    {member.taskStats?.completed || 0}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ({completionRate}%)
                                  </Typography>
                                </Box>
                                <Tooltip title={`${completionRate}% công việc hoàn thành`}>
                                  <Box>
                                    <StyledLinearProgress 
                                      variant="determinate" 
                                      value={completionRate}
                                    />
                                  </Box>
                                </Tooltip>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Tổng thời gian làm việc">
                                <Box display="flex" flexDirection="column" alignItems="center">
                                  <Typography variant="body2" fontWeight={500}>
                                    {Math.round((member.timeStats?.totalTime || 0) / 60)} giờ
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {Math.round(member.timeStats?.totalTime || 0) % 60} phút
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title={`Hiệu suất làm việc: ${performance}%`}>
                                <Box>
                                  <PerformanceChip 
                                    size="small"
                                    label={`${performance}%`}
                                    performance={performance}
                                    icon={<StarIcon style={{ fontSize: 16 }} />}
                                  />
                                </Box>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </StyledTableContainer>
              </Paper>
            </motion.div>
          )}

          {!loading && !error && (!performanceData || performanceData.length === 0) && (
            <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: 300 }}>
              <Typography color="text.secondary" align="center" py={4}>
                {sprintId 
                  ? "Không có dữ liệu hiệu suất cho sprint này" 
                  : "Không có dữ liệu hiệu suất cho dự án này"
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </StyledCard>
    </Fade>
  );
};

export default TeamPerformance; 