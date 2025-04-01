import React, { useState, useRef } from 'react';
import { Box, TextField, Button, CircularProgress, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useTheme } from '@mui/material/styles';
import { useSnackbar } from 'notistack';

const TaskCommentForm = ({ onSubmit, placeholder = "Thêm bình luận...", loading = false, buttonText = "Gửi" }) => {
  const [comment, setComment] = useState('');
  const commentRef = useRef(null);
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!comment.trim() || loading || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(comment.trim());
      setComment('');
      // Focus lại vào input sau khi gửi
      if (commentRef.current) {
        commentRef.current.focus();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      enqueueSnackbar(error.message || 'Không thể gửi bình luận', { 
        variant: 'error',
        autoHideDuration: 3000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    // Gửi comment khi nhấn Ctrl+Enter hoặc Command+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
        <TextField
          multiline
          minRows={1}
          maxRows={6}
          fullWidth
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          inputRef={commentRef}
          disabled={loading || isSubmitting}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            }
          }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!comment.trim() || loading || isSubmitting}
          sx={{ 
            minWidth: 'auto', 
            height: 40, 
            borderRadius: 2,
            whiteSpace: 'nowrap'
          }}
          startIcon={isSubmitting || loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        >
          {buttonText}
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
        Nhấn Ctrl+Enter để gửi nhanh
      </Typography>
    </Box>
  );
};

export default TaskCommentForm; 