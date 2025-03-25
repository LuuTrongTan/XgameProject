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
  PROJECT_MANAGER: "Project Manager",
  MEMBER: "Member",
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
    setFormData((prev) => ({
      ...prev,
      avatar: file,
    }));
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
        : "Đã gửi lời mời qua email"
    );

    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleRemoveMember = (email) => {
    setMembers(members.filter((m) => m.email !== email));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (
        !formData.name.trim() ||
        formData.name.trim().length < 3 ||
        formData.name.trim().length > 100
      ) {
        setError("Tên dự án phải từ 3-100 ký tự");
        return;
      }

      if (
        !formData.description.trim() ||
        formData.description.trim().length < 10 ||
        formData.description.trim().length > 2000
      ) {
        setError("Mô tả dự án phải từ 10-2000 ký tự");
        return;
      }

      const formDataToSend = new FormData();

      // Append basic project data
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("description", formData.description.trim());
      formDataToSend.append("status", formData.status);

      // Log the data being sent
      console.log("Submitting project with data:", {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        hasAvatar: !!formData.avatar,
        membersCount: members.length,
      });

      // Append avatar if exists
      if (formData.avatar) {
        formDataToSend.append("avatar", formData.avatar);
        console.log("Avatar details:", {
          name: formData.avatar.name,
          type: formData.avatar.type,
          size: formData.avatar.size,
        });
      }

      // Append members if exists
      if (members.length > 0) {
        const membersData = members.map((m) => ({
          email: m.email.toLowerCase(),
          role: m.role || "Member",
          status: m.status || "pending",
        }));
        formDataToSend.append("members", JSON.stringify(membersData));
        console.log("Members data:", membersData);
      }

      // Log FormData contents
      console.log("FormData contents:");
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ":", pair[1]);
      }

      const response = await createProject(formDataToSend);
      console.log("Server response:", response);

      if (response.success) {
        onSuccess(response.data);
        onClose();
        // Reset form data
        setFormData({
          name: "",
          description: "",
          avatar: null,
          status: PROJECT_STATUS.ACTIVE,
        });
        setMembers([]);
      } else {
        setError(response.message || "Có lỗi xảy ra khi tạo dự án");
      }
    } catch (err) {
      console.error("Error creating project:", err);
      console.error("Error details:", {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message,
      });
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Có lỗi xảy ra khi tạo dự án"
      );
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
                      {role}
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
                  label={`${member.email} (${member.role}) - ${
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
