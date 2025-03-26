import React from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Grid,
} from "@mui/material";
import { AccessTime as TimeIcon, Flag as FlagIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const statusColors = {
  active: "success",
  pending: "warning",
  completed: "info",
  archived: "default",
};

const statusLabels = {
  active: "Đang hoạt động",
  pending: "Chờ xử lý",
  completed: "Hoàn thành",
  archived: "Đã lưu trữ",
};

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  // Fallback data for preview
  const fallbackProject = {
    _id: "123",
    name: "Sample Project",
    description: "This is a sample project description.",
    status: "active",
    progress: 75,
    dueDate: new Date(),
    members: new Array(5).fill({ avatar: "", name: "User" }),
    tasksCount: { total: 10, completed: 7 },
  };

  const p = project || fallbackProject;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": {
          boxShadow: 6,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Chip
              label={statusLabels[p.status] || "Unknown"}
              color={statusColors[p.status] || "default"}
              size="small"
              sx={{ mb: 1 }}
            />
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              <TimeIcon
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />
              {new Date(p.dueDate).toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" component="div" gutterBottom noWrap>
          {p.name}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            height: "40px",
          }}
        >
          {p.description}
        </Typography>

        <Box sx={{ mt: 2, mb: 1 }}>
          <Grid container justifyContent="space-between">
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Tiến độ
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                {p.progress}%
              </Typography>
            </Grid>
          </Grid>
          <LinearProgress
            variant="determinate"
            value={p.progress}
            sx={{ mt: 1, mb: 1, height: 8, borderRadius: 5 }}
          />
        </Box>

        <Grid container justifyContent="space-between" sx={{ mt: 2 }}>
          <Grid item>
            <AvatarGroup max={4}>
              {p.members.map((member, index) => (
                <Avatar
                  key={index}
                  alt={member.name}
                  src={member.avatar}
                  sx={{ width: 30, height: 30 }}
                />
              ))}
            </AvatarGroup>
          </Grid>
          <Grid item>
            <Typography variant="body2" color="text.secondary">
              <FlagIcon
                fontSize="small"
                sx={{ verticalAlign: "middle", mr: 0.5 }}
              />
              {p.tasksCount.completed}/{p.tasksCount.total} công việc
            </Typography>
          </Grid>
        </Grid>
      </CardContent>

      <CardActions>
        <Button size="small" onClick={() => navigate(`/projects/${p._id}`)}>
          Xem chi tiết
        </Button>
        <Button
          size="small"
          onClick={() => {
            if (p && p._id) {
              navigate(`/projects/${p._id}/tasks`);
            }
          }}
        >
          Công việc
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
