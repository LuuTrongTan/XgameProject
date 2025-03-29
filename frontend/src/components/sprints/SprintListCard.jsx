import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { getSprints } from "../../api/sprintApi";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuth } from "../../contexts/AuthContext";

const SprintListCard = ({ projectId }) => {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { canViewProject, isAdmin, isProjectManager } = usePermissions();

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setLoading(true);
        console.log("=== DEBUG SprintListCard Component ===");
        console.log("ProjectId:", projectId);
        console.log("Current user:", user);
        console.log("=== DEBUG User Roles ===");
        console.log("Is Admin:", isAdmin);
        console.log("Is Project Manager:", isProjectManager);
        console.log("Can View Project:", canViewProject(projectId));
        console.log("User ID:", user?.id);

        // Kiểm tra quyền xem dự án
        if (!canViewProject(projectId)) {
          setError("Bạn không có quyền xem danh sách sprint của dự án này");
          setLoading(false);
          return;
        }

        const result = await getSprints(projectId);
        console.log("=== DEBUG Sprint Data ===");
        console.log("Raw sprints result:", result);
        console.log("Sprints data array:", result.data);
        console.log("Number of sprints:", result.data?.length);
        console.log("Sprint details:", JSON.stringify(result.data, null, 2));

        if (result.success) {
          // Lọc sprint dựa trên role và membership
          let filteredSprints = result.data || [];

          // Nếu không phải admin hoặc project manager, chỉ hiển thị sprint mà user là member
          if (!isAdmin && !isProjectManager) {
            console.log("=== DEBUG Sprint Filtering ===");
            console.log(
              "User is not admin/manager, filtering sprints by membership"
            );
            filteredSprints = filteredSprints.filter((sprint) => {
              const isMember = sprint.members.some(
                (member) => member.user._id === user.id
              );
              console.log(
                `Sprint ${sprint.name}: User is member = ${isMember}`
              );
              return isMember;
            });
          } else {
            console.log("User is admin/manager, showing all sprints");
          }

          console.log("Filtered sprints:", filteredSprints);
          setSprints(filteredSprints);
        } else {
          setError(result.message);
          console.error("Error fetching sprints:", result.message);
        }

        console.log("=== END DEBUG SprintListCard Component ===");
      } catch (error) {
        console.error("Error in fetchSprints:", error);
        setError("Không thể tải danh sách sprint");
      } finally {
        setLoading(false);
      }
    };

    if (projectId && user) {
      fetchSprints();
    }
  }, [projectId, user, canViewProject, isAdmin, isProjectManager]);

  // Hiển thị loading
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="70vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ mt: 2 }}
        >
          Thử lại
        </Button>
      </Box>
    );
  }

  console.log("=== DEBUG Render SprintListCard ===");
  console.log("Current sprints state:", sprints);
  console.log("Is loading:", loading);
  console.log("Error state:", error);

  return (
    <Box>
      {sprints.length === 0 ? (
        <Box p={3} textAlign="center">
          <Typography variant="h6" color="text.secondary">
            {isAdmin || isProjectManager
              ? "Dự án chưa có sprint nào"
              : "Bạn chưa được thêm vào sprint nào"}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sprints.map((sprint) => (
            <Grid item xs={12} md={6} lg={4} key={sprint._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{sprint.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sprint.description}
                  </Typography>
                  <Box mt={2}>
                    <Typography variant="body2">
                      Ngày bắt đầu:{" "}
                      {new Date(sprint.startDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body2">
                      Ngày kết thúc:{" "}
                      {new Date(sprint.endDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SprintListCard;
