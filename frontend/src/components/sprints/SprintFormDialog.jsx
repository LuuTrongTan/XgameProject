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
  Chip,
  Stack,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { vi } from "date-fns/locale";
import UserSelectionDialog from "../common/UserSelectionDialog";

const SprintFormDialog = ({ open, onClose, onSubmit, sprint, projectId }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: null,
    endDate: null,
    status: "planning",
    members: [],
  });

  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

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
      setSelectedMembers(sprint.members || []);
    } else {
      setFormData({
        name: "",
        description: "",
        startDate: null,
        endDate: null,
        status: "planning",
        members: [],
      });
      setSelectedMembers([]);
    }
  }, [sprint]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleUserSelect = (selectedUsers) => {
    setSelectedMembers(selectedUsers);
    setFormData((prev) => ({
      ...prev,
      members: selectedUsers,
    }));
  };

  return (
    <>
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
              />
              <TextField
                label="Mô tả"
                name="description"
                value={formData.description}
                onChange={handleChange}
                fullWidth
                multiline
                rows={3}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Ngày bắt đầu"
                  value={formData.startDate}
                  onChange={(date) => handleDateChange(date, "startDate")}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  required
                />
                <DatePicker
                  label="Ngày kết thúc"
                  value={formData.endDate}
                  onChange={(date) => handleDateChange(date, "endDate")}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                  required
                />
              </LocalizationProvider>
              <FormControl fullWidth>
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

              <Box>
                <Button
                  variant="outlined"
                  onClick={() => setOpenUserDialog(true)}
                  sx={{ mb: 1 }}
                >
                  Chọn thành viên
                </Button>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {selectedMembers.map((member) => (
                    <Chip
                      key={member.id}
                      label={member.name || member.email}
                      onDelete={() => {
                        setSelectedMembers((prev) =>
                          prev.filter((m) => m.id !== member.id)
                        );
                        setFormData((prev) => ({
                          ...prev,
                          members: prev.members.filter(
                            (m) => m.id !== member.id
                          ),
                        }));
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Hủy</Button>
            <Button type="submit" variant="contained" color="primary">
              {sprint ? "Cập nhật" : "Tạo mới"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <UserSelectionDialog
        open={openUserDialog}
        onClose={() => setOpenUserDialog(false)}
        onSubmit={handleUserSelect}
        selectedUsers={selectedMembers}
      />
    </>
  );
};

export default SprintFormDialog;
