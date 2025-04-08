import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from "@mui/material";

export const StatusFilter = ({ value, onChange }) => {
  return (
    <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
      <InputLabel id="status-filter-label">Trạng thái</InputLabel>
      <Select
        labelId="status-filter-label"
        id="status-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label="Trạng thái"
        sx={{
          borderRadius: "10px",
          backgroundColor: "#fff",
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <MenuItem value="all">Tất cả</MenuItem>
        <MenuItem value="todo">Chưa bắt đầu</MenuItem>
        <MenuItem value="inProgress">Đang thực hiện</MenuItem>
        <MenuItem value="done">Hoàn thành</MenuItem>
      </Select>
    </FormControl>
  );
};

export const PriorityFilter = ({ value, onChange }) => {
  return (
    <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
      <InputLabel id="priority-filter-label">Độ ưu tiên</InputLabel>
      <Select
        labelId="priority-filter-label"
        id="priority-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        label="Độ ưu tiên"
        sx={{
          borderRadius: "10px",
          backgroundColor: "#fff",
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <MenuItem value="all">Tất cả</MenuItem>
        <MenuItem value="high">Cao</MenuItem>
        <MenuItem value="medium">Trung bình</MenuItem>
        <MenuItem value="low">Thấp</MenuItem>
      </Select>
    </FormControl>
  );
};

const TaskFilters = ({ statusFilter, priorityFilter, onStatusChange, onPriorityChange }) => {
  return (
    <Box display="flex" gap={2}>
      <StatusFilter value={statusFilter} onChange={onStatusChange} />
      <PriorityFilter value={priorityFilter} onChange={onPriorityChange} />
    </Box>
  );
};

export default TaskFilters; 