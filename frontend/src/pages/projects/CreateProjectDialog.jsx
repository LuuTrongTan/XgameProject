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
  Autocomplete,
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

const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  MEMBER: "member",
};

const getRoleName = (roleValue) => {
  switch (roleValue) {
    case ROLES.ADMIN:
      return "Admin";
    case ROLES.PROJECT_MANAGER:
      return "Project Manager";
    case ROLES.MEMBER:
      return "Member";
    default:
      return roleValue;
  }
};

const PROJECT_STATUS = {
  ACTIVE: "Đang hoạt động",
  COMPLETED: "Hoàn thành",
  CLOSED: "Đóng",
};

const CreateProjectDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    avatar: null,
    status: PROJECT_STATUS.ACTIVE,
  });
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState({
    email: "",
    role: ROLES.MEMBER,
    inviteMethod: "direct",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileSelect = (file) => {
    if (!file) {
      console.error("No file selected");
      setError("Không có file nào được chọn");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.error("Invalid file type:", file.type);
      setError("File không phải là ảnh");
      return;
    }

    // Convert File to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target.result;
      if (
        typeof base64String === "string" &&
        base64String.startsWith("data:image/")
      ) {
        setFormData((prev) => ({
          ...prev,
          avatar: base64String,
        }));
        setError(null);
      } else {
        console.error("Invalid base64 string:", base64String?.substring(0, 50));
        setError("Lỗi khi đọc file ảnh");
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      setError("Không thể đọc file. Vui lòng thử lại.");
    };
    reader.readAsDataURL(file);
  };

  const handleInviteMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setNewMember((prev) => ({
        ...prev,
        inviteMethod: newMethod,
      }));
    }
  };

  const handleAddMember = () => {
    if (!newMember.email || !validateEmail(newMember.email)) {
      setError("Email không hợp lệ");
      return;
    }

    if (members.find((m) => m.email === newMember.email)) {
      setError("Email này đã được thêm vào dự án");
      return;
    }

    setMembers([
      ...members,
      {
        ...newMember,
        status: newMember.inviteMethod === "direct" ? "active" : "pending",
      },
    ]);

    setNewMember({
      email: "",
      role: ROLES.MEMBER,
      inviteMethod: newMember.inviteMethod,
    });

    setError(null);
    setSuccessMessage(
      newMember.inviteMethod === "direct"
        ? "Đã thêm thành viên vào dự án"
        : "Đã thêm email để gửi lời mời"
    );

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRemoveMember = (email) => {
    setMembers(members.filter((m) => m.email !== email));
  };

  const compressImage = async (base64String) => {
    return new Promise((resolve, reject) => {
      try {
        // Check if input is valid
        if (!base64String || typeof base64String !== "string") {
          console.error("Invalid input:", base64String);
          reject(new Error("Invalid image data"));
          return;
        }

        // Validate base64 string format
        if (!base64String.startsWith("data:image/")) {
          console.error("Invalid image format:", base64String.substring(0, 50));
          reject(new Error("Invalid image format"));
          return;
        }

        const img = new Image();
        img.onerror = () => {
          console.error("Failed to load image");
          reject(new Error("Failed to load image"));
        };

        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Calculate new dimensions
            let width = img.width;
            let height = img.height;
            const maxSize = 800;

            if (width > height && width > maxSize) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else if (height > maxSize) {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

            // Validate output
            if (
              !compressedBase64 ||
              !compressedBase64.startsWith("data:image/")
            ) {
              reject(new Error("Failed to compress image"));
              return;
            }

            resolve(compressedBase64);
          } catch (err) {
            console.error("Error during compression:", err);
            reject(new Error("Failed to compress image: " + err.message));
          }
        };

        img.src = base64String;
      } catch (err) {
        console.error("Error in compressImage:", err);
        reject(new Error("Failed to process image: " + err.message));
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error("Tên dự án không được để trống");
      }

      if (!formData.description.trim()) {
        throw new Error("Mô tả dự án không được để trống");
      }

      // Create project data object
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      };

      // Add members if any
      if (members.length > 0) {
        projectData.members = members;
      }

      // Add avatar if exists
      if (formData.avatar) {
        try {
          console.log("Avatar data type:", typeof formData.avatar);
          console.log("Avatar data preview:", formData.avatar.substring(0, 50));

          const compressedAvatar = await compressImage(formData.avatar);
          projectData.avatarBase64 = compressedAvatar;
        } catch (err) {
          console.error("Error compressing image:", err);
          throw new Error("Lỗi xử lý ảnh đại diện: " + err.message);
        }
      }

      const response = await createProject(projectData);

      if (response.success) {
        onSuccess(response.data);
        onClose();
      } else {
        throw new Error(response.message || "Có lỗi xảy ra khi tạo dự án");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError(error.message || "Có lỗi xảy ra khi tạo dự án");
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          Tạo dự án mới
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            name="name"
            label="Tên dự án"
            required
            fullWidth
            value={formData.name}
            onChange={handleInputChange}
            margin="normal"
            error={Boolean(
              formData.name.trim() &&
                (formData.name.trim().length < 3 ||
                  formData.name.trim().length > 100)
            )}
            helperText={
              formData.name.trim() &&
              (formData.name.trim().length < 3 ||
                formData.name.trim().length > 100)
                ? "Tên dự án phải từ 3-100 ký tự"
                : ""
            }
          />

          <TextField
            name="description"
            label="Mô tả"
            multiline
            rows={4}
            fullWidth
            value={formData.description}
            onChange={handleInputChange}
            margin="normal"
            error={Boolean(
              formData.description.trim() &&
                (formData.description.trim().length < 10 ||
                  formData.description.trim().length > 2000)
            )}
            helperText={
              formData.description.trim() &&
              (formData.description.trim().length < 10 ||
                formData.description.trim().length > 2000)
                ? "Mô tả dự án phải từ 10-2000 ký tự"
                : ""
            }
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Trạng thái</InputLabel>
            <Select
              name="status"
              value={formData.status}
              label="Trạng thái"
              onChange={handleInputChange}
            >
              {Object.values(PROJECT_STATUS).map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Hình ảnh dự án
            </Typography>
            <FileUpload
              onFileSelect={handleFileSelect}
              onError={setError}
              acceptedTypes="image/*"
              multiple={false}
              maxSize={5 * 1024 * 1024}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Members Section */}
          <Typography variant="subtitle1" gutterBottom>
            Thêm thành viên
          </Typography>

          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              value={newMember.inviteMethod}
              exclusive
              onChange={handleInviteMethodChange}
              sx={{ mb: 2, width: "100%" }}
            >
              <ToggleButton value="direct" sx={{ width: "50%" }}>
                <PersonAddIcon sx={{ mr: 1 }} />
                Thêm trực tiếp
              </ToggleButton>
              <ToggleButton value="email" sx={{ width: "50%" }}>
                <EmailIcon sx={{ mr: 1 }} />
                Gửi lời mời
              </ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Email"
                fullWidth
                value={newMember.email}
                onChange={(e) =>
                  setNewMember({ ...newMember, email: e.target.value })
                }
                error={Boolean(
                  newMember.email && !validateEmail(newMember.email)
                )}
                helperText={
                  newMember.email && !validateEmail(newMember.email)
                    ? "Email không hợp lệ"
                    : ""
                }
              />
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Vai trò</InputLabel>
                <Select
                  value={newMember.role}
                  label="Vai trò"
                  onChange={(e) =>
                    setNewMember({ ...newMember, role: e.target.value })
                  }
                >
                  {Object.values(ROLES).map((role) => (
                    <MenuItem key={role} value={role}>
                      {getRoleName(role)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleAddMember}
                disabled={!newMember.email || !validateEmail(newMember.email)}
              >
                <AddIcon />
              </Button>
            </Stack>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            <Stack spacing={1}>
              {members.map((member) => (
                <Chip
                  key={member.email}
                  label={`${member.email} (${getRoleName(member.role)}) - ${
                    member.status === "pending" ? "Đang chờ" : "Đã thêm"
                  }`}
                  onDelete={() => handleRemoveMember(member.email)}
                  color={member.status === "pending" ? "warning" : "primary"}
                  sx={{ maxWidth: "100%" }}
                />
              ))}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name.trim()}
        >
          {loading ? "Đang tạo..." : "Tạo dự án"}
        </Button>
      </DialogActions>
      {error && (
        <Box sx={{ p: 2, color: "error.main" }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}
    </Dialog>
  );
};

export default CreateProjectDialog;
