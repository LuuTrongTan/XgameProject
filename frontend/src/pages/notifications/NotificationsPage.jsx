import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  Stack,
  CircularProgress,
  Pagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Checkbox
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { getNotifications, markAsRead, deleteNotifications } from '../../api/notificationApi';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationStats, setNotificationStats] = useState({});
  const [selectedType, setSelectedType] = useState('all');
  
  const limit = 10; // Number of notifications per page

  useEffect(() => {
    fetchNotifications();
  }, [page, filter, selectedType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Prepare query parameters
      const params = {
        page,
        limit,
        unreadOnly: filter === 'unread',
      };
      
      // Add type filter if not 'all'
      if (selectedType !== 'all') {
        params.type = selectedType;
      }
      
      const result = await getNotifications(params);
      
      if (result.success) {
        setNotifications(result.data.notifications);
        setTotalPages(result.data.totalPages);
        setUnreadCount(result.data.unreadCount);
        setNotificationStats(result.data.stats || {});
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleFilterChange = (event, newValue) => {
    setFilter(newValue);
    setPage(1); // Reset to first page when filter changes
  };

  const handleNotificationClick = (notification) => {
    // Navigate to the link from notification
    if (notification.link) {
      navigate(notification.link);
    }
    
    // Mark this notification as read if not already
    if (!notification.isRead) {
      markAsRead({ notificationIds: [notification._id] })
        .then(result => {
          if (result.success) {
            setNotifications(prev => 
              prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        })
        .catch(error => console.error('Error marking notification as read:', error));
    }
  };

  const handleNotificationSelect = (notification) => {
    setSelectedNotifications(prev => {
      const isSelected = prev.some(n => n._id === notification._id);
      
      if (isSelected) {
        return prev.filter(n => n._id !== notification._id);
      } else {
        return [...prev, notification];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications([...notifications]);
    }
  };

  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
  };

  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const handleMarkAllAsRead = () => {
    markAsRead({ all: true })
      .then(result => {
        if (result.success) {
          setNotifications(prev => 
            prev.map(notification => ({ ...notification, isRead: true }))
          );
          setUnreadCount(0);
          handleMenuClose();
        }
      })
      .catch(error => console.error('Error marking all notifications as read:', error));
  };

  const handleMarkSelectedAsRead = () => {
    const notificationIds = selectedNotifications.map(n => n._id);
    
    markAsRead({ notificationIds })
      .then(result => {
        if (result.success) {
          setNotifications(prev => 
            prev.map(n => 
              notificationIds.includes(n._id) ? { ...n, isRead: true } : n
            )
          );
          const unreadMarkedCount = selectedNotifications.filter(n => !n.isRead).length;
          setUnreadCount(prev => Math.max(0, prev - unreadMarkedCount));
          setSelectedNotifications([]);
          handleMenuClose();
        }
      })
      .catch(error => console.error('Error marking selected notifications as read:', error));
  };

  const handleDeleteAll = () => {
    deleteNotifications({ all: true })
      .then(result => {
        if (result.success) {
          setNotifications([]);
          setUnreadCount(0);
          handleCloseDeleteDialog();
          fetchNotifications();
        }
      })
      .catch(error => console.error('Error deleting all notifications:', error));
  };

  const handleDeleteSelected = () => {
    const notificationIds = selectedNotifications.map(n => n._id);
    
    deleteNotifications({ notificationIds })
      .then(result => {
        if (result.success) {
          setNotifications(prev => 
            prev.filter(n => !notificationIds.includes(n._id))
          );
          
          const unreadDeletedCount = selectedNotifications.filter(n => !n.isRead).length;
          setUnreadCount(prev => Math.max(0, prev - unreadDeletedCount));
          
          setSelectedNotifications([]);
          handleCloseDeleteDialog();
        }
      })
      .catch(error => console.error('Error deleting selected notifications:', error));
  };

  const handleRefresh = () => {
    fetchNotifications();
  };

  const handleTypeClick = (type) => {
    setSelectedType(type);
    handleFilterMenuClose();
    setPage(1); // Reset to first page
  };

  const getNotificationTypeLabel = (type) => {
    const typeLabels = {
      'task_assigned': 'Gán task',
      'task_updated': 'Cập nhật task',
      'task_commented': 'Bình luận task',
      'task_mentioned': 'Đề cập trong task',
      'task_status': 'Trạng thái task',
      'task_due_soon': 'Task sắp đến hạn',
      'task_overdue': 'Task quá hạn',
      'task_completed': 'Task hoàn thành',
      'project_role': 'Vai trò dự án',
      'project_removed': 'Xóa khỏi dự án',
      'project_invitation': 'Lời mời dự án',
      'project_milestone': 'Cột mốc dự án',
      'all': 'Tất cả thông báo'
    };
    
    return typeLabels[type] || type;
  };

  // Format notification timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  // Get list of notification types from stats
  const notificationTypes = Object.keys(notificationStats).sort();

  return (
    <Container maxWidth="md">
      <Paper sx={{ mt: 3, mb: 4, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Thông báo
              {unreadCount > 0 && (
                <Chip 
                  label={unreadCount} 
                  size="small" 
                  color="error" 
                  sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} 
                />
              )}
            </Typography>
            
            <Box>
              <IconButton onClick={handleRefresh} title="Làm mới">
                <RefreshIcon />
              </IconButton>
              
              <IconButton onClick={handleFilterMenuOpen} title="Lọc theo loại">
                <FilterListIcon />
              </IconButton>
              
              <Menu
                anchorEl={filterMenuAnchorEl}
                open={Boolean(filterMenuAnchorEl)}
                onClose={handleFilterMenuClose}
              >
                <MenuItem onClick={() => handleTypeClick('all')}>
                  <Typography>Tất cả thông báo</Typography>
                </MenuItem>
                <Divider />
                {notificationTypes.map(type => (
                  <MenuItem key={type} onClick={() => handleTypeClick(type)}>
                    <ListItemText 
                      primary={getNotificationTypeLabel(type)} 
                      secondary={`${notificationStats[type] || 0} thông báo`}
                    />
                  </MenuItem>
                ))}
              </Menu>
              
              <IconButton 
                onClick={handleMenuOpen} 
                title="Tùy chọn khác"
                disabled={loading || notifications.length === 0}
              >
                <MoreVertIcon />
              </IconButton>
              
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                {unreadCount > 0 && (
                  <MenuItem onClick={handleMarkAllAsRead}>
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <CheckCircleIcon fontSize="small" />
                    </ListItemAvatar>
                    <ListItemText primary="Đánh dấu tất cả đã đọc" />
                  </MenuItem>
                )}
                
                {selectedNotifications.length > 0 && (
                  <MenuItem onClick={handleMarkSelectedAsRead}>
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <CheckCircleIcon fontSize="small" />
                    </ListItemAvatar>
                    <ListItemText primary="Đánh dấu đã đọc đã chọn" />
                  </MenuItem>
                )}
                
                <MenuItem onClick={handleOpenDeleteDialog}>
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <DeleteIcon fontSize="small" />
                  </ListItemAvatar>
                  <ListItemText primary={selectedNotifications.length > 0 ? "Xóa thông báo đã chọn" : "Xóa tất cả thông báo"} />
                </MenuItem>
                
                {selectedNotifications.length > 0 && (
                  <MenuItem onClick={() => setSelectedNotifications([])}>
                    <ListItemText primary="Bỏ chọn tất cả" />
                  </MenuItem>
                )}
              </Menu>
            </Box>
          </Box>
          
          <Tabs 
            value={filter} 
            onChange={handleFilterChange}
            sx={{ 
              minHeight: 40, 
              '& .MuiTab-root': { minHeight: 40, py: 0 } 
            }}
          >
            <Tab label="Tất cả" value="all" />
            <Tab 
              label="Chưa đọc" 
              value="unread" 
              disabled={unreadCount === 0}
            />
            <Tab label="Đã đọc" value="read" />
          </Tabs>
        </Box>
        
        {selectedType !== 'all' && (
          <Box sx={{ px: 3, py: 1.5, bgcolor: 'rgba(0, 0, 0, 0.02)', borderBottom: '1px solid rgba(0, 0, 0, 0.08)' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2">
                Đang lọc:
              </Typography>
              <Chip 
                label={getNotificationTypeLabel(selectedType)} 
                onDelete={() => setSelectedType('all')}
                size="small"
              />
            </Stack>
          </Box>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body1">Không có thông báo nào</Typography>
          </Box>
        ) : (
          <>
            <List sx={{ py: 0 }}>
              {notifications.map((notification) => {
                const isSelected = selectedNotifications.some(n => n._id === notification._id);
                
                return (
                  <React.Fragment key={notification._id}>
                    <ListItem 
                      alignItems="flex-start" 
                      sx={{ 
                        py: 2,
                        px: 3,
                        backgroundColor: isSelected 
                          ? 'rgba(25, 118, 210, 0.08)'
                          : notification.isRead 
                            ? 'transparent' 
                            : 'rgba(25, 118, 210, 0.04)',
                        '&:hover': {
                          backgroundColor: isSelected 
                            ? 'rgba(25, 118, 210, 0.12)'
                            : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="select"
                          onClick={() => handleNotificationSelect(notification)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                            inputProps={{ 'aria-label': 'select notification' }}
                          />
                        </IconButton>
                      }
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={notification.sender?.avatar} 
                          alt={notification.sender?.name || 'User'}
                          sx={{ bgcolor: notification.isRead ? 'grey.300' : 'primary.main' }}
                        >
                          {notification.sender?.name?.[0] || 'U'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ pr: 4 }}>
                            <Typography 
                              variant="subtitle1" 
                              sx={{ 
                                fontWeight: notification.isRead ? 400 : 600,
                                mb: 0.5
                              }}
                            >
                              {notification.message}
                            </Typography>
                            
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ display: 'block', mb: 1 }}
                            >
                              {formatTime(notification.createdAt)}
                            </Typography>
                            
                            <Chip
                              label={getNotificationTypeLabel(notification.type)}
                              size="small"
                              sx={{ 
                                fontSize: '0.7rem', 
                                height: 24,
                                backgroundColor: 'rgba(0, 0, 0, 0.06)'
                              }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                );
              })}
            </List>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary"
              />
            </Box>
          </>
        )}
      </Paper>
      
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>
          {selectedNotifications.length > 0 
            ? "Xóa thông báo đã chọn" 
            : "Xóa tất cả thông báo"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedNotifications.length > 0 
              ? `Bạn có chắc chắn muốn xóa ${selectedNotifications.length} thông báo đã chọn không?` 
              : "Bạn có chắc chắn muốn xóa tất cả thông báo không?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Hủy</Button>
          <Button 
            onClick={selectedNotifications.length > 0 ? handleDeleteSelected : handleDeleteAll} 
            color="error"
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NotificationsPage; 