import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import FileUpload from "../common/FileUpload";
import { PROJECT_STATUS } from "../../config/constants";
import CustomAvatar from "../common/Avatar";

const ProjectForm = ({ project, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: PROJECT_STATUS.ACTIVE,
    avatarBase64: null,
  });
  const [errors, setErrors] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || PROJECT_STATUS.ACTIVE,
        avatarBase64: project.avatarBase64 || null,
      });
    }
  }, [project]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = "Tên dự án không được để trống";
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Tên dự án phải có ít nhất 3 ký tự";
      isValid = false;
    }

    if (!formData.description.trim()) {
      newErrors.description = "Mô tả dự án không được để trống";
      isValid = false;
    } else if (formData.description.trim().length < 5) {
      newErrors.description = "Mô tả dự án phải có ít nhất 5 ký tự";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64String = event.target.result;
        await compressImage(base64String);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  const compressImage = async (base64String) => {
    try {
      const img = new Image();
      img.src = base64String;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
      setFormData((prev) => ({
        ...prev,
        avatarBase64: compressedBase64,
      }));
    } catch (error) {
      console.error("Error compressing image:", error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Prepare project data and call onSubmit
    const projectData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      status: formData.status,
      avatarBase64: formData.avatarBase64,
    };

    onSubmit(projectData);
  };

  return (
    <>
      <DialogTitle>Chỉnh sửa dự án</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Tên dự án"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              fullWidth
              error={Boolean(errors.name)}
              helperText={errors.name}
            />

            <TextField
              label="Mô tả"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              fullWidth
              multiline
              rows={4}
              error={Boolean(errors.description)}
              helperText={errors.description}
            />

            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                label="Trạng thái"
              >
                {Object.entries(PROJECT_STATUS).map(([key, value]) => (
                  <MenuItem key={key} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Ảnh đại diện dự án
            </Typography>
            
            {formData.avatarBase64 && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mb: 2 
                }}
              >
                <CustomAvatar
                  project={{ avatarBase64: formData.avatarBase64 }}
                  sx={{
                    width: 200,
                    height: 200,
                    borderRadius: 2,
                  }}
                  variant="rounded"
                />
              </Box>
            )}
            
            <FileUpload
              onFileSelect={handleFileSelect}
              accept="image/*"
              label="Tải lên ảnh đại diện mới"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel}>Hủy</Button>
          <Button type="submit" variant="contained" color="primary">
            Lưu thay đổi
          </Button>
        </DialogActions>
      </form>
    </>
  );
};

export default ProjectForm; 