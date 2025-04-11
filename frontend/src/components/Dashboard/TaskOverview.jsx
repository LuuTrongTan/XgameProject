import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
} from "@mui/material";
import {
  AssignmentTurnedIn as DoneIcon,
  Assignment as TaskIcon,
  Timer as PendingIcon,
  Error as WarningIcon,
} from "@mui/icons-material";

/**
 * Component hiển thị tổng quan về số lượng công việc theo trạng thái
 */
const TaskOverview = ({ stats }) => {
  if (!stats) {
    return null;
  }

  const items = [
    {
      label: "Tổng công việc",
      value: stats.total || 0,
      color: "primary",
      icon: <TaskIcon />,
    },
    {
      label: "Đang thực hiện",
      value: stats.inProgress || 0,
      color: "info",
      icon: <TaskIcon />,
    },
    {
      label: "Đang chờ",
      value: stats.pending || 0,
      color: "warning",
      icon: <PendingIcon />,
    },
    {
      label: "Đã hoàn thành",
      value: stats.completed || 0,
      color: "success",
      icon: <DoneIcon />,
    },
    {
      label: "Ưu tiên cao",
      value: stats.highPriority || 0,
      color: "secondary",
      icon: <TaskIcon />,
    },
    {
      label: "Quá hạn",
      value: stats.overdue || 0,
      color: "error",
      icon: <WarningIcon />,
    },
  ];

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tóm tắt công việc
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={1}>
            {items.map((item) => (
              <Chip
                key={item.label}
                icon={item.icon}
                label={`${item.value} ${item.label}`}
                color={item.color}
                variant="outlined"
                sx={{ borderWidth: 2, fontWeight: 500 }}
              />
            ))}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Tóm tắt ngắn gọn
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ✔️ {stats.total} công việc | ⏳ {stats.inProgress} đang làm | 
            ✅ {stats.completed} hoàn thành | ⚠️ {stats.overdue} quá hạn
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskOverview;
