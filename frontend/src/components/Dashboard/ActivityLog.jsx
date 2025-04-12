import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  useTheme,
  alpha,
  Paper,
  Tooltip,
  IconButton,
  Button,
  Menu,
  MenuItem,
  CircularProgress
} from "@mui/material";
import {
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Comment as CommentIcon,
  Person as PersonIcon,
  Folder as FolderIcon,
  Timeline as TimelineIcon,
  ArrowForward as ArrowForwardIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  TaskAlt as TaskIcon,
  SwapVert as SwapVertIcon,
  AccessTime as TimeIcon,
  Settings as SettingsIcon
} from "@mui/icons-material";
import { formatDistanceToNow, formatDistance } from "date-fns";
import { vi } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * Log hoạt động hiển thị trên Dashboard
 */
const ActivityLog = ({ activities = [], onRefresh, loading = false }) => {
  const navigate = useNavigate();
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [sortOrder, setSortOrder] = useState('newest');

  const handleOpenSortMenu = (event) => {
    setSortMenuAnchor(event.currentTarget);
  };

  const handleCloseSortMenu = () => {
    setSortMenuAnchor(null);
  };

  const handleSort = (order) => {
    setSortOrder(order);
    handleCloseSortMenu();
  };

  const getActivityIcon = (activity) => {
    const iconStyle = { fontSize: 20 };
    
    switch (activity.type) {
      case 'task':
        return <TaskIcon color="primary" sx={iconStyle} />;
      case 'comment':
        return <CommentIcon color="secondary" sx={iconStyle} />;
      case 'project':
        return <AssignmentIcon color="success" sx={iconStyle} />;
      case 'user':
        return <PersonIcon color="warning" sx={iconStyle} />;
      case 'system':
        return <SettingsIcon color="error" sx={iconStyle} />;
      default:
        return <TimeIcon color="info" sx={iconStyle} />;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'created':
        return 'đã tạo';
      case 'updated':
        return 'đã cập nhật';
      case 'deleted':
        return 'đã xóa';
      case 'completed':
        return 'đã hoàn thành';
      case 'archived':
        return 'đã lưu trữ';
      case 'restored':
        return 'đã khôi phục';
      case 'assigned':
        return 'đã giao';
      case 'commented':
        return 'đã bình luận';
      default:
        return action;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true, locale: vi });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const handleActivityClick = (activity) => {
    if (activity.link) {
      navigate(activity.link);
    } else if (activity.task) {
      // Tìm task và đi đến trang task
      if (activity.project) {
        navigate(`/projects/${activity.project._id}/tasks?task=${activity.task._id}`);
      }
    } else if (activity.project && !activity.task) {
      // Đi đến trang project
      navigate(`/projects/${activity.project._id}`);
    }
  };

  // Sort activities by date
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  console.log("Activities in ActivityLog:", activities);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight="medium">
          Hoạt động gần đây của bạn
        </Typography>
        <Box>
          <Tooltip title="Sắp xếp">
            <IconButton size="small" onClick={handleOpenSortMenu}>
              <SwapVertIcon />
            </IconButton>
          </Tooltip>
          {onRefresh && (
            <Tooltip title="Làm mới">
              <IconButton 
                size="small" 
                onClick={onRefresh}
                disabled={loading}
                sx={{ ml: 1 }}
              >
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          )}
          <Menu
            anchorEl={sortMenuAnchor}
            open={Boolean(sortMenuAnchor)}
            onClose={handleCloseSortMenu}
          >
            <MenuItem 
              selected={sortOrder === 'newest'} 
              onClick={() => handleSort('newest')}
            >
              Mới nhất trước
            </MenuItem>
            <MenuItem 
              selected={sortOrder === 'oldest'} 
              onClick={() => handleSort('oldest')}
            >
              Cũ nhất trước
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : sortedActivities.length > 0 ? (
        <List disablePadding>
          {sortedActivities.map((activity, index) => (
            <React.Fragment key={activity._id || index}>
              <ListItem 
                alignItems="flex-start" 
                sx={{ 
                  px: 1, 
                  py: 1.5,
                  cursor: activity.link || activity.task || activity.project ? 'pointer' : 'default',
                  '&:hover': {
                    bgcolor: activity.link || activity.task || activity.project ? 'action.hover' : 'transparent'
                  }
                }}
                onClick={() => handleActivityClick(activity)}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar 
                    src={activity.user?.avatar} 
                    alt={activity.user?.name || 'User Avatar'} 
                    sx={{ width: 32, height: 32 }}
                  >
                    {!activity.user?.avatar && activity.user?.name ? activity.user.name[0] : 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" flexWrap="wrap" mb={0.5}>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        component="span"
                        sx={{ mr: 1 }}
                      >
                        {activity.user?.name || 'Hệ thống'}
                      </Typography>
                      <Typography variant="body2" component="span">
                        {getActionLabel(activity.action)}
                      </Typography>
                      {activity.type && (
                        <Chip
                          icon={getActivityIcon(activity)}
                          label={activity.title || activity.type}
                          size="small"
                          sx={{ ml: 1, height: 20, '& .MuiChip-label': { fontSize: '0.7rem' } }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      {activity.description && (
                        <Typography variant="body2" component="span" display="block" mb={0.5}>
                          {activity.description}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        component="span"
                        display="flex"
                        alignItems="center"
                      >
                        <TimeIcon sx={{ fontSize: 14, mr: 0.5 }} />
                        {formatDateTime(activity.createdAt)}
                        {activity.project && (
                          <>
                            <FolderIcon sx={{ fontSize: 14, ml: 1, mr: 0.5 }} />
                            {activity.project.name}
                          </>
                        )}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < sortedActivities.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          py={5}
          px={2}
          textAlign="center"
        >
          <HistoryIcon color="disabled" sx={{ fontSize: 40, mb: 2, opacity: 0.5 }} />
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Không có hoạt động nào được ghi nhận
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Các hoạt động của bạn như tạo task, dự án, bình luận sẽ xuất hiện ở đây
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ActivityLog;
