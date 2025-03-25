import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Avatar,
  Tooltip,
} from "@mui/material";
import { format, isValid } from "date-fns";
import { vi } from "date-fns/locale";

const getPriorityColor = (priority) => {
  switch (priority) {
    case "HIGH":
      return "error";
    case "MEDIUM":
      return "warning";
    case "LOW":
      return "info";
    default:
      return "default";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "TODO":
      return "info";
    case "IN_PROGRESS":
      return "warning";
    case "DONE":
      return "success";
    default:
      return "default";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "TODO":
      return "Chưa bắt đầu";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "DONE":
      return "Hoàn thành";
    default:
      return status;
  }
};

const getPriorityLabel = (priority) => {
  switch (priority) {
    case "HIGH":
      return "Cao";
    case "MEDIUM":
      return "Trung bình";
    case "LOW":
      return "Thấp";
    default:
      return priority;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "Chưa có";
  const date = new Date(dateString);
  return isValid(date)
    ? format(date, "dd/MM/yyyy", { locale: vi })
    : "Ngày không hợp lệ";
};

const TaskCard = ({ task }) => {
  return (
    <Card
      sx={{
        height: "100%",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        },
        borderRadius: "8px",
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h6"
          component="div"
          gutterBottom
          noWrap
          sx={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "text.primary",
            mb: 1.5,
          }}
        >
          {task.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {task.description}
        </Typography>

        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
          <Chip
            label={getStatusLabel(task.status)}
            color={getStatusColor(task.status)}
            size="small"
            sx={{
              height: "24px",
              fontSize: "0.75rem",
              fontWeight: 500,
              "& .MuiChip-label": {
                px: 1,
              },
            }}
          />
          <Chip
            label={getPriorityLabel(task.priority)}
            color={getPriorityColor(task.priority)}
            size="small"
            sx={{
              height: "24px",
              fontSize: "0.75rem",
              fontWeight: 500,
              "& .MuiChip-label": {
                px: 1,
              },
            }}
          />
        </Box>

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            pt: 1,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              Hạn: {formatDate(task.dueDate)}
            </Typography>
          </Box>

          <Box display="flex" alignItems="center">
            <Box display="flex" sx={{ ml: "auto" }}>
              {task.assignees?.map((assignee, index) => (
                <Tooltip key={assignee._id} title={assignee.fullName}>
                  <Avatar
                    src={assignee.avatar}
                    alt={assignee.fullName}
                    sx={{
                      width: 28,
                      height: 28,
                      ml: index > 0 ? -1 : 0,
                      border: "2px solid",
                      borderColor: "background.paper",
                      fontSize: "0.875rem",
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
