import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Avatar,
  AvatarGroup,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  AttachFile as AttachFileIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  Label as LabelIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserAvatar from '../common/UserAvatar';
import DateTimeDisplay from '../common/DateTimeDisplay';
import TaskAuditLog from './TaskAuditLog';
import { 
  getTaskStatusColor, 
  getTaskStatusLabel, 
  getTaskPriorityLabel, 
  getTaskPriorityColor 
} from '../../config/constants';
import { getSprintById } from '../../api/sprintApi';
import api from '../../api/api';
import { useSnackbar } from 'notistack';
import CommentForm from '../comments/CommentForm';
import FileUploader from './FileUploader';
import AttachmentsList from './AttachmentsList';
import { useAuth } from '../../contexts/AuthContext';

const TaskDetailView = ({ 
  open, 
  onClose, 
  task, 
  project,
  sprint: initialSprint,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [sprintDetails, setSprintDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAuth();
  
  if (!task) {
    console.log('[DEBUG] TaskDetailView - task is null, not rendering');
    return null;
  }
  
  console.log('[DEBUG] TaskDetailView rendering with:', {
    taskId: task._id,
    taskTitle: task.title,
    projectId: project?._id,
    initialSprintId: initialSprint?._id,
    taskSprintData: task.sprint,
    hasTaskSprint: !!task.sprint,
    hasTaskSprintName: task.sprint?.name ? true : false
  });

  const fetchSprintDetails = useCallback(async () => {
    if (initialSprint?._id) {
      try {
        const response = await getSprintById(project?._id, initialSprint._id);
        if (response.success) {
          setSprintDetails(response.data);
        } else {
          console.error('Failed to fetch sprint details:', response);
        }
      } catch (error) {
        console.error('Error fetching sprint details:', error);
      }
    }
  }, [initialSprint?._id, project?._id]);

  const fetchComments = useCallback(async () => {
    try {
      const sprintId = task.sprint?._id || initialSprint?._id;
      const taskId = task._id;
      const projectId = project?._id;
      
      if (!projectId || !sprintId || !taskId) {
        console.error('Missing required IDs for fetching comments:', {
          projectId,
          sprintId,
          taskId
        });
        return;
      }
      
      const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`);
      console.log('[DEBUG] Full comments response:', response.data);
      
      // Xử lý nhiều cấu trúc dữ liệu có thể có
      if (response.data) {
        if (Array.isArray(response.data)) {
          setComments(response.data);
          console.log('[DEBUG] Comments loaded from direct array:', response.data);
        } else if (response.data.data) {
          if (Array.isArray(response.data.data)) {
            setComments(response.data.data);
            console.log('[DEBUG] Comments loaded from data array:', response.data.data);
          } else if (response.data.data.comments && Array.isArray(response.data.data.comments)) {
            setComments(response.data.data.comments);
            console.log('[DEBUG] Comments loaded from nested comments array:', response.data.data.comments);
          } else {
            console.error('[DEBUG] Unexpected comments data structure:', response.data);
            setComments([]);
          }
        } else {
          console.error('[DEBUG] Unexpected comments data structure:', response.data);
          setComments([]);
        }
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
      enqueueSnackbar('Không thể tải bình luận', { variant: 'error' });
    }
  }, [task, initialSprint, project, enqueueSnackbar]);

  const fetchAttachments = useCallback(async () => {
    try {
      const sprintId = task.sprint?._id || initialSprint?._id;
      const taskId = task._id;
      const projectId = project?._id;
      
      if (!projectId || !sprintId || !taskId) {
        console.error('Missing required IDs for fetching attachments:', {
          projectId,
          sprintId,
          taskId
        });
        return;
      }
      
      const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`);
      if (response.data && response.data.success) {
        setAttachments(Array.isArray(response.data.data) ? response.data.data : []);
        console.log('[DEBUG] Attachments loaded:', response.data.data);
      } else {
        setAttachments([]);
      }
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setAttachments([]);
      enqueueSnackbar('Không thể tải danh sách tệp đính kèm', { variant: 'error' });
    }
  }, [task, initialSprint, project, enqueueSnackbar]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchSprintDetails(),
          fetchComments(),
          fetchAttachments()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && task) {
      loadData();
    }

    return () => {
      setSprintDetails(null);
      setComments([]);
      setAttachments([]);
    };
  }, [open, task, fetchSprintDetails, fetchComments, fetchAttachments]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEdit = () => {
    console.log('[DEBUG] TaskDetailView handleEdit button clicked, calling onEdit with task:', task._id);
    if (onEdit) {
      onEdit(task);
    }
  };

  const handleDelete = () => {
    console.log('[DEBUG] TaskDetailView handleDelete button clicked, calling onDelete with taskId:', task._id);
    if (onDelete) {
      onDelete(task._id);
    }
  };

  const handleAddToSprint = () => {
    console.log('[DEBUG] TaskDetailView handleAddToSprint clicked');
    if (onEdit) {
      onEdit(task, { showSprintSelection: true });
    }
  };

  const handleChangeSprint = () => {
    console.log('[DEBUG] TaskDetailView handleChangeSprint clicked');
    if (onEdit) {
      onEdit(task, { showSprintSelection: true });
    }
  };

  const handleAddComment = async (commentText) => {
    try {
      setIsAddingComment(true);
      const sprintId = task.sprint?._id || initialSprint?._id;
      const taskId = task._id;
      const projectId = project?._id;
      
      if (!projectId || !sprintId || !taskId) {
        console.error('Missing required IDs for adding comment:', {
          projectId,
          sprintId,
          taskId
        });
        enqueueSnackbar('Không thể thêm bình luận', { variant: 'error' });
        return;
      }
      
      const response = await api.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`, {
        content: commentText
      });
      
      console.log('[DEBUG] Add comment response:', response.data);
      
      if (response.data) {
        let newComment;
        
        if (response.data.data) {
          newComment = response.data.data;
        } else if (response.data.comment) {
          newComment = response.data.comment;
        } else {
          newComment = response.data;
        }
        
        if (newComment) {
          console.log('[DEBUG] Adding new comment to state:', newComment);
          setComments(prev => Array.isArray(prev) ? [...prev, newComment] : [newComment]);
          enqueueSnackbar('Thêm bình luận thành công', { variant: 'success' });
          
          // Refresh all comments to ensure consistency
          fetchComments();
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      enqueueSnackbar('Không thể thêm bình luận', { variant: 'error' });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleUploadFile = async (files) => {
    setIsUploadingFile(true);
    try {
      const sprintId = task.sprint?._id || initialSprint?._id;
      const taskId = task._id;
      const projectId = project?._id;
      
      if (!projectId || !sprintId || !taskId) {
        console.error('Missing required IDs for uploading files:', {
          projectId,
          sprintId,
          taskId
        });
        enqueueSnackbar('Không thể tải lên tệp', { variant: 'error' });
        return;
      }
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      await api.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      enqueueSnackbar('Tải lên tệp thành công', { variant: 'success' });
      await fetchAttachments();
    } catch (error) {
      console.error('Error uploading files:', error);
      enqueueSnackbar('Không thể tải lên tệp', { variant: 'error' });
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tệp này?')) {
      return;
    }

    try {
      const sprintId = task.sprint?._id || initialSprint?._id;
      const taskId = task._id;
      const projectId = project?._id;
      
      if (!projectId || !sprintId || !taskId) {
        console.error('Missing required IDs for deleting attachment:', {
          projectId,
          sprintId,
          taskId
        });
        enqueueSnackbar('Không thể xóa tệp', { variant: 'error' });
        return;
      }

      await api.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments/${attachment._id}`);
      enqueueSnackbar('Xóa tệp thành công', { variant: 'success' });
      await fetchAttachments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      enqueueSnackbar('Không thể xóa tệp', { variant: 'error' });
    }
  };

  // Kiểm tra xem comment có phải của người dùng hiện tại không
  const isCurrentUserComment = useCallback((comment) => {
    if (!comment || !currentUser) return false;
    
    // Kiểm tra theo ID
    if (comment.user && comment.user._id === currentUser._id) return true;
    if (comment.user && comment.user.id === currentUser._id) return true;
    if (comment.author && comment.author._id === currentUser._id) return true;
    if (comment.author && comment.author.id === currentUser._id) return true;
    
    // Kiểm tra theo email 
    if (comment.user && comment.user.email === currentUser.email) return true;
    if (comment.author && comment.author.email === currentUser.email) return true;
    
    return false;
  }, [currentUser]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: 1600 }}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          minHeight: '80vh',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }
      }}
    >
      <DialogTitle sx={{ backgroundColor: 'background.paper', py: 2, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Chi tiết công việc</Typography>
          <Box>
            {canEdit && (
              <Button
                startIcon={<EditIcon />}
                onClick={handleEdit}
                color="primary"
                variant="contained"
                size="small"
                sx={{ 
                  mr: 1, 
                  borderRadius: '8px',
                  textTransform: 'none',
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)'
                }}
              >
                Chỉnh sửa
              </Button>
            )}
            {canDelete && (
              <Button
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                color="error"
                variant="outlined"
                size="small"
                sx={{ 
                  mr: 1,
                  borderRadius: '8px',
                  textTransform: 'none'
                }}
              >
                Xóa
              </Button>
            )}
            <IconButton 
              onClick={onClose} 
              size="small"
              sx={{ 
                bgcolor: 'grey.100',
                '&:hover': { bgcolor: 'grey.200' }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Task Title and Status */}
          <Box mb={4}>
            <Typography variant="h5" gutterBottom sx={{ 
              fontWeight: 600,
              mb: 2,
              color: 'text.primary' 
            }}>
              {task.title}
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Chip
                label={getTaskStatusLabel(task.status)}
                size="small"
                sx={{
                  backgroundColor: getTaskStatusColor(task.status).bg,
                  color: getTaskStatusColor(task.status).color,
                  fontWeight: 500,
                  borderRadius: '8px',
                  px: 1
                }}
              />
              <Chip
                label={getTaskPriorityLabel(task.priority)}
                size="small"
                sx={{
                  backgroundColor: getTaskPriorityColor(task.priority).bg,
                  color: getTaskPriorityColor(task.priority).color,
                  fontWeight: 500,
                  borderRadius: '8px',
                  px: 1
                }}
              />
            </Stack>
          </Box>

          {/* Task Details */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Box mb={4} sx={{
                p: 2.5,
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                  Mô tả
                </Typography>
                <Typography variant="body1" sx={{ 
                  whiteSpace: 'pre-wrap',
                  color: task.description ? 'text.primary' : 'text.secondary',
                  lineHeight: 1.6
                }}>
                  {task.description || 'Không có mô tả'}
                </Typography>
              </Box>

              {/* Updated Tags */}
              <Box mb={4}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                  Tags
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {task.tags && task.tags.length > 0 ? (
                    task.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag.name || tag}
                        size="small"
                        icon={<LabelIcon fontSize="small" />}
                        sx={{
                          backgroundColor: tag.color || 'rgba(25, 118, 210, 0.08)',
                          color: tag.textColor || 'primary.main',
                          borderRadius: '16px',
                          fontWeight: 500,
                          py: 0.5,
                          '& .MuiChip-icon': {
                            color: 'inherit'
                          }
                        }}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có tags
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Project Info */}
              <Box mb={4}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                  Dự án
                </Typography>
                <Typography variant="body1" sx={{
                  fontWeight: 500,
                  color: 'primary.main',
                  mt: 0.5
                }}>
                  {project?.name || task.project?.name || 'Không có dự án'}
                </Typography>
              </Box>

              {/* Sprint Info */}
              <Box mb={3}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                  Sprint
                </Typography>
                {task?.sprint ? (
                  <Stack spacing={1} sx={{ mt: 0.5 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: 'primary.main' }}>
                        {task.sprint.name || 'Không có tên sprint'}
                      </Typography>
                    </Box>
                    {task.sprint.startDate && task.sprint.endDate && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarTodayIcon fontSize="small" color="action" />
                        {format(new Date(task.sprint.startDate), 'dd/MM/yyyy')} - {format(new Date(task.sprint.endDate), 'dd/MM/yyyy')}
                      </Typography>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Chưa có sprint
                  </Typography>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Stack spacing={4}>
                {/* Assignees */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                    Người thực hiện {task.assignees?.length > 0 && `(${task.assignees.length})`}
                  </Typography>
                  {task.assignees && task.assignees.length > 0 ? (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                      {task.assignees.map((assignee) => (
                        <Box 
                          key={assignee._id} 
                          display="flex" 
                          alignItems="center" 
                          gap={1.5}
                          sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.03)'
                            }
                          }}
                        >
                          <Avatar
                            alt={assignee.name || assignee.email || 'User'}
                            src={assignee.avatar}
                            sx={{
                              width: 40,
                              height: 40,
                              fontSize: '1rem',
                              bgcolor: !assignee.avatar ? 'primary.main' : undefined,
                              border: '2px solid white',
                              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08)'
                            }}
                          >
                            {assignee.name ? assignee.name.charAt(0).toUpperCase() : 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={500} color="text.primary">
                              {assignee.name || 'Người dùng'}
                            </Typography>
                            {assignee.email && (
                              <Typography variant="body2" color="text.secondary">
                                {assignee.email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Chưa có người thực hiện
                    </Typography>
                  )}
                </Box>

                {/* Dates */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                    Thời gian
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <CalendarTodayIcon fontSize="small" sx={{ color: 'primary.light' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          Bắt đầu
                        </Typography>
                        <Typography variant="body2" fontWeight={500} color="text.primary">
                          <DateTimeDisplay date={task.startDate} />
                        </Typography>
                      </Box>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <CalendarTodayIcon fontSize="small" sx={{ color: 'error.light' }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          Kết thúc
                        </Typography>
                        <Typography variant="body2" fontWeight={500} color="text.primary">
                          <DateTimeDisplay date={task.dueDate} />
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Box>

                {/* Estimated Hours */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                    Thời gian dự kiến
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1.5} sx={{ mt: 1 }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: 'info.light' }} />
                    <Typography variant="body1" fontWeight={500} color="text.primary">
                      {task.estimatedHours || 0} giờ
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Tabs for Comments, Attachments, History */}
          <Box>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                mb: 3,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: '48px',
                  fontSize: '0.95rem',
                  '&.Mui-selected': {
                    color: 'primary.main',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0'
                }
              }}
            >
              <Tab icon={<CommentIcon sx={{ mr: 1 }} />} label="Bình luận" iconPosition="start" />
              <Tab icon={<AttachFileIcon sx={{ mr: 1 }} />} label="Tệp đính kèm" iconPosition="start" />
              <Tab icon={<HistoryIcon sx={{ mr: 1 }} />} label="Lịch sử" iconPosition="start" />
            </Tabs>
            
            <Box sx={{ mt: 3 }}>
              {activeTab === 0 && (
                <Box>
                  <Stack spacing={2.5}>
                    {Array.isArray(comments) && comments.length > 0 ? (
                      comments.map(comment => (
                        <CommentForm
                          key={comment._id}
                          comment={comment}
                          taskId={task._id}
                          projectId={project?._id}
                          isCurrentUser={isCurrentUserComment(comment)}
                          onSubmit={() => {
                            // Refresh comments
                            fetchComments();
                          }}
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary" align="center">
                        Chưa có bình luận nào
                      </Typography>
                    )}
                    <CommentForm
                      taskId={task._id}
                      projectId={project?._id}
                      isCurrentUser={true}
                      onSubmit={() => {
                        // Refresh comments
                        fetchComments();
                      }}
                    />
                  </Stack>
                </Box>
              )}
              {activeTab === 1 && (
                <Box>
                  <Stack spacing={3}>
                    <FileUploader
                      onUpload={handleUploadFile}
                      isLoading={isUploadingFile}
                      accept="*/*"
                      multiple
                    />
                    <AttachmentsList
                      attachments={attachments}
                      onDelete={handleDeleteAttachment}
                      canEdit={canEdit}
                    />
                  </Stack>
                </Box>
              )}
              {activeTab === 2 && (
                <TaskAuditLog
                  taskId={task._id}
                  projectId={project?._id}
                  sprintId={sprintDetails?._id}
                />
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailView; 
