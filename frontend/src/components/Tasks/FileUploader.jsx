import React, { useRef, useState } from 'react';
import { Box, Button, Typography, LinearProgress, Alert, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const FileUploader = ({ onUpload, isLoading, error, accept = '*/*', multiple = false }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Log chi tiết file đã chọn để debug
      const fileDetails = Array.from(files).map(f => ({
        name: f.name,
        type: f.type,
        size: `${(f.size / 1024).toFixed(2)} KB`
      }));
      console.log(`Selected ${files.length} files:`, fileDetails);
      
      // Pass entire event so the handler has access to original files
      onUpload(event);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = e.dataTransfer.files;
      
      // Log chi tiết file đã kéo thả để debug
      const fileDetails = Array.from(droppedFiles).map(f => ({
        name: f.name,
        type: f.type,
        size: `${(f.size / 1024).toFixed(2)} KB`
      }));
      console.log(`Dropped ${droppedFiles.length} files:`, fileDetails);
      
      // Create a synthetic event for dropped files
      const syntheticEvent = {
        target: {
          files: droppedFiles,
          value: '',
          reset: function() { this.value = ''; }
        }
      };
      
      onUpload(syntheticEvent);
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
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: dragActive ? 'action.hover' : 'background.paper',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
          position: 'relative'
        }}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <Box sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.7)',
            zIndex: 1,
            borderRadius: 2
          }}>
            <CircularProgress size={40} />
          </Box>
        ) : null}
        
        <CloudUploadIcon 
          sx={{ 
            fontSize: 48, 
            color: dragActive ? 'primary.main' : 'action.active', 
            mb: 1,
            transition: 'all 0.2s ease'
          }} 
        />
        <Typography variant="h6" gutterBottom>
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
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default FileUploader; 