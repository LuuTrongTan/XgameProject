import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import { createProject } from "../../api/projectApi";
import FileUpload from "../../components/common/FileUpload";
import ProjectMemberSelector from "../../components/projects/ProjectMemberSelector";
import { ROLES, getRoleName, PROJECT_STATUS } from "../../config/constants";

const CreateProjectDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: null,
    status: PROJECT_STATUS.ACTIVE,
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errors, setErrors] = useState({
    name: "",
    description: "",
  });

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Validate name (3-100 ký tự)
    if (!formData.name) {
      newErrors.name = "Tên dự án là bắt buộc";
      isValid = false;
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Tên dự án phải có ít nhất 3 ký tự";
      isValid = false;
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Tên dự án không được quá 100 ký tự";
      isValid = false;
    }
    
    // Validate description (5-2000 ký tự)
    if (!formData.description) {
      newErrors.description = "Mô tả dự án là bắt buộc";
      isValid = false;
    } else if (formData.description.trim().length < 5) {
      newErrors.description = "Mô tả dự án phải có ít nhất 5 ký tự";
      isValid = false;
    } else if (formData.description.trim().length > 2000) {
      newErrors.description = "Mô tả dự án không được quá 2000 ký tự";
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleFileSelect = (file) => {
    if (!file) {
      console.error("No file selected");
      setError("Không có file nào được chọn");
      return;
    }

    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type:", file.type);
      setError("File không phải là ảnh");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      compressImage(base64String);
    };
    reader.readAsDataURL(file);
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
        avatar: compressedBase64,
      }));
    } catch (error) {
      console.error("Error compressing image:", error);
      setError("Lỗi khi xử lý ảnh");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form trước khi submit
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        status: formData.status,
        avatarBase64: formData.avatar,
        members: members.map((member) => ({
          email: member.email,
          role: member.role,
        })),
      };

      const response = await createProject(projectData);
      setSuccessMessage("Tạo dự án thành công");
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      setError(error.message || "Có lỗi xảy ra khi tạo dự án");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tạo dự án mới</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {successMessage && (
              <Alert severity="success">{successMessage}</Alert>
            )}

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

            <FileUpload
              onFileSelect={handleFileSelect}
              accept="image/*"
              label="Tải lên ảnh đại diện"
            />

            <Divider sx={{ my: 2 }} />

            <ProjectMemberSelector
              members={members}
              onMembersChange={setMembers}
              title="Thêm thành viên vào dự án mới"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Hủy</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? "Đang tạo..." : "Tạo dự án"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateProjectDialog;
