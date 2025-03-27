import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  MenuItem,
  FormControl,
  FormHelperText,
  Grid,
  CircularProgress,
} from "@mui/material";
import { TextField as MuiTextField } from "@mui/material";
import { useSnackbar } from "notistack";
import { createSprint, updateSprint } from "../../api/sprintApi";

const SprintFormDialog = ({
  open,
  onClose,
  projectId,
  onSuccess,
  sprint = null,
  isEditing = false,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "planning",
    goal: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (sprint && isEditing) {
      setFormData({
        name: sprint.name || "",
        description: sprint.description || "",
        startDate: sprint.startDate
          ? formatDateForInput(new Date(sprint.startDate))
          : "",
        endDate: sprint.endDate
          ? formatDateForInput(new Date(sprint.endDate))
          : "",
        status: sprint.status || "planning",
        goal: sprint.goal || "",
      });
    } else {
      // Đặt lại form khi mở dialog tạo mới
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        status: "planning",
        goal: "",
      });
    }
    // Reset errors
    setErrors({});
  }, [sprint, isEditing, open]);

  const formatDateForInput = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Xóa lỗi khi người dùng sửa
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Tên sprint là bắt buộc";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả sprint là bắt buộc";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Ngày bắt đầu là bắt buộc";
    }
    if (!formData.endDate) {
      newErrors.endDate = "Ngày kết thúc là bắt buộc";
    } else if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.endDate) < new Date(formData.startDate)
    ) {
      newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditing && sprint) {
        await updateSprint(projectId, sprint._id, formData);
        enqueueSnackbar("Sprint đã được cập nhật thành công", {
          variant: "success",
        });
      } else {
        await createSprint(projectId, formData);
        enqueueSnackbar("Sprint đã được tạo thành công", {
          variant: "success",
        });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      enqueueSnackbar(error.message || "Có lỗi xảy ra", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? "Cập nhật Sprint" : "Tạo Sprint mới"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Tên Sprint"
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleInputChange}
              error={!!errors.name}
              helperText={errors.name}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="description"
              label="Mô tả"
              multiline
              rows={3}
              fullWidth
              value={formData.description}
              onChange={handleInputChange}
              error={!!errors.description}
              helperText={errors.description}
              disabled={loading}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.startDate}>
              <TextField
                label="Ngày bắt đầu"
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                error={!!errors.startDate}
                helperText={errors.startDate}
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.endDate}>
              <TextField
                label="Ngày kết thúc"
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                error={!!errors.endDate}
                helperText={errors.endDate}
                disabled={loading}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              margin="dense"
              name="status"
              label="Trạng thái"
              fullWidth
              value={formData.status}
              onChange={handleInputChange}
              disabled={loading}
            >
              <MenuItem value="planning">Lên kế hoạch</MenuItem>
              <MenuItem value="active">Đang thực hiện</MenuItem>
              <MenuItem value="completed">Hoàn thành</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="dense"
              name="goal"
              label="Mục tiêu Sprint (tùy chọn)"
              multiline
              rows={2}
              fullWidth
              value={formData.goal}
              onChange={handleInputChange}
              disabled={loading}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} color="primary" disabled={loading}>
          {loading ? (
            <CircularProgress size={24} />
          ) : isEditing ? (
            "Cập nhật"
          ) : (
            "Tạo"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SprintFormDialog;
