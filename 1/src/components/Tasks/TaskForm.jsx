import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  Chip,
  Box,
  OutlinedInput,
  FormHelperText,
  Paper,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import API from "../../api/api";
import ActivityService from "../../services/activityService";
import { useNavigate, useParams } from "react-router-dom";

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

const TaskForm = ({ open, onClose, onSave, task, projectId }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    assignees: [],
    estimatedHours: 0,
    project: projectId,
  });
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        dueDate: task.dueDate
          ? new Date(task.dueDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignees: task.assignees?.map((a) => a._id) || [],
        estimatedHours: task.estimatedHours || 0,
        project: task.project || projectId,
      });
    } else {
      // Reset form when creating new task
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignees: [],
        estimatedHours: 0,
        project: projectId,
      });
    }
  }, [task, projectId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await API.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is changed
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleAssigneesChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData((prev) => ({
      ...prev,
      assignees: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      dueDate: date,
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề công việc không được để trống";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả không được để trống";
    }
    if (formData.estimatedHours < 0) {
      newErrors.estimatedHours = "Thời gian ước tính không hợp lệ";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let response;
      if (task?._id) {
        response = await API.put(`/tasks/${task._id}`, formData);
        await ActivityService.logTaskUpdated(formData.title);
      } else {
        response = await API.post("/tasks", formData);
        await ActivityService.logTaskCreated(formData.title, project.name);
      }
      onSave(response.data);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error saving task:", error);
      setErrors({ submit: error.response?.data?.message || "Có lỗi xảy ra" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      setLoading(true);
      try {
        await API.delete(`/tasks/${task._id}`);
        await ActivityService.logTaskDeleted(task.title);
        navigate(`/projects/${projectId}`);
      } catch (error) {
        console.error("Error deleting task:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await API.put(`/tasks/${task._id}`, {
        ...formData,
        status: "completed",
      });
      await ActivityService.logTaskCompleted(task.title);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
      <Typography variant="h5" gutterBottom>
        {task?._id ? "Chỉnh sửa công việc" : "Tạo công việc mới"}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              name="title"
              label="Tiêu đề"
              value={formData.title}
              onChange={handleChange}
              error={!!errors.title}
              helperText={errors.title}
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

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="priority-label">Độ ưu tiên</InputLabel>
              <Select
                labelId="priority-label"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                label="Độ ưu tiên"
              >
                <MenuItem value="low">Thấp</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="high">Cao</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Trạng thái</InputLabel>
              <Select
                labelId="status-label"
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Trạng thái"
              >
                <MenuItem value="todo">Chưa bắt đầu</MenuItem>
                <MenuItem value="in-progress">Đang thực hiện</MenuItem>
                <MenuItem value="completed">Đã hoàn thành</MenuItem>
                <MenuItem value="cancelled">Đã hủy</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="assignees-label">Người thực hiện</InputLabel>
              <Select
                labelId="assignees-label"
                multiple
                value={formData.assignees}
                onChange={handleAssigneesChange}
                input={<OutlinedInput label="Người thực hiện" />}
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

          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Ngày hết hạn"
                value={formData.dueDate}
                onChange={handleDateChange}
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

          <Grid item xs={12} sm={6}>
            <TextField
              name="estimatedHours"
              label="Thời gian ước tính (giờ)"
              type="number"
              fullWidth
              value={formData.estimatedHours}
              onChange={handleChange}
              error={!!errors.estimatedHours}
              helperText={errors.estimatedHours}
              required
            />
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
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            Hủy
          </Button>

          {task?._id && (
            <>
              <Button
                variant="contained"
                color="success"
                size="large"
                onClick={handleComplete}
                disabled={loading || formData.status === "completed"}
                sx={{ ml: "auto" }}
              >
                {loading ? "Đang xử lý..." : "Đánh dấu hoàn thành"}
              </Button>

              <Button
                variant="outlined"
                color="error"
                size="large"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? "Đang xóa..." : "Xóa công việc"}
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default TaskForm;
