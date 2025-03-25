import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Grid,
  Typography,
  Paper,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import api from "../../utils/api";
import ActivityService from "../../services/activityService";
import { useNavigate } from "react-router-dom";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const ProjectForm = ({ project, onSubmit, onCancel }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Đang hoạt động",
    startDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    members: [],
  });
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/api/users");
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "Đang hoạt động",
        startDate: project.startDate ? new Date(project.startDate) : new Date(),
        dueDate: project.dueDate
          ? new Date(project.dueDate)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        members: project.members?.map((m) => m._id) || [],
      });
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleMembersChange = (event) => {
    const {
      target: { value },
    } = event;
    const selectedMembers =
      typeof value === "string" ? value.split(",") : value;

    // Transform the selected members into the required format
    const formattedMembers = selectedMembers.map((memberId) => ({
      user: memberId,
      role: "member",
      joinedAt: new Date(),
    }));

    setFormData((prev) => ({
      ...prev,
      members: formattedMembers,
    }));
  };

  const handleDateChange = (name) => (date) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Tên dự án không được để trống";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả không được để trống";
    }
    if (formData.dueDate < formData.startDate) {
      newErrors.dueDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const startDate =
        formData.startDate instanceof Date
          ? formData.startDate.toISOString()
          : new Date(formData.startDate).toISOString();

      const dueDate =
        formData.dueDate instanceof Date
          ? formData.dueDate.toISOString()
          : new Date(formData.dueDate).toISOString();

      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        startDate,
        dueDate,
        members: formData.members || [],
      };

      console.log("Submitting project data:", projectData);

      if (onSubmit) {
        await onSubmit(projectData);
      } else {
        if (project?._id) {
          const response = await api.put(
            `/api/projects/${project._id}`,
            projectData
          );
          if (response.data) {
            await ActivityService.logProjectUpdated(formData.name);
            navigate("/projects");
          }
        } else {
          const response = await api.post("/api/projects", projectData);
          if (response.data) {
            await ActivityService.logProjectCreated(formData.name);
            navigate("/projects");
          }
        }
      }
    } catch (error) {
      console.error("Error saving project:", error);
      console.error("Error details:", error.response?.data);
      setErrors({
        submit: error.response?.data?.message || "Có lỗi xảy ra khi lưu dự án",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa dự án này?")) {
      setLoading(true);
      try {
        const response = await api.delete(`/api/projects/${project._id}`);
        if (response.data) {
          await ActivityService.logProjectDeleted(project.name);
          navigate("/projects");
        }
      } catch (error) {
        console.error("Error deleting project:", error);
        setErrors({
          submit:
            error.response?.data?.message || "Có lỗi xảy ra khi xóa dự án",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        {project?._id ? "Chỉnh sửa dự án" : "Tạo dự án mới"}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              name="name"
              label="Tên dự án"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={4}
              name="description"
              label="Mô tả"
              value={formData.description}
              onChange={handleChange}
              error={!!errors.description}
              helperText={errors.description}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Trạng thái"
                onChange={handleChange}
              >
                <MenuItem value="Đang hoạt động">Đang hoạt động</MenuItem>
                <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                <MenuItem value="Đóng">Đóng</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="members-label">Thành viên</InputLabel>
              <Select
                labelId="members-label"
                multiple
                value={formData.members}
                onChange={handleMembersChange}
                input={<OutlinedInput label="Thành viên" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => {
                      const user = users.find((u) => u._id === value);
                      return (
                        <Chip key={value} label={user ? user.name : value} />
                      );
                    })}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {users.map((user) => (
                  <MenuItem key={user._id} value={user._id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Ngày bắt đầu"
                value={formData.startDate}
                onChange={handleDateChange("startDate")}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Ngày kết thúc"
                value={formData.dueDate}
                onChange={handleDateChange("dueDate")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    error={!!errors.dueDate}
                    helperText={errors.dueDate}
                  />
                )}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            size="large"
            onClick={onCancel || (() => navigate("/projects"))}
          >
            Hủy
          </Button>

          {project?._id && !onSubmit && (
            <Button
              variant="outlined"
              color="error"
              size="large"
              onClick={handleDelete}
              disabled={loading}
              sx={{ ml: "auto" }}
            >
              {loading ? "Đang xóa..." : "Xóa dự án"}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default ProjectForm;
