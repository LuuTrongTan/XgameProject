import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  Button,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import RecentActivities from "../components/activities/RecentActivities";
import api from "../utils/api";

const Profile = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await api.get("/api/activities/recent");
        setActivities(response.data);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Profile Info */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar
              sx={{
                width: 100,
                height: 100,
                mb: 2,
                bgcolor: "primary.main",
                fontSize: "2.5rem",
              }}
            >
              {user?.name?.charAt(0)}
            </Avatar>
            <Typography variant="h5" gutterBottom>
              {user?.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {user?.email}
            </Typography>
            <Button variant="outlined" color="primary" sx={{ mt: 2 }}>
              Chỉnh sửa thông tin
            </Button>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={8}>
          <RecentActivities activities={activities} />
        </Grid>

        {/* Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Thống kê hoạt động
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {activities.filter((a) => a.type === "project").length}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Dự án đã tham gia
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {activities.filter((a) => a.type === "task").length}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Công việc đã thực hiện
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box>
                  <Typography variant="h4" color="primary">
                    {activities.filter((a) => a.type === "comment").length}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Bình luận đã đăng
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;
