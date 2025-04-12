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
  Checkbox,
  Alert
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  Person
} from '@mui/icons-material';
import { getNotifications, markAsRead, deleteNotifications } from '../../api/notificationApi';
import { useNavigate } from 'react-router-dom';
import { useAdminView } from '../../contexts/AdminViewContext';
import { useAuth } from '../../contexts/AuthContext';
import UserSelector from '../../components/admin/UserSelector';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedUser, isAdminView } = useAdminView();
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
  }, [page, filter, selectedType, selectedUser]);

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
      
      // Add userId if admin is viewing specific user
      let requestConfig = {};
      if (isAdminView && selectedUser) {
        console.log(`[Notifications] Fetching notifications for selected user: ${selectedUser.name} (${selectedUser._id})`);
        // Kiểm tra nếu API sử dụng endpoint khác hoặc cần params userId
        if (selectedUser._id) {
          params.userId = selectedUser._id;
          requestConfig = { params };
        }
      } else {
        console.log(`[Notifications] Fetching notifications for current user: ${user.name} (${user.id})`);
        requestConfig = { params };
      }
      
      console.log('[Notifications] Request params:', params);
      
      const result = await getNotifications(params);
      
      console.log(`[Notifications] API Response:`, result);
      
      if (result.success) {
        console.log(`[Notifications] Received ${result.data.notifications?.length || 0} notifications`);
        setNotifications(result.data.notifications);
        setTotalPages(result.data.totalPages);
        setUnreadCount(result.data.unreadCount);
        setNotificationStats(result.data.stats || {});
      } else {
        console.error('[Notifications] API error:', result.message);
      }
    } catch (error) {
      console.error('[Notifications] Error fetching notifications:', error);
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
      const data = { notificationIds: [notification._id] };
      
      // Add userId if admin is viewing specific user
      if (isAdminView && selectedUser) {
        data.userId = selectedUser._id;
      }
      
      markAsRead(data)
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
    const data = { all: true };
    
    // Add userId if admin is viewing specific user
    if (isAdminView && selectedUser) {
      data.userId = selectedUser._id;
    }
    
    markAsRead(data)
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
    const data = { notificationIds };
    
    // Add userId if admin is viewing specific user
    if (isAdminView && selectedUser) {
      data.userId = selectedUser._id;
    }
    
    markAsRead(data)
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
    const data = { all: true };
    
    // Add userId if admin is viewing specific user
    if (isAdminView && selectedUser) {
      data.userId = selectedUser._id;
    }
    
    deleteNotifications(data)
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
    const data = { notificationIds };
    
    // Add userId if admin is viewing specific user
    if (isAdminView && selectedUser) {
      data.userId = selectedUser._id;
    }
    
    deleteNotifications(data)
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
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        Thông báo
      </Typography>

      {isAdminView && (
        <Box sx={{ mb: 3 }}>
          <UserSelector />
        </Box>
      )}
      
      {isAdminView && selectedUser && (
        <Alert 
          severity="info" 
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<Person />}
        >
          Đang xem thông báo của người dùng: <strong>{selectedUser.name || selectedUser.email}</strong>
        </Alert>
      )}

      <Paper sx={{ 
        mt: 3, 
        mb: 4, 
        borderRadius: 2, 
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <Box sx={{ 
          p: 3, 
          pb: 2, 
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(to right, #f7f9fc, #edf2f7)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
              Thông báo
              {unreadCount > 0 && (
                <Chip 
                  label={unreadCount} 
                  size="small" 
                  color="error" 
                  sx={{ 
                    ml: 1, 
                    height: 20, 
                    fontSize: '0.75rem',
                    fontWeight: 'bold' 
                  }} 
                />
              )}
            </Typography>
            
            <Box>
              <IconButton 
                onClick={handleRefresh} 
                title="Làm mới"
                sx={{ 
                  color: '#3182ce',
                  '&:hover': { 
                    backgroundColor: 'rgba(49, 130, 206, 0.08)'
                  } 
                }}
              >
                <RefreshIcon />
              </IconButton>
              
              <IconButton 
                onClick={handleFilterMenuOpen} 
                title="Lọc theo loại"
                sx={{ 
                  color: '#3182ce',
                  '&:hover': { 
                    backgroundColor: 'rgba(49, 130, 206, 0.08)'
                  } 
                }}
              >
                <FilterListIcon />
              </IconButton>
              
              <Menu
                anchorEl={filterMenuAnchorEl}
                open={Boolean(filterMenuAnchorEl)}
                onClose={handleFilterMenuClose}
                PaperProps={{
                  sx: {
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    borderRadius: 2
                  }
                }}
              >
                <MenuItem 
                  onClick={() => handleTypeClick('all')}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(49, 130, 206, 0.08)'
                    }
                  }}
                >
                  <Typography>Tất cả thông báo</Typography>
                </MenuItem>
                <Divider />
                {notificationTypes.map(type => (
                  <MenuItem 
                    key={type} 
                    onClick={() => handleTypeClick(type)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(49, 130, 206, 0.08)'
                      }
                    }}
                  >
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
                sx={{ 
                  color: '#3182ce',
                  '&:hover': { 
                    backgroundColor: 'rgba(49, 130, 206, 0.08)'
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(0, 0, 0, 0.26)'
                  }
                }}
              >
                <MoreVertIcon />
              </IconButton>
              
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    borderRadius: 2,
                    width: 230
                  }
                }}
              >
                {unreadCount > 0 && (
                  <MenuItem 
                    onClick={handleMarkAllAsRead}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(49, 130, 206, 0.08)'
                      }
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <CheckCircleIcon fontSize="small" color="primary" />
                    </ListItemAvatar>
                    <ListItemText primary="Đánh dấu tất cả đã đọc" />
                  </MenuItem>
                )}
                
                {selectedNotifications.length > 0 && (
                  <MenuItem 
                    onClick={handleMarkSelectedAsRead}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(49, 130, 206, 0.08)'
                      }
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <CheckCircleIcon fontSize="small" color="primary" />
                    </ListItemAvatar>
                    <ListItemText primary="Đánh dấu đã đọc đã chọn" />
                  </MenuItem>
                )}
                
                <MenuItem 
                  onClick={handleOpenDeleteDialog}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(229, 62, 62, 0.08)'
                    }
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemAvatar>
                  <ListItemText primary={selectedNotifications.length > 0 ? "Xóa thông báo đã chọn" : "Xóa tất cả thông báo"} />
                </MenuItem>
                
                {selectedNotifications.length > 0 && (
                  <MenuItem 
                    onClick={() => setSelectedNotifications([])}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(49, 130, 206, 0.08)'
                      }
                    }}
                  >
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
              '& .MuiTab-root': { 
                minHeight: 40, 
                py: 0,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  color: '#3182ce',
                  fontWeight: 600
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#3182ce',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab label="Tất cả" value="all" />
            <Tab 
              label={`Chưa đọc${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
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
            <Typography variant="body1" color="text.secondary">Không có thông báo nào</Typography>
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
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        backgroundColor: isSelected 
                          ? 'rgba(49, 130, 206, 0.08)'
                          : notification.isRead 
                            ? 'transparent' 
                            : 'rgba(49, 130, 206, 0.04)',
                        '&:hover': {
                          backgroundColor: isSelected 
                            ? 'rgba(49, 130, 206, 0.12)'
                            : 'rgba(0, 0, 0, 0.04)'
                        },
                        position: 'relative',
                        ...(notification.isRead ? {} : {
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            backgroundColor: '#3182ce',
                            borderRadius: '0 2px 2px 0'
                          }
                        })
                      }}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="select"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationSelect(notification);
                          }}
                          sx={{
                            color: isSelected ? '#3182ce' : 'rgba(0, 0, 0, 0.54)'
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                            inputProps={{ 'aria-label': 'select notification' }}
                            color="primary"
                          />
                        </IconButton>
                      }
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          src={notification.sender?.avatar} 
                          alt={notification.sender?.name || 'User'}
                          sx={{ 
                            bgcolor: notification.isRead ? 'grey.300' : '#3182ce',
                            boxShadow: notification.isRead ? 'none' : '0 2px 5px rgba(49, 130, 206, 0.3)'
                          }}
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
                                mb: 0.5,
                                color: notification.isRead ? '#2d3748' : '#1a202c'
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
                                backgroundColor: notification.isRead 
                                  ? 'rgba(0, 0, 0, 0.06)' 
                                  : 'rgba(49, 130, 206, 0.08)',
                                borderRadius: '4px'
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
                sx={{
                  '& .MuiPaginationItem-root': {
                    borderRadius: '8px',
                    '&.Mui-selected': {
                      fontWeight: 600,
                      boxShadow: '0 2px 5px rgba(49, 130, 206, 0.2)'
                    }
                  }
                }}
              />
            </Box>
          </>
        )}
      </Paper>
      
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
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
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button 
            onClick={handleCloseDeleteDialog} 
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Hủy
          </Button>
          <Button 
            onClick={selectedNotifications.length > 0 ? handleDeleteSelected : handleDeleteAll} 
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3
            }}
          >
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NotificationsPage; 