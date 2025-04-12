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
  const [isProcessing, setIsProcessing] = useState(false);

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

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          // Giảm kích thước ảnh mạnh hơn
          const MAX_WIDTH = 300;  // Reduced from 400
          const MAX_HEIGHT = 300; // Reduced from 400
          
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round(height * (MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round(width * (MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Giảm chất lượng xuống 30%
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.3); // Reduced from 0.5
          
          console.log(`Original size: ${file.size}, Compressed size: ~${Math.round(compressedBase64.length * 0.75 / 1024)}KB`);
          resolve(compressedBase64);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFiles = async (selectedFiles) => {
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
        try {
          setIsProcessing(true);
          const file = validFiles[0];
          
          // Check if it's an image
          if (file.type.startsWith('image/')) {
            // Compress and resize the image
            const compressedBase64 = await compressImage(file);
            onFileSelect?.(compressedBase64);
          } else {
            // For non-image files, just convert to base64
            const base64String = await convertToBase64(file);
            onFileSelect?.(base64String);
          }
        } catch (error) {
          console.error("Error processing file:", error);
          onError?.("Không thể xử lý file");
        } finally {
          setIsProcessing(false);
        }
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
          position: "relative",
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
        
        {isProcessing ? (
          <CircularProgress size={48} sx={{ color: "primary.main", mb: 2 }} />
        ) : (
          <CloudUpload sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
        )}
        
        <Typography variant="h6" gutterBottom>
          {isProcessing ? "Đang xử lý..." : "Kéo thả file vào đây"}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {isProcessing ? "Vui lòng đợi..." : "hoặc click để chọn file"}
        </Typography>
      </Box>

      {/* File List */}
      {files.length > 0 && !isProcessing && (
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
