import React from "react";
import {
  Box,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Divider,
  useTheme,
  alpha,
  Paper,
  Tooltip,
  IconButton,
  Badge
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  CheckCircleOutline as CheckIcon,
  PlayCircleOutline as InProgressIcon,
  PauseCircleOutline as TodoIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  Star as StarIcon,
  Flag as FlagIcon,
  Event as EventIcon
} from "@mui/icons-material";
import { format, isAfter, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const TaskItem = ({ task, index }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isOverdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate));
  
  const handleNavigateToTask = () => {
    if (task.project) {
      navigate(`/projects/${task.project._id}/tasks${task.sprint ? `?sprint=${task.sprint}` : ''}${task._id ? `&task=${task._id}` : ''}`);
    } else {
      navigate(`/tasks/${task._id || ''}`);
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case "done":
        return <CheckIcon sx={{ color: theme.palette.success.main }} />;
      case "inProgress":
        return <TodoIcon sx={{ color: theme.palette.warning.main }} />;
      case "todo":
        return <InProgressIcon sx={{ color: theme.palette.info.main }} />;
      default:
        return <AssignmentIcon />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case "done":
        return "success";
      case "inProgress":
        return "warning";
      case "todo":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case "done":
        return "Hoàn thành";
      case "inProgress":
        return "Đang làm";
      case "todo":
        return "Chờ xử lý";
      default:
        return "Không xác định";
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case "urgent":
        return theme.palette.error.main;
      case "high":
        return theme.palette.error.light;
      case "medium":
        return theme.palette.warning.main;
      case "low":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPriorityText = () => {
    switch (task.priority) {
      case "urgent":
        return "Khẩn cấp";
      case "high":
        return "Cao";
      case "medium":
        return "Trung bình";
      case "low":
        return "Thấp";
      default:
        return "Không xác định";
    }
  };

  const formatDueDate = () => {
    if (!task.dueDate) return "Không có hạn";
    
    try {
      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) return "Ngày không hợp lệ";
      
      return formatDistanceToNow(dueDate, { addSuffix: true, locale: vi });
    } catch (error) {
      console.error("Lỗi định dạng ngày:", error, task.dueDate);
      return "Lỗi định dạng";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Paper
        elevation={0}
        sx={{ 
          mb: 1.5, 
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
          }
        }}
      >
        <ListItem
          component={Link}
          to={task.project ? 
            `/projects/${task.project._id}/tasks${task.sprint ? `?sprint=${task.sprint}` : ''}${task._id ? `&task=${task._id}` : ''}` 
            : `/tasks/${task._id || ''}`
          }
          sx={{ 
            textDecoration: 'none', 
            color: 'inherit',
            py: 1.5,
            pr: 1.5,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.02),
            }
          }}
        >
          <ListItemAvatar>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette[getStatusColor()].main, 0.1),
                color: theme.palette[getStatusColor()].main,
              }}
            >
              {getStatusIcon()}
            </Avatar>
          </ListItemAvatar>
          
          <ListItemText
            disableTypography
            primary={
              <Box component="span" display="flex" alignItems="center" mb={0.5}>
                <Typography variant="subtitle2" fontWeight="medium" noWrap>
                  {task.title}
                </Typography>
                {task.priority && (
                  <Tooltip title={getPriorityText()}>
                    <Box component="span" ml={1} display="flex" alignItems="center">
                      <FlagIcon 
                        fontSize="small" 
                        sx={{ color: getPriorityColor(), fontSize: 16 }} 
                      />
                    </Box>
                  </Tooltip>
                )}
              </Box>
            }
            secondary={
              <Box component="span" display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                <Chip
                  label={getStatusText()}
                  color={getStatusColor()}
                  size="small"
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem',
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
                {task.project && (
                  <Chip
                    icon={<AssignmentIcon style={{ fontSize: 12 }} />}
                    label={task.project.name}
                    size="small"
                    variant="outlined"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1 },
                      '& .MuiChip-icon': { fontSize: 12 }
                    }}
                  />
                )}
                {task.dueDate && (
                  <Tooltip 
                    title={format(new Date(task.dueDate), 'PPP', { locale: vi })}
                    arrow
                  >
                    <Box 
                      component="span" 
                      sx={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        color: isOverdue ? theme.palette.error.main : 'text.secondary' 
                      }}
                    >
                      <EventIcon sx={{ mr: 0.5, fontSize: 14 }} />
                      {formatDueDate()}
                    </Box>
                  </Tooltip>
                )}
              </Box>
            }
          />
          
          <IconButton 
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleNavigateToTask();
            }}
            sx={{ 
              ml: 1,
              color: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              }
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </IconButton>
        </ListItem>
      </Paper>
    </motion.div>
  );
};

const MyTasks = ({ tasks = [] }) => {
  const theme = useTheme();
  
  const pendingTasks = tasks.filter(task => task.status !== 'done');
  const overdueTasks = tasks.filter(task => 
    task.status !== 'done' && 
    task.dueDate && 
    isAfter(new Date(), new Date(task.dueDate))
  );

  if (!tasks || tasks.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AssignmentIcon sx={{ fontSize: 48, color: alpha(theme.palette.primary.main, 0.2), mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Không có công việc nào được gán
          </Typography>
        </motion.div>
      </Box>
    );
  }

  return (
    <Box>
      <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6" fontWeight="bold">
          Công việc của tôi
        </Typography>
        <Box display="flex" gap={1}>
          <Badge 
            badgeContent={pendingTasks.length} 
            color="primary"
            max={99}
            sx={{ 
              '& .MuiBadge-badge': { 
                fontSize: '0.7rem', 
                height: 18, 
                minWidth: 18,
                top: 2,
                right: 2
              } 
            }}
          >
            <Chip 
              label="Đang xử lý" 
              size="small" 
              color="primary"
              sx={{ 
                borderRadius: 2,
                height: 24,
                fontSize: '0.75rem'
              }}
            />
          </Badge>
          {overdueTasks.length > 0 && (
            <Badge 
              badgeContent={overdueTasks.length} 
              color="error"
              max={99}
              sx={{ 
                '& .MuiBadge-badge': { 
                  fontSize: '0.7rem', 
                  height: 18, 
                  minWidth: 18,
                  top: 2,
                  right: 2
                } 
              }}
            >
              <Chip 
                label="Quá hạn" 
                size="small" 
                color="error"
                sx={{ 
                  borderRadius: 2,
                  height: 24,
                  fontSize: '0.75rem'
                }}
              />
            </Badge>
          )}
        </Box>
      </Box>

      <List disablePadding>
        {tasks.slice(0, 5).map((task, index) => (
          <TaskItem key={task._id || index} task={task} index={index} />
        ))}
        
        {tasks.length > 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Box 
              component={Link} 
              to="/tasks" 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 1.5,
                mt: 1,
                borderRadius: 2,
                textDecoration: 'none',
                color: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              <Typography variant="button" fontWeight="medium">
                Xem tất cả {tasks.length} công việc
              </Typography>
              <ArrowForwardIcon fontSize="small" sx={{ ml: 1 }} />
            </Box>
          </motion.div>
        )}
      </List>
    </Box>
  );
};

export default MyTasks; 