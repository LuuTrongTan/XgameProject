import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Avatar,
  Tooltip,
  Divider,
  CardActionArea,
} from "@mui/material";
import {
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Flag as FlagIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getUserSprints } from "../../api/sprintApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate } from "../../utils/format";
import CustomAvatar from "../../components/common/Avatar";

const AllSprints = () => {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserSprints();
  }, []);

  const fetchUserSprints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserSprints();
      
      if (response.success) {
        setSprints(response.data);
      } else {
        setError(response.message || "Không thể tải danh sách sprint");
      }
    } catch (err) {
      console.error("Error fetching sprints:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "planning":
        return "#ff9800"; // Amber
      case "active":
        return "#4caf50"; // Green
      case "completed":
        return "#2196f3"; // Blue
      default:
        return "#9e9e9e"; // Grey
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "planning":
        return "Lập kế hoạch";
      case "active":
        return "Đang hoạt động";
      case "completed":
        return "Hoàn thành";
      default:
        return status;
    }
  };

  const handleSprintClick = (projectId, sprintId) => {
    navigate(`/projects/${projectId}/sprints/${sprintId}`);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={fetchUserSprints}
          sx={{ mt: 2 }}
        >
          Thử lại
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Sprint của bạn
      </Typography>

      {sprints.length === 0 ? (
        <Alert severity="info">
          Bạn chưa tham gia sprint nào. Sprint sẽ hiển thị ở đây khi bạn được thêm vào.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {sprints.map((sprint) => (
            <Grid item xs={12} sm={6} md={4} key={sprint._id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => handleSprintClick(sprint.project._id, sprint._id)}
                  sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={getStatusLabel(sprint.status)}
                        sx={{
                          bgcolor: getStatusColor(sprint.status),
                          color: 'white',
                          fontWeight: 'medium',
                          mb: 1
                        }}
                      />
                      <Tooltip title={`Sprint ID: ${sprint._id}`}>
                        <Typography variant="caption" color="text.secondary">
                          {sprint._id.substring(0, 6)}
                        </Typography>
                      </Tooltip>
                    </Box>

                    <Typography 
                      variant="h6" 
                      component="div" 
                      sx={{ 
                        fontWeight: 'bold',
                        mb: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        minHeight: '60px'
                      }}
                    >
                      {sprint.name}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Tooltip title="Dự án">
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          <CustomAvatar 
                            project={sprint.project} 
                            sx={{ width: 24, height: 24, mr: 0.5 }} 
                            variant="rounded" 
                          />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '140px'
                            }}
                          >
                            {sprint.project.name}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 2,
                        minHeight: '40px'
                      }}
                    >
                      {sprint.description || "Không có mô tả"}
                    </Typography>

                    <Box sx={{ mt: 'auto' }}>
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <DateRangeIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            <AssignmentIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-top' }} />
                            Công việc: {sprint.taskCount?.completed || 0}/{sprint.taskCount?.total || 0}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(
                              (sprint.taskCount?.total
                                ? (sprint.taskCount?.completed / sprint.taskCount?.total) * 100
                                : 0)
                            )}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={
                            sprint.taskCount?.total
                              ? (sprint.taskCount?.completed / sprint.taskCount?.total) * 100
                              : 0
                          }
                          color={sprint.taskCount?.completed === sprint.taskCount?.total ? "success" : "primary"}
                          sx={{ height: 5, borderRadius: 5 }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
                        <Tooltip title="Người tạo">
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                            <Avatar
                              src={sprint.createdBy?.avatar}
                              sx={{ width: 20, height: 20, mr: 0.5 }}
                            >
                              {sprint.createdBy?.name?.[0]}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {sprint.createdBy?.name || "Không xác định"}
                            </Typography>
                          </Box>
                        </Tooltip>
                        
                        <Tooltip title="Thành viên">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {sprint.members?.length || 0} thành viên
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AllSprints; 