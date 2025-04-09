import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Divider
} from '@mui/material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const CommentItem = ({ comment }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          transform: 'translateY(-1px)'
        }
      }}
    >
      <Box display="flex" flexDirection="column">
        {/* Comment Content */}
        <Typography variant="body1" sx={{ 
          mb: 2,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          color: 'text.primary'
        }}>
          {comment.content}
        </Typography>

        {/* Edited Indicator */}
        {comment.edited && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ mb: 1 }}
          >
            (đã chỉnh sửa)
          </Typography>
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* User Info */}
        <Box display="flex" alignItems="center" gap={1.5}>
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
      </Box>
    </Paper>
  );
};

export default CommentItem; 