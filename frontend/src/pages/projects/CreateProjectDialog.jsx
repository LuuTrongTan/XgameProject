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
import UserSelectionDialog from "../../components/common/UserSelectionDialog";

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
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [newMember, setNewMember] = useState({
    email: "",
    role: ROLES.MEMBER,
    inviteMethod: "direct",
  });
  const [selectedUser, setSelectedUser] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInviteMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setNewMember((prev) => ({
        ...prev,
        inviteMethod: newMethod,
        email: "",
        role: ROLES.MEMBER,
      }));
      setSelectedUser(null);
    }
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

      // Set max dimensions
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

  const handleUserSelect = (selectedUsers) => {
    // Add all selected users directly to members list
    const newMembers = selectedUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: "active",
    }));

    // Filter out any duplicates
    const uniqueMembers = [...members];
    newMembers.forEach((newMember) => {
      if (!uniqueMembers.some((member) => member.id === newMember.id)) {
        uniqueMembers.push(newMember);
      }
    });

    setMembers(uniqueMembers);
    setOpenUserDialog(false);
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
        status: "pending",
      },
    ]);

    setNewMember({
      email: "",
      role: ROLES.MEMBER,
      inviteMethod: newMember.inviteMethod,
    });

    setError(null);
    setSuccessMessage("Đã thêm email để gửi lời mời");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRemoveMember = (userId) => {
    setMembers(members.filter((member) => member.id !== userId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const projectData = {
        ...formData,
        members: members.map((member) => ({
          user: member.id,
          role: member.role,
        })),
      };

      const response = await createProject(projectData);
      if (response.success) {
        setSuccessMessage("Dự án được tạo thành công!");
        onSuccess(response.data);
        onClose();
      } else {
        setError(response.message || "Có lỗi xảy ra khi tạo dự án");
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError(error.message || "Có lỗi xảy ra khi tạo dự án");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Tạo dự án mới</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {successMessage && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {successMessage}
                </Alert>
              )}

              <TextField
                label="Tên dự án"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />

              <TextField
                label="Mô tả"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                fullWidth
                multiline
                rows={3}
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

                {newMember.inviteMethod === "direct" ? (
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => setOpenUserDialog(true)}
                      sx={{ mb: 2 }}
                    >
                      Chọn thành viên
                    </Button>

                    {selectedUser && (
                      <Box
                        sx={{
                          mb: 2,
                          p: 2,
                          border: "1px solid #ddd",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="subtitle2" gutterBottom>
                          Thành viên đã chọn:
                        </Typography>
                        <Typography>
                          {selectedUser.name || selectedUser.email}
                        </Typography>
                        <FormControl fullWidth sx={{ mt: 1 }}>
                          <InputLabel>Vai trò</InputLabel>
                          <Select
                            value={newMember.role}
                            label="Vai trò"
                            onChange={(e) =>
                              setNewMember({
                                ...newMember,
                                role: e.target.value,
                              })
                            }
                          >
                            {Object.values(ROLES).map((role) => (
                              <MenuItem key={role} value={role}>
                                {getRoleName(role)}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                  </Box>
                ) : (
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
                      disabled={
                        !newMember.email || !validateEmail(newMember.email)
                      }
                    >
                      <AddIcon />
                    </Button>
                  </Stack>
                )}

                <Stack spacing={1}>
                  {members.map((member) => (
                    <Chip
                      key={member.id || member.email}
                      label={`${member.name || member.email} (${getRoleName(
                        member.role
                      )}) - ${
                        member.status === "pending" ? "Đang chờ" : "Đã thêm"
                      }`}
                      onDelete={() =>
                        handleRemoveMember(member.id || member.email)
                      }
                      color={
                        member.status === "pending" ? "warning" : "primary"
                      }
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

      <UserSelectionDialog
        open={openUserDialog}
        onClose={() => setOpenUserDialog(false)}
        onSubmit={handleUserSelect}
        selectedUsers={members}
      />
    </>
  );
};

export default CreateProjectDialog;
