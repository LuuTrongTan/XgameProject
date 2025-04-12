import React from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent 
} from '@mui/material';
import { 
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  ChangeHistory as ChangeHistoryIcon,
  Assignment as AssignmentIcon,
  Comment as CommentIcon
} from '@mui/icons-material';
import { format, formatDistance } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserAvatar from '../common/UserAvatar';

// Component hiển thị một mục hoạt động
const ActivityItem = ({ activity, sx }) => {
  if (!activity) return null;

  // Format ngày
  const formatDate = (date) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Format khoảng thời gian
  const formatTimeAgo = (date) => {
    if (!date) return '';
    try {
      return formatDistance(new Date(date), new Date(), { 
        addSuffix: true,
        locale: vi 
      });
    } catch (error) {
      console.error('Error formatting time ago:', error);
      return '';
    }
  };

  // Lấy icon cho từng loại hành động
  const getActivityIcon = (type, action) => {
    switch (action) {
      case 'created':
        return <AddIcon color="success" />;
      case 'updated':
        return <EditIcon color="primary" />;
      case 'deleted':
        return <DeleteIcon color="error" />;
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'status':
        return <ChangeHistoryIcon color="info" />;
      case 'comment':
        return <CommentIcon color="secondary" />;
      default:
        return <AssignmentIcon color="action" />;
    }
  };

  // Lấy màu chip cho từng loại hoạt động
  const getActivityColor = (type) => {
    switch (type) {
      case 'task':
        return 'primary';
      case 'project':
        return 'success';
      case 'sprint':
        return 'info';
      case 'comment':
        return 'secondary';
      case 'user':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Lấy tên dự án từ nhiều nguồn khác nhau để đảm bảo luôn có tên dự án
  const getProjectName = () => {
    // 1. Từ trường project được populate
    if (activity.project && activity.project.name) {
      return activity.project.name;
    }
    
    // 2. Từ metadata hoặc details trong activity
    if (activity.metadata && activity.metadata.projectName) {
      return activity.metadata.projectName;
    }
    if (activity.details && activity.details.projectName) {
      return activity.details.projectName;
    }
    
    // 3. Từ dữ liệu cũ (legacy)
    if (activity.projectName) {
      return activity.projectName;
    }
    
    // 4. Fallback nếu không có thông tin nào
    return "Dự án";
  };

  return (
    <Card 
      variant="outlined"
      sx={{ 
        mb: 1.5, 
        borderRadius: 2,
        boxShadow: 'none',
        overflow: 'visible',
        ...sx
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="flex-start" gap={1.5}>
          {/* Avatar cho người dùng */}
          <UserAvatar 
            user={activity.user} 
            size={40}
            sx={{ 
              mt: 0.5,
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
            }}
          />
          
          <Box flex={1}>
            {/* Thông tin chính của hoạt động */}
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                {activity.title}
              </Typography>
              
              {activity.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {activity.description}
                </Typography>
              )}
            </Box>
            
            {/* Thông tin phụ (dự án, thời gian, v.v.) */}
            <Box 
              display="flex" 
              alignItems="center" 
              flexWrap="wrap"
              gap={1}
              mt={1}
            >
              {/* Loại hoạt động */}
              <Chip
                label={activity.type}
                color={getActivityColor(activity.type)}
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  textTransform: 'capitalize',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }}
              />
              
              {/* Dự án */}
              <Chip
                icon={<FolderIcon fontSize="small" />}
                label={getProjectName()}
                variant="outlined"
                size="small"
                sx={{ 
                  borderRadius: '8px',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }}
              />
              
              {/* Thời gian */}
              <Typography 
                variant="caption"
                color="text.secondary"
                sx={{ ml: 'auto' }}
              >
                <Tooltip title={formatDate(activity.createdAt)}>
                  <span>{formatTimeAgo(activity.createdAt)}</span>
                </Tooltip>
              </Typography>
            </Box>
          </Box>
          
          {/* Icon hành động */}
          <Tooltip title={activity.action}>
            <Box 
              sx={{ 
                p: 1, 
                borderRadius: '50%', 
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {getActivityIcon(activity.type, activity.action)}
            </Box>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityItem; 