import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Chip,
} from "@mui/material";
import {
  Assignment as ProjectIcon,
  Task as TaskIcon,
  Comment as CommentIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Hàm để lấy icon dựa vào loại hoạt động
const getActivityIcon = (type) => {
  switch (type) {
    case "project":
      return <ProjectIcon />;
    case "task":
      return <TaskIcon />;
    case "comment":
      return <CommentIcon />;
    default:
      return <TimeIcon />;
  }
};

// Hàm để lấy màu chip dựa vào action
const getActionColor = (action) => {
  switch (action) {
    case "created":
      return "success";
    case "updated":
      return "info";
    case "completed":
      return "primary";
    case "deleted":
      return "error";
    default:
      return "default";
  }
};

const RecentActivities = ({ activities = [] }) => {
  return (
    <Box
      sx={{ bgcolor: "background.paper", borderRadius: 1, overflow: "hidden" }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h6" component="h3">
          Hoạt động gần đây
        </Typography>
      </Box>

      {activities.length === 0 ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">
            Không tìm thấy hoạt động gần đây.
          </Typography>
        </Box>
      ) : (
        <List sx={{ py: 0 }}>
          {activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  px: 3,
                  py: 2,
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    {getActivityIcon(activity.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        component="span"
                        variant="subtitle2"
                        color="text.primary"
                      >
                        {activity.title}
                      </Typography>
                      <Chip
                        label={activity.action}
                        size="small"
                        color={getActionColor(activity.action)}
                        sx={{ height: 20 }}
                      />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        sx={{ display: "block", mb: 0.5 }}
                      >
                        {activity.description}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <TimeIcon sx={{ fontSize: 14 }} />
                        {format(
                          new Date(activity.timestamp),
                          "d MMMM, yyyy 'lúc' HH:mm",
                          {
                            locale: vi,
                          }
                        )}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && (
                <Divider variant="inset" component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default RecentActivities;
