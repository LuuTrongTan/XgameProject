import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  Stack,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReplyIcon from '@mui/icons-material/Reply';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import api from '../../api/api';
import { isCurrentUserReaction } from '../../utils/helpers';

const CommentItem = ({ comment, onReply, projectId, sprintId, taskId, currentUserId }) => {
  const [reactions, setReactions] = useState(comment.reactions || []);
  const [loadingReactions, setLoadingReactions] = useState({
    like: false,
    heart: false
  });

  // Debug props
  console.log('CommentItem props:', { 
    projectId, 
    sprintId, 
    taskId, 
    currentUserId,
    commentId: comment._id,
    existingReactions: comment.reactions || []
  });

  // Update reactions when comment changes
  useEffect(() => {
    if (comment.reactions) {
      console.log('Updating reactions from comment:', comment.reactions);
      setReactions(comment.reactions);
    }
  }, [comment.reactions]);

  const handleReaction = async (type) => {
    if (loadingReactions[type]) return;
    if (!currentUserId) {
      console.error('Cannot react: No current user ID available');
      return;
    }
    
    setLoadingReactions(prev => ({ ...prev, [type]: true }));
    
    try {
      const endpoint = `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments/${comment._id}/reactions`;
      
      console.log('Sending reaction request:', {
        projectId,
        sprintId,
        taskId,
        commentId: comment._id,
        type,
        currentUserId,
        endpoint
      });
      
      const response = await api.post(
        endpoint,
        { type }
      );

      console.log('Reaction response:', {
        status: response.status,
        headers: response.headers,
        data: response.data,
        config: {
          url: response.config?.url,
          method: response.config?.method,
          headers: response.config?.headers
        }
      });

      // Check if we got a valid response with data
      if (response.data) {
        // Some APIs return nested data object, handle both cases
        const updatedComment = response.data.data || response.data;
        
        if (updatedComment && updatedComment.reactions) {
          console.log('Updated reactions:', updatedComment.reactions);
          setReactions(updatedComment.reactions);
        } else {
          console.warn('Response contained no valid reactions data', response.data);
        }
      }
    } catch (error) {
      console.error("Error toggling reaction:", error.response?.data || error.message || error);
      if (error.response) {
        console.error("Error details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
    } finally {
      setLoadingReactions(prev => ({ ...prev, [type]: false }));
    }
  };

  const getReactionCount = (type) => {
    return reactions.filter(r => r.type === type).length;
  };

  const hasUserReacted = (type) => {
    if (!currentUserId) {
      console.log('Cannot check reactions: No current user ID');
      return false;
    }
    
    const hasReacted = reactions.some(reaction => 
      reaction.type === type && isCurrentUserReaction(reaction.user, currentUserId)
    );
    
    console.log(`User ${currentUserId} has ${hasReacted ? '' : 'not '}reacted with ${type}`);
    return hasReacted;
  };

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2.5,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        mb: 2,
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          transform: 'translateY(-2px)',
          borderColor: 'primary.light'
        }
      }}
    >
      <Box display="flex" flexDirection="column">
        {/* Parent Comment Info (if this is a reply) */}
        {comment.parentComment && (
          <Box 
            sx={{ 
              mb: 2,
              p: 1.5,
              borderRadius: '8px',
              backgroundColor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <ReplyIcon fontSize="inherit" />
              Trả lời bình luận của {comment.parentComment.user?.name || 'Người dùng'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {comment.parentComment.content}
            </Typography>
          </Box>
        )}

        {/* User Info */}
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Avatar
            alt={comment.user?.name || comment.user?.email || 'User'}
            src={comment.user?.avatar}
            sx={{
              width: 28,
              height: 28,
              fontSize: '0.875rem',
              bgcolor: !comment.user?.avatar ? 'primary.main' : undefined
            }}
          >
            {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500} color="text.primary">
              {comment.user?.name || 'Người dùng'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(comment.createdAt), "HH:mm dd/MM/yyyy", { locale: vi })}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Comment Content with Actions */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Typography variant="body1" sx={{ 
            flex: 1,
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            color: 'text.primary'
          }}>
            {comment.content}
          </Typography>
          
          <Stack direction="row" spacing={0.5}>
            {/* Like Button */}
            <Tooltip title="Thích">
              <IconButton 
                size="small" 
                onClick={() => handleReaction('like')}
                disabled={loadingReactions.like}
                sx={{ 
                  color: hasUserReacted('like') ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'primary.lighter'
                  }
                }}
              >
                <ThumbUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Heart Button */}
            <Tooltip title="Yêu thích">
              <IconButton 
                size="small" 
                onClick={() => handleReaction('heart')}
                disabled={loadingReactions.heart}
                sx={{ 
                  color: hasUserReacted('heart') ? 'error.main' : 'text.secondary',
                  '&:hover': {
                    color: 'error.main',
                    backgroundColor: 'error.lighter'
                  }
                }}
              >
                <FavoriteIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Reply Button */}
            <Tooltip title="Trả lời">
              <IconButton 
                size="small" 
                onClick={() => onReply && onReply(comment)}
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'primary.lighter'
                  }
                }}
              >
                <ReplyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Reaction Counts */}
        {(getReactionCount('like') > 0 || getReactionCount('heart') > 0) && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            {getReactionCount('like') > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ThumbUpIcon sx={{ fontSize: 14 }} />
                {getReactionCount('like')}
              </Typography>
            )}
            {getReactionCount('heart') > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FavoriteIcon sx={{ fontSize: 14 }} />
                {getReactionCount('heart')}
              </Typography>
            )}
          </Box>
        )}

        {/* Edited Indicator */}
        {comment.edited && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            (đã chỉnh sửa)
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default CommentItem; 