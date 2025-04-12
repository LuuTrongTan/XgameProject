import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Pagination,
  Collapse,
  Alert
} from '@mui/material';
import {
  History as HistoryIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  TaskAlt as TaskIcon,
  Comment as CommentIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  SystemUpdate as SystemIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Description as DocumentIcon,
  Person
} from '@mui/icons-material';
import { getRecentActivities, getUserHistory, getSystemHistory } from '../../api/historyApi';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminView } from '../../contexts/AdminViewContext';
import { ROLES } from '../../config/constants';
import UserSelector from '../../components/admin/UserSelector';

const HistoryPage = () => {
  const { user } = useAuth();
  const { selectedUser, isAdminView } = useAdminView();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedItem, setExpandedItem] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [systemActivity, setSystemActivity] = useState([]);
  const [error, setError] = useState(null);
  
  const isAdmin = user && user.role === ROLES.ADMIN;
  
  // Nếu không phải admin và đang ở tab hệ thống, chuyển về tab cá nhân
  useEffect(() => {
    if (!isAdmin && activeTab === 1) {
      setActiveTab(0);
    }
  }, [isAdmin, activeTab]);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchActivities();
  }, [activeTab, selectedUser, isAdminView]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      // Chuẩn bị tham số
      const params = {
        page: 1,
        limit: 100
      };
      
      // Thêm userId nếu admin đang xem dữ liệu của một user cụ thể
      if (isAdminView && selectedUser) {
        params.userId = selectedUser._id;
        console.log(`[History] Fetching activities for selected user: ${selectedUser.name} (${selectedUser._id})`);
      } else {
        console.log(`[History] Fetching activities for current user: ${user.name} (${user.id})`);
      }
      
      console.log('[History] Request params:', params);
      
      let response;

      // Lựa chọn API endpoint dựa vào tab đang active
      if (activeTab === 0) {
        // Hoạt động cá nhân hoặc của user được chọn
        console.log('[History] Fetching user history with params:', params);
        response = await getUserHistory(params);
        console.log('[History] User history response:', response);
      } else {
        // Hoạt động hệ thống
        console.log('[History] Fetching system history with params:', params);
        response = await getSystemHistory(params);
        console.log('[History] System history response:', response);
      }

      if (response.success) {
        const responseData = response.data || [];
        console.log(`[History] Received ${responseData.length || 0} activities`);
        console.log('[History] Response data types:', responseData.map(item => item.type).join(', '));
        
        // Kiểm tra nếu mảng rỗng
        if (!responseData.length) {
          console.log('[History] Empty activities array received');
          setActivities([]);
          setFilteredActivities([]);
          groupActivities([]);
        } else {
          setActivities(responseData);
          setFilteredActivities(responseData);
          groupActivities(responseData);
        }
        
        // Cập nhật tổng số trang
        if (response.pagination) {
          console.log('[History] Pagination info:', response.pagination);
          setTotalPages(response.pagination.pages || 1);
        }
      } else {
        console.error('[History] API error:', response.message);
        setError(response.message || 'Có lỗi xảy ra khi tải lịch sử hoạt động');
        
        // Reset state data khi có lỗi
        setActivities([]);
        setFilteredActivities([]);
        groupActivities([]);
      }
    } catch (error) {
      console.error('[History] Error fetching activities:', error);
      setError('Không thể tải lịch sử hoạt động');
      
      // Reset state data khi có lỗi
      setActivities([]);
      setFilteredActivities([]);
      groupActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const groupActivities = (activityList) => {
    if (!activityList || activityList.length === 0) {
      console.log('[History] groupActivities: empty or null activity list, setting empty arrays');
      setUserActivity([]);
      setSystemActivity([]);
      return;
    }
    
    console.log('[History] groupActivities: processing', activityList.length, 'activities');
    
    // Phân loại các hoạt động theo loại
    const userAct = activityList.filter(activity => 
      activity.type === 'task' || 
      activity.type === 'comment' || 
      activity.type === 'sprint'
    );
    
    const systemAct = activityList.filter(activity => 
      activity.type === 'system' || 
      activity.type === 'project' || 
      activity.type === 'user'
    );
    
    console.log('[History] Grouped activities - user:', userAct.length, 'system:', systemAct.length);
    
    setUserActivity(userAct);
    setSystemActivity(systemAct);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setPage(1);
    setSearchQuery('');
    setSelectedFilter('all');
  };

  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    handleFilterMenuClose();
    
    if (filter === 'all') {
      setFilteredActivities(activities);
    } else {
      const filtered = activities.filter(activity => activity.type === filter);
      setFilteredActivities(filtered);
    }
    
    setPage(1);
  };

  const handleSearch = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      // Nếu không có từ khóa tìm kiếm, trả về danh sách đã lọc theo loại
      if (selectedFilter === 'all') {
        setFilteredActivities(activities);
      } else {
        const filtered = activities.filter(activity => activity.type === selectedFilter);
        setFilteredActivities(filtered);
      }
    } else {
      // Lọc theo từ khóa tìm kiếm và loại
      let filtered = activities;
      
      if (selectedFilter !== 'all') {
        filtered = filtered.filter(activity => activity.type === selectedFilter);
      }
      
      // Lọc theo từ khóa
      filtered = filtered.filter(activity => 
        (activity.title && activity.title.toLowerCase().includes(query)) ||
        (activity.description && activity.description.toLowerCase().includes(query)) ||
        (activity.action && activity.action.toLowerCase().includes(query))
      );
      
      setFilteredActivities(filtered);
    }
    
    setPage(1);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  const handleExpandItem = (id) => {
    if (expandedItem === id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(id);
    }
  };

  const handleRefresh = () => {
    fetchActivities();
  };

  // Định dạng thời gian
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      
      if (isToday(date)) {
        return `Hôm nay, ${format(date, 'HH:mm')}`;
      } else if (isYesterday(date)) {
        return `Hôm qua, ${format(date, 'HH:mm')}`;
      } else {
        return format(date, 'dd/MM/yyyy, HH:mm', { locale: vi });
      }
    } catch (error) {
      console.error('Date format error:', error);
      return 'Không hợp lệ';
    }
  };

  // Lấy icon phù hợp với loại hoạt động
  const getActivityIcon = (activity) => {
    const iconStyle = { fontSize: 20 };
    
    switch (activity.type) {
      case 'task':
        return <TaskIcon sx={iconStyle} color="primary" />;
      case 'comment':
        return <CommentIcon sx={iconStyle} color="secondary" />;
      case 'project':
        return <AssignmentIcon sx={iconStyle} color="success" />;
      case 'sprint':
        return <ScheduleIcon sx={iconStyle} color="info" />;
      case 'user':
        return <PersonIcon sx={iconStyle} color="warning" />;
      case 'system':
        return <SystemIcon sx={iconStyle} color="error" />;
      default:
        return <DocumentIcon sx={iconStyle} color="action" />;
    }
  };

  // Lấy text hiển thị cho loại hoạt động
  const getActivityTypeLabel = (type) => {
    switch (type) {
      case 'task':
        return 'Công việc';
      case 'comment':
        return 'Bình luận';
      case 'project':
        return 'Dự án';
      case 'sprint':
        return 'Sprint';
      case 'user':
        return 'Người dùng';
      case 'system':
        return 'Hệ thống';
      default:
        return type;
    }
  };

  // Lấy text hiển thị cho hành động
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

  // Lấy màu chip cho loại hoạt động
  const getTypeChipColor = (type) => {
    switch (type) {
      case 'task':
        return 'primary';
      case 'comment':
        return 'secondary';
      case 'project':
        return 'success';
      case 'sprint':
        return 'info';
      case 'user':
        return 'warning';
      case 'system':
        return 'error';
      default:
        return 'default';
    }
  };

  // Tính toán các hoạt động hiển thị cho trang hiện tại
  const paginatedActivities = filteredActivities.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 3, mb: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, color: '#1a365d' }}>
            Lịch sử hoạt động
          </Typography>
        </motion.div>
        
        {isAdminView && (
          <Box sx={{ mb: 2 }}>
            <UserSelector />
          </Box>
        )}
        
        {isAdminView && selectedUser && (
          <Alert 
            severity="info" 
            sx={{ mb: 3, borderRadius: 2 }}
            icon={<Person />}
          >
            Đang xem lịch sử hoạt động của người dùng: <strong>{selectedUser.name || selectedUser.email}</strong>
          </Alert>
        )}
        
        <Paper sx={{ 
          mb: 3, 
          borderRadius: 2, 
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <Tabs 
            value={activeTab}
            onChange={handleTabChange}
            aria-label="history tabs"
            sx={{
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.95rem',
                py: 2,
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
            <Tab 
              icon={<PersonIcon sx={{ mr: 1 }} />} 
              iconPosition="start" 
              label="Hoạt động cá nhân" 
              sx={{ minHeight: 'auto' }}
            />
            {isAdmin && (
              <Tab 
                icon={<SystemIcon sx={{ mr: 1 }} />} 
                iconPosition="start" 
                label="Hoạt động hệ thống" 
                sx={{ minHeight: 'auto' }}
              />
            )}
          </Tabs>
          
          <Box sx={{ p: 2, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between' }}>
            <TextField
              placeholder="Tìm kiếm hoạt động..."
              size="small"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearch}
              sx={{ 
                width: 300,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'white'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Box>
              <IconButton onClick={handleRefresh} title="Làm mới" color="primary">
                <RefreshIcon />
              </IconButton>
              
              <IconButton onClick={handleFilterMenuOpen} title="Lọc">
                <FilterIcon />
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
                  onClick={() => handleFilterSelect('all')}
                  selected={selectedFilter === 'all'}
                >
                  <ListItemIcon>
                    <HistoryIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Tất cả hoạt động" />
                </MenuItem>
                <Divider />
                <MenuItem 
                  onClick={() => handleFilterSelect('task')}
                  selected={selectedFilter === 'task'}
                >
                  <ListItemIcon>
                    <TaskIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Công việc" />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleFilterSelect('comment')}
                  selected={selectedFilter === 'comment'}
                >
                  <ListItemIcon>
                    <CommentIcon fontSize="small" color="secondary" />
                  </ListItemIcon>
                  <ListItemText primary="Bình luận" />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleFilterSelect('sprint')}
                  selected={selectedFilter === 'sprint'}
                >
                  <ListItemIcon>
                    <ScheduleIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText primary="Sprint" />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleFilterSelect('project')}
                  selected={selectedFilter === 'project'}
                >
                  <ListItemIcon>
                    <AssignmentIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Dự án" />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleFilterSelect('user')}
                  selected={selectedFilter === 'user'}
                >
                  <ListItemIcon>
                    <PersonIcon fontSize="small" color="warning" />
                  </ListItemIcon>
                  <ListItemText primary="Người dùng" />
                </MenuItem>
                <MenuItem 
                  onClick={() => handleFilterSelect('system')}
                  selected={selectedFilter === 'system'}
                >
                  <ListItemIcon>
                    <SystemIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  <ListItemText primary="Hệ thống" />
                </MenuItem>
              </Menu>
            </Box>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredActivities.length > 0 ? (
            <>
              <List sx={{ py: 0 }}>
                {paginatedActivities.map((activity, index) => (
                  <React.Fragment key={activity._id || `activity-${index}`}>
                    <ListItem 
                      alignItems="flex-start"
                      sx={{ 
                        py: 2,
                        px: 3,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                      onClick={() => handleExpandItem(activity._id || `activity-${index}`)}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        {getActivityIcon(activity)}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 500 }}>
                              {activity.title || 'Hoạt động không xác định'}
                            </Typography>
                            
                            <Chip 
                              label={getActivityTypeLabel(activity.type)}
                              size="small"
                              color={getTypeChipColor(activity.type)}
                              sx={{ 
                                height: 20, 
                                fontSize: '0.7rem', 
                                fontWeight: 500 
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              component="div"
                              sx={{ display: 'block', mb: 0.5 }}
                            >
                              {activity.user?.name || 'Hệ thống'} {getActionLabel(activity.action)} {activity.description || ''}
                            </Typography>
                            
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              component="span"
                              sx={{ display: 'flex', alignItems: 'center' }}
                            >
                              <ScheduleIcon sx={{ fontSize: 14, mr: 0.5 }} />
                              {formatDateTime(activity.createdAt)}
                            </Typography>
                          </Box>
                        }
                      />
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton 
                          size="small" 
                          sx={{
                            transform: expandedItem === (activity._id || `activity-${index}`) ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s'
                          }}
                        >
                          <ExpandMoreIcon />
                        </IconButton>
                      </Box>
                    </ListItem>
                    
                    <Collapse 
                      in={expandedItem === (activity._id || `activity-${index}`)} 
                      timeout="auto" 
                      unmountOnExit
                    >
                      <Box sx={{ p: 2, pl: 7, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                        <Card variant="outlined" sx={{ borderRadius: 2 }}>
                          <CardContent>
                            {activity.metadata && Object.keys(activity.metadata).length > 0 ? (
                              <Grid container spacing={2}>
                                {Object.entries(activity.metadata).map(([key, value]) => (
                                  <Grid item xs={12} sm={6} key={key}>
                                    <Typography variant="caption" color="text.secondary" component="div">
                                      {key}:
                                    </Typography>
                                    <Typography variant="body2" component="div">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </Typography>
                                  </Grid>
                                ))}
                              </Grid>
                            ) : (
                              <Typography variant="body2" color="text.secondary" component="div">
                                Không có thông tin chi tiết
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Box>
                    </Collapse>
                    
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
              
              {filteredActivities.length > ITEMS_PER_PAGE && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <Pagination 
                    count={Math.ceil(filteredActivities.length / ITEMS_PER_PAGE)} 
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
              )}
            </>
          ) : (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" component="div" gutterBottom>
                Không tìm thấy hoạt động nào
              </Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Hoạt động của bạn sẽ xuất hiện ở đây'}
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default HistoryPage; 