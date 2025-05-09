import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { vi } from "date-fns/locale";
import MemberSelection from "../common/MemberSelection";
import { createSprint, updateSprint } from "../../api/sprintApi";
import { useSnackbar } from "notistack";
import { getProjectMembers } from "../../api/projectApi";

const SprintFormDialog = ({ 
  open, 
  onClose, 
  onSubmit, 
  onSuccess, 
  sprint, 
  projectId,
  isEditing = false,
  disabled = false,
  showMemberSelection = true
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: null,
    endDate: null,
    status: "planning",
    members: [],
  });
  const [loading, setLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loadingProjectMembers, setLoadingProjectMembers] = useState(false);

  useEffect(() => {
    if (sprint) {
      setFormData({
        name: sprint.name || "",
        description: sprint.description || "",
        startDate: sprint.startDate ? new Date(sprint.startDate) : null,
        endDate: sprint.endDate ? new Date(sprint.endDate) : null,
        status: sprint.status || "planning",
        members: sprint.members || [],
      });
    } else {
      // Đặt giá trị mặc định cho ngày bắt đầu là ngày hiện tại
      // và ngày kết thúc là 7 ngày sau
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 7);
      
      setFormData({
        name: "",
        description: "",
        startDate: today,
        endDate: endDate,
        status: "planning",
        members: [],
      });
    }
  }, [sprint]);

  // Fetch project members when dialog opens
  useEffect(() => {
    if (open && projectId && showMemberSelection) {
      fetchProjectMembers();
    }
  }, [open, projectId, showMemberSelection]);

  const fetchProjectMembers = async () => {
    try {
      setLoadingProjectMembers(true);
      const response = await getProjectMembers(projectId);
      if (response.success) {
        setProjectMembers(response.data);
      } else {
        console.error("Không thể lấy danh sách thành viên dự án:", response.message);
      }
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên dự án:", error);
    } finally {
      setLoadingProjectMembers(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date, field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Đảm bảo ngày bắt đầu và ngày kết thúc có giá trị hợp lệ
      const formDataToSubmit = { ...formData };
      
      // Nếu không có ngày bắt đầu, set là ngày hiện tại
      if (!formDataToSubmit.startDate) {
        formDataToSubmit.startDate = new Date();
      }
      
      // Nếu không có ngày kết thúc, set là 7 ngày sau ngày bắt đầu
      if (!formDataToSubmit.endDate) {
        const endDate = new Date(formDataToSubmit.startDate);
        endDate.setDate(endDate.getDate() + 7);
        formDataToSubmit.endDate = endDate;
      }
      
      let response;
      
      if (isEditing && sprint) {
        // Cập nhật sprint hiện có
        response = await updateSprint(projectId, sprint._id, formDataToSubmit);
      } else {
        // Tạo sprint mới
        response = await createSprint(projectId, formDataToSubmit);
      }

      if (response.success) {
        enqueueSnackbar(
          isEditing 
            ? "Sprint đã được cập nhật thành công" 
            : "Sprint đã được tạo thành công", 
          { variant: "success" }
        );
        
        // Gọi callback
        if (typeof onSubmit === 'function') {
          onSubmit(formDataToSubmit);
        } 
        
        if (typeof onSuccess === 'function') {
          onSuccess(response.data);
        }

        onClose();
      } else {
        throw new Error(response.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Lỗi khi xử lý sprint:", error);
      enqueueSnackbar(
        error.message || "Không thể lưu sprint, vui lòng thử lại", 
        { variant: "error" }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMembersChange = (newMembers) => {
    setFormData((prev) => ({
      ...prev,
      members: newMembers,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {sprint ? "Chỉnh sửa Sprint" : "Tạo Sprint mới"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Tên Sprint"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              disabled={disabled}
            />
            <TextField
              label="Mô tả"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              disabled={disabled}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
              <DatePicker
                label="Ngày bắt đầu"
                value={formData.startDate}
                onChange={(date) => handleDateChange(date, "startDate")}
                slotProps={{ textField: { fullWidth: true, required: true } }}
                disabled={disabled}
              />
              <DatePicker
                label="Ngày kết thúc"
                value={formData.endDate}
                onChange={(date) => handleDateChange(date, "endDate")}
                slotProps={{ textField: { fullWidth: true, required: true } }}
                minDate={formData.startDate}
                disabled={disabled}
              />
            </LocalizationProvider>
            <FormControl fullWidth disabled={disabled}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                name="status"
                value={formData.status}
                onChange={handleChange}
                label="Trạng thái"
              >
                <MenuItem value="planning">Lên kế hoạch</MenuItem>
                <MenuItem value="active">Đang thực hiện</MenuItem>
                <MenuItem value="completed">Hoàn thành</MenuItem>
                <MenuItem value="cancelled">Đã hủy</MenuItem>
              </Select>
            </FormControl>

            {showMemberSelection && (
              <Box sx={{ mt: 2 }}>
                <MemberSelection
                  members={formData.members}
                  onMembersChange={handleMembersChange}
                  showRoleSelection={false}
                  title="Thành viên Sprint"
                  mode={projectMembers.length > 0 ? "project" : "all"}
                  projectMembers={projectMembers}
                  disabled={disabled}
                />
                {loadingProjectMembers && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Đang tải danh sách thành viên dự án...
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Chỉ có thể chọn những người đã tham gia dự án
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Hủy</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || disabled}
          >
            {sprint ? "Cập nhật" : "Tạo mới"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SprintFormDialog;
