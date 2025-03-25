import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
} from "@mui/material";
import { CloudUpload, Close } from "@mui/icons-material";

const FileUpload = ({
  onFileSelect,
  onError,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = "*",
  multiple = false,
}) => {
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = [...e.dataTransfer.files];
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e) => {
    const selectedFiles = [...e.target.files];
    handleFiles(selectedFiles);
  };

  const handleFiles = (selectedFiles) => {
    // Validate file size and type
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > maxSize) {
        onError?.(
          `File ${file.name} is too large. Maximum size is ${
            maxSize / 1024 / 1024
          }MB`
        );
        return false;
      }
      if (acceptedTypes !== "*" && !file.type.match(acceptedTypes)) {
        onError?.(`File ${file.name} is not an accepted type`);
        return false;
      }
      return true;
    });

    if (!multiple) {
      setFiles(validFiles.slice(0, 1));
      if (validFiles.length > 0) {
        onFileSelect?.(validFiles[0]);
      }
    } else {
      setFiles((prev) => {
        const newFiles = [...prev, ...validFiles];
        onFileSelect?.(newFiles);
        return newFiles;
      });
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      onFileSelect?.(multiple ? newFiles : null);
      return newFiles;
    });
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Drag & Drop Zone */}
      <Box
        sx={{
          border: "2px dashed #ccc",
          borderRadius: 2,
          p: 3,
          textAlign: "center",
          bgcolor: "#fafafa",
          cursor: "pointer",
          "&:hover": {
            bgcolor: "#f0f0f0",
          },
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileInput}
          accept={acceptedTypes}
          multiple={multiple}
        />
        <CloudUpload sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Kéo thả file vào đây
        </Typography>
        <Typography variant="body2" color="textSecondary">
          hoặc click để chọn file
        </Typography>
      </Box>

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            File đã chọn:
          </Typography>
          {files.map((file, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
                p: 1,
                border: "1px solid #eee",
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {file.name} ({(file.size / 1024).toFixed(1)}KB)
              </Typography>
              <IconButton size="small" onClick={() => removeFile(index)}>
                <Close />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FileUpload;
