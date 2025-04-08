import React, { useRef } from 'react';
import { Box, Button, Typography, LinearProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FileUploader = ({ onUpload, isLoading, accept = '*/*', multiple = true }) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onUpload(files);
      // Reset input value so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  return (
    <Box>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
      />
      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 1,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
        onClick={handleClick}
      >
        <CloudUploadIcon sx={{ fontSize: 40, color: 'action.active', mb: 1 }} />
        <Typography variant="body1" gutterBottom>
          Kéo thả file vào đây hoặc click để chọn file
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {multiple ? 'Hỗ trợ nhiều file' : 'Chỉ hỗ trợ một file'}
        </Typography>
        {isLoading && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default FileUploader; 