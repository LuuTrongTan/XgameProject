import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
  Grid,
  IconButton,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
  Label as LabelIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import UserAvatar from '../common/UserAvatar';
import DateTimeDisplay from '../common/DateTimeDisplay';
import { 
  getTaskStatusColor, 
  getTaskStatusLabel, 
  getTaskPriorityLabel, 
  getTaskPriorityColor 
} from '../../config/constants';
import { getSprintById } from '../../api/sprintApi';
import api from '../../api/api';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';
import TaskInteractions from './TaskInteractions';

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
  const [sprintDetails, setSprintDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
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

  useEffect(() => {
    fetchSprintDetails();
  }, [fetchSprintDetails]);

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

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        p: 2.5, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            textTransform: 'none'
          }}>
            Chi tiết công việc
          </Typography>
          <Stack direction="row" spacing={1}>
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
        <Box display="flex" alignItems="center">
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
          </Box>

          {/* Task Details */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                {/* Description */}
                <Box sx={{
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
                    {task.description || "Không có mô tả"}
                  </Typography>
                </Box>

                {/* Tags */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
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

                {/* Time Tracking */}
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
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
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
                    </Grid>
                    <Grid item xs={12} sm={6}>
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
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <AccessTimeIcon fontSize="small" sx={{ color: 'info.light' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" mb={0.5}>
                            Thời gian dự kiến
                          </Typography>
                          <Typography variant="body2" fontWeight={500} color="text.primary">
                            {task.estimatedHours || 0} giờ
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <AccessTimeIcon fontSize="small" sx={{ color: 'success.light' }} />
                        <Box>
                          <Typography variant="body2" color="text.secondary" mb={0.5}>
                            Thời gian đã làm
                          </Typography>
                          <Typography variant="body2" fontWeight={500} color="text.primary" sx={{ 
                            display: 'flex', 
                            alignItems: 'center' 
                          }}>
                            {task.actualHours || 0} giờ
                            {task.estimatedHours > 0 && (
                              <Chip 
                                size="small" 
                                label={`${Math.round((task.actualHours || 0) / task.estimatedHours * 100)}%`}
                                sx={{ 
                                  ml: 1, 
                                  height: 20, 
                                  fontSize: '0.7rem',
                                  bgcolor: task.actualHours > task.estimatedHours ? 'error.light' : 'success.light',
                                  color: 'white',
                                  fontWeight: 'bold'
                                }} 
                              />
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    {task.completedAt && (
                      <Grid item xs={12}>
                        <Box display="flex" alignItems="center" gap={1.5} mt={1}>
                          <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                          <Box>
                            <Typography variant="body2" color="text.secondary" mb={0.5}>
                              Hoàn thành vào
                            </Typography>
                            <Typography variant="body2" fontWeight={500} color="text.primary">
                              <DateTimeDisplay date={task.completedAt} />
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* Project & Sprint Info */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                    Dự án & Sprint
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={0.5}>
                        Dự án
                      </Typography>
                      <Typography variant="body2" fontWeight={500} color="text.primary">
                        {project?.name || "Không có dự án"}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={0.5}>
                        Sprint
                      </Typography>
                      <Typography variant="body2" fontWeight={500} color="text.primary">
                        {task.sprint?.name || "Chưa có sprint"}
                      </Typography>
                      {task.sprint && task.sprint.startDate && task.sprint.endDate && (
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(task.sprint.startDate), "dd/MM/yyyy", { locale: vi })} - {format(new Date(task.sprint.endDate), "dd/MM/yyyy", { locale: vi })}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                {/* Assignees */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                    Người thực hiện
                  </Typography>
                  {task.assignees && task.assignees.length > 0 ? (
                    <Stack spacing={2}>
                      {task.assignees.map((assignee) => (
                        <Box
                          key={assignee._id}
                          display="flex"
                          alignItems="center"
                          gap={2}
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

                {/* Task Status */}
                <Box sx={{
                  p: 2.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="subtitle1" fontWeight="600" gutterBottom color="text.primary">
                    Trạng thái
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Trạng thái công việc
                      </Typography>
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
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Độ ưu tiên
                      </Typography>
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
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4 }} />

          {/* Task Interactions */}
          <Box sx={{ 
            border: '1px solid', 
            borderColor: 'divider', 
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                bgcolor: 'background.paper'
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} color="text.primary">
                Tương tác
              </Typography>
              <Chip
                label={expanded ? "Thu gọn" : "Mở rộng"}
                onClick={handleToggleExpand}
                size="small"
                color={expanded ? "primary" : "default"}
                sx={{ cursor: 'pointer' }}
              />
            </Box>
            
            {expanded && (
              <Box 
                sx={{ 
                  p: 2, 
                  borderTop: '1px solid', 
                  borderColor: 'divider'
                }}
                key={`interactions-container-${task._id}`}
              >
                <TaskInteractions 
                  key={`task-interactions-${Date.now()}-${task._id}`}
                  task={task} 
                  project={project} 
                  sprint={sprintDetails || task.sprint} 
                  onUpdate={() => {
                    // Refresh task data if needed
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailView; 
