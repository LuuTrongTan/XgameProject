import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Archive as ArchiveIcon,
  Restore as RestoreIcon,
  Person as PersonIcon,
  Comment as CommentIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Hiển thị biểu tượng tương ứng với loại hoạt động
 */
const ActivityIcon = ({ action }) => {
  switch (action) {
    case "created":
      return <AddIcon color="success" />;
    case "updated":
      return <EditIcon color="primary" />;
    case "deleted":
      return <DeleteIcon color="error" />;
    case "completed":
      return <CheckCircleIcon color="success" />;
    case "archived":
      return <ArchiveIcon color="warning" />;
    case "restored":
      return <RestoreIcon color="info" />;
    case "assigned":
      return <PersonIcon color="secondary" />;
    case "commented":
      return <CommentIcon color="primary" />;
    default:
      return <EditIcon color="primary" />;
  }
};

/**
 * Component hiển thị danh sách hoạt động gần đây
 */
const ActivityLog = ({ activities = [] }) => {
  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Hoạt động gần đây
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Chưa có hoạt động nào gần đây
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Hoạt động gần đây
        </Typography>
        
        <List sx={{ p: 0 }}>
          {activities.map((activity, index) => (
            <React.Fragment key={activity._id || index}>
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar 
                    src={activity.user?.avatar} 
                    alt={activity.user?.name} 
                    sx={{ bgcolor: 'primary.main' }}
                  >
                    {activity.user?.name?.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <ActivityIcon action={activity.action} />
                      <Typography variant="subtitle2" component="span">
                        {activity.title}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <React.Fragment>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                      >
                        {activity.description}
                      </Typography>
                      <Box mt={0.5} display="flex" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          {activity.project?.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activity.createdAt && formatDistanceToNow(new Date(activity.createdAt), {
                            addSuffix: true,
                            locale: vi
                          })}
                        </Typography>
                      </Box>
                    </React.Fragment>
                  }
                />
              </ListItem>
              {index < activities.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
