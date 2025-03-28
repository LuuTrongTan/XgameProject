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
  Stack,
  IconButton,
  Autocomplete,
  Tooltip,
  CircularProgress,
  Divider,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import API from "../../api/api";
import ActivityService from "../../services/activityService";
import { useNavigate, useParams } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "notistack";
import { ROLES } from "../../config/constants";
import { usePermissions } from "../../hooks/usePermissions";
import {
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  RemoveCircle as RemoveCircleIcon,
} from "@mui/icons-material";
import { BackButton } from "../common/BackButton";

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

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const TaskForm = ({ open, onClose, onSave, task, projectId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    assignees: [],
    estimatedHours: 0,
    project: projectId,
    tags: [],
    syncWithCalendar: false,
    calendarType: "google",
  });
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState(null);
  const [files, setFiles] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  const { canDeleteTask } = usePermissions();

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
        tags: task.tags || [],
        syncWithCalendar: task.syncWithCalendar || false,
        calendarType: task.calendarType || "google",
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
        tags: [],
        syncWithCalendar: false,
        calendarType: "google",
      });
    }
  }, [task, projectId]);

  useEffect(() => {
    fetchUsers();
    fetchAvailableTags();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await API.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAvailableTags = async () => {
    try {
      // Giả sử API trả về danh sách các tag phổ biến
      const response = await API.get("/tags");
      setAvailableTags(response.data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setAvailableTags([
        "Urgent",
        "Bug",
        "Feature",
        "Documentation",
        "Testing",
      ]);
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

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
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

  const handleTagsChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      tags: newValue,
    }));
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
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
      // Tạo form data để upload file
      const formDataObj = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "assignees" || key === "tags") {
          formDataObj.append(key, JSON.stringify(formData[key]));
        } else {
          formDataObj.append(key, formData[key]);
        }
      });

      // Thêm các file vào form data
      files.forEach((file) => {
        formDataObj.append("attachments", file);
      });

      let response;
      if (task?._id) {
        response = await API.put(`/tasks/${task._id}`, formDataObj, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        await ActivityService.logTaskUpdated(formData.title);

        // Nếu có yêu cầu đồng bộ lịch
        if (formData.syncWithCalendar) {
          await API.post(`/tasks/${response.data._id}/sync-calendar`, {
            calendarType: formData.calendarType,
          });
        }
      } else {
        response = await API.post("/tasks", formDataObj, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        await ActivityService.logTaskCreated(formData.title, project?.name);

        // Nếu có yêu cầu đồng bộ lịch
        if (formData.syncWithCalendar) {
          await API.post(`/tasks/${response.data._id}/sync-calendar`, {
            calendarType: formData.calendarType,
          });
        }
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
    console.log("TaskForm - Delete attempt");
    console.log("- Task:", task);
    console.log("- Project:", project);

    if (!canDeleteTask(task, project)) {
      console.log("- Permission check failed: User cannot delete this task");
      enqueueSnackbar(
        "Bạn không có quyền xóa công việc này. Chỉ Admin, Project Manager hoặc người tạo task (khi chưa được gán) mới có thể xóa.",
        { variant: "error", autoHideDuration: 5000 }
      );
      return;
    }

    console.log("- Permission check passed: User can delete this task");

    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      setLoading(true);
      try {
        await API.delete(`/tasks/${task._id}`);
        await ActivityService.logTaskDeleted(task.title);
        enqueueSnackbar("Công việc đã được xóa thành công", {
          variant: "success",
          autoHideDuration: 5000,
        });
        navigate(`/projects/${projectId}`);
      } catch (error) {
        console.error("Error deleting task:", error);
        enqueueSnackbar(
          error.response?.data?.message || "Không thể xóa công việc",
          { variant: "error", autoHideDuration: 5000 }
        );
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
        status: "done",
      });
      await ActivityService.logTaskCompleted(task.title);
      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setLoading(false);
    }
  };

  const openTagsDialog = () => {
    setTagsDialogOpen(true);
  };

  const closeTagsDialog = () => {
    setTagsDialogOpen(false);
    setNewTag("");
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
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
                <MenuItem value="inProgress">Đang thực hiện</MenuItem>
                <MenuItem value="review">Đang kiểm tra</MenuItem>
                <MenuItem value="done">Hoàn thành</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="assignee-label">Người thực hiện</InputLabel>
              <Select
                labelId="assignee-label"
                multiple
                name="assignees"
                value={formData.assignees}
                onChange={handleAssigneesChange}
                input={<OutlinedInput label="Người thực hiện" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => {
                      const user = users.find((u) => u._id === value);
                      return (
                        <Chip
                          key={value}
                          label={user ? user.fullName : value}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {users.map((user) => (
                  <MenuItem key={user._id} value={user._id}>
                    {user.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Ngày hết hạn"
                value={formData.dueDate}
                onChange={handleDateChange}
                sx={{ width: "100%" }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              name="estimatedHours"
              label="Thời gian ước tính (giờ)"
              value={formData.estimatedHours}
              onChange={handleChange}
              error={!!errors.estimatedHours}
              helperText={errors.estimatedHours}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Autocomplete
              multiple
              freeSolo
              id="tags"
              options={availableTags}
              value={formData.tags}
              onChange={handleTagsChange}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Tags" placeholder="Thêm tag" />
              )}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Tệp đính kèm
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{ mb: 2 }}
            >
              Tải lên tệp
              <VisuallyHiddenInput
                type="file"
                multiple
                onChange={handleFileChange}
              />
            </Button>

            <Box sx={{ mt: 2 }}>
              {files.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1,
                    mb: 1,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                  }}
                >
                  <AttachFileIcon sx={{ mr: 1 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {task?.attachments?.map((attachment, index) => (
                <Box
                  key={`existing-${index}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 1,
                    mb: 1,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    bgcolor: "#f5f5f5",
                  }}
                >
                  <AttachFileIcon sx={{ mr: 1 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {attachment.name} ({(attachment.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <FormControl
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <InputLabel id="calendar-sync-label" sx={{ ml: 1 }}>
                  Đồng bộ với lịch
                </InputLabel>
                <Select
                  labelId="calendar-sync-label"
                  name="calendarType"
                  value={formData.calendarType}
                  onChange={handleChange}
                  disabled={!formData.syncWithCalendar}
                  sx={{ ml: 2, minWidth: 150 }}
                >
                  <MenuItem value="google">Google Calendar</MenuItem>
                  <MenuItem value="outlook">Microsoft Outlook</MenuItem>
                </Select>
                <Chip
                  label={formData.syncWithCalendar ? "Bật" : "Tắt"}
                  color={formData.syncWithCalendar ? "primary" : "default"}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      syncWithCalendar: !prev.syncWithCalendar,
                    }))
                  }
                  icon={<CalendarIcon />}
                  clickable
                  sx={{ ml: 2 }}
                />
              </FormControl>
            </Box>
          </Grid>

          {errors.submit && (
            <Grid item xs={12}>
              <FormHelperText error>{errors.submit}</FormHelperText>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 2,
              }}
            >
              <BackButton
                label="Hủy"
                onClick={() => (onClose ? onClose() : navigate(-1))}
              />
              <Box>
                {task?._id && (
                  <Tooltip
                    title={
                      !canDeleteTask(task, project)
                        ? "Chỉ Admin, Project Manager hoặc người tạo task (khi chưa được gán) mới có thể xóa"
                        : "Xóa công việc"
                    }
                  >
                    <span>
                      <Button
                        type="button"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={handleDelete}
                        sx={{ mr: 1 }}
                        disabled={loading || !canDeleteTask(task, project)}
                      >
                        Xóa
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {task?._id && task?.status !== "done" && (
                  <Button
                    type="button"
                    color="success"
                    variant="outlined"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleComplete}
                    sx={{ mr: 1 }}
                    disabled={loading}
                  >
                    Hoàn thành
                  </Button>
                )}
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : task?._id ? (
                    "Cập nhật"
                  ) : (
                    "Tạo mới"
                  )}
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Dialog open={tagsDialogOpen} onClose={closeTagsDialog}>
        <DialogTitle>Thêm tag mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tên tag"
            fullWidth
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTagsDialog}>Hủy</Button>
          <Button onClick={addTag} variant="contained">
            Thêm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TaskForm;
