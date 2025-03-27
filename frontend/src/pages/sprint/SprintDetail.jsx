import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Paper,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TaskIcon from "@mui/icons-material/Task";
import AddIcon from "@mui/icons-material/Add";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  getSprintById,
  deleteSprint,
  removeTaskFromSprint,
} from "../../api/sprintApi";
import SprintFormDialog from "../../components/sprint/SprintFormDialog";
import TaskSelectionDialog from "../../components/sprint/TaskSelectionDialog";
import { useSnackbar } from "notistack";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const getStatusColor = (status) => {
  switch (status) {
    case "planning":
      return "info";
    case "active":
      return "success";
    case "completed":
      return "secondary";
    default:
      return "default";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "planning":
      return "Lên kế hoạch";
    case "active":
      return "Đang thực hiện";
    case "completed":
      return "Hoàn thành";
    default:
      return status;
  }
};

const getTaskStatusIcon = (status) => {
  switch (status) {
    case "todo":
      return <PendingIcon color="info" />;
    case "in_progress":
      return <AccessTimeIcon color="warning" />;
    case "done":
      return <CheckCircleIcon color="success" />;
    default:
      return <TaskIcon />;
  }
};

const getTaskStatusText = (status) => {
  switch (status) {
    case "todo":
      return "Cần làm";
    case "in_progress":
      return "Đang làm";
    case "done":
      return "Hoàn thành";
    default:
      return status;
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case "low":
      return "success";
    case "medium":
      return "warning";
    case "high":
      return "error";
    default:
      return "default";
  }
};

const getPriorityText = (priority) => {
  switch (priority) {
    case "low":
      return "Thấp";
    case "medium":
      return "Trung bình";
    case "high":
      return "Cao";
    default:
      return priority;
  }
};

const SprintDetail = () => {
  const { projectId, sprintId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sprint, setSprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openAddTaskDialog, setOpenAddTaskDialog] = useState(false);
  const [openRemoveTaskDialog, setOpenRemoveTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const fetchSprintDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getSprintById(projectId, sprintId);
        setSprint(response.data);
      } catch (err) {
        console.error("Error fetching sprint details:", err);
        setError("Không thể tải thông tin sprint");
      } finally {
        setLoading(false);
      }
    };

    fetchSprintDetails();
  }, [projectId, sprintId, refresh]);

  const handleOpenEditDialog = () => {
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };

  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleOpenAddTaskDialog = () => {
    setOpenAddTaskDialog(true);
  };

  const handleCloseAddTaskDialog = () => {
    setOpenAddTaskDialog(false);
  };

  const handleOpenRemoveTaskDialog = (task) => {
    setSelectedTask(task);
    setOpenRemoveTaskDialog(true);
  };

  const handleCloseRemoveTaskDialog = () => {
    setOpenRemoveTaskDialog(false);
    setSelectedTask(null);
  };

  const handleDeleteSprint = async () => {
    try {
      await deleteSprint(projectId, sprintId);
      enqueueSnackbar("Sprint đã được xóa thành công", { variant: "success" });
      navigate(`/projects/${projectId}/sprints`);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể xóa sprint", {
        variant: "error",
      });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleRemoveTask = async () => {
    if (!selectedTask) return;

    try {
      await removeTaskFromSprint(projectId, sprintId, selectedTask._id);
      enqueueSnackbar("Task đã được gỡ khỏi sprint thành công", {
        variant: "success",
      });
      setRefresh((prev) => prev + 1);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể gỡ task khỏi sprint", {
        variant: "error",
      });
    } finally {
      handleCloseRemoveTaskDialog();
    }
  };

  const handleFormSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleTaskClick = (taskId) => {
    navigate(`/projects/${projectId}/tasks/${taskId}`);
  };

  const goBack = () => {
    navigate(`/projects/${projectId}/sprints`);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={goBack} sx={{ mt: 2 }}>
          Quay lại danh sách sprint
        </Button>
      </Box>
    );
  }

  if (!sprint) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Không tìm thấy thông tin sprint</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={goBack} sx={{ mt: 2 }}>
          Quay lại danh sách sprint
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={goBack}>
          Quay lại
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          {sprint.name}
        </Typography>
        <Box>
          <Tooltip title="Chỉnh sửa sprint">
            <IconButton
              color="primary"
              onClick={handleOpenEditDialog}
              sx={{ mr: 1 }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa sprint">
            <IconButton color="error" onClick={handleOpenDeleteDialog}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Mô tả
            </Typography>
            <Typography variant="body1" paragraph>
              {sprint.description}
            </Typography>

            {sprint.goal && (
              <>
                <Typography variant="h6" gutterBottom>
                  Mục tiêu
                </Typography>
                <Typography variant="body1" paragraph>
                  {sprint.goal}
                </Typography>
              </>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Thông tin Sprint
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Trạng thái
                    </Typography>
                    <Chip
                      label={getStatusLabel(sprint.status)}
                      color={getStatusColor(sprint.status)}
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Thời gian
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(sprint.startDate)} -{" "}
                      {formatDate(sprint.endDate)}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Số lượng task
                    </Typography>
                    <Typography variant="body1">
                      {sprint.tasks ? sprint.tasks.length : 0} nhiệm vụ
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Danh sách nhiệm vụ</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenAddTaskDialog}
        >
          Thêm nhiệm vụ
        </Button>
      </Box>

      {!sprint.tasks || sprint.tasks.length === 0 ? (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="body1" align="center">
              Chưa có nhiệm vụ nào trong sprint này. Hãy thêm nhiệm vụ!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List component={Paper} elevation={2}>
          {sprint.tasks.map((task) => (
            <React.Fragment key={task._id}>
              <ListItem
                secondaryAction={
                  <Tooltip title="Gỡ khỏi sprint">
                    <IconButton
                      edge="end"
                      color="error"
                      onClick={() => handleOpenRemoveTaskDialog(task)}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Tooltip>
                }
                sx={{
                  cursor: "pointer",
                  "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                }}
                onClick={() => handleTaskClick(task._id)}
              >
                <ListItemIcon>{getTaskStatusIcon(task.status)}</ListItemIcon>
                <ListItemText
                  primary={task.title}
                  secondary={
                    <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                      <Chip
                        label={getTaskStatusText(task.status)}
                        size="small"
                        color={
                          task.status === "done"
                            ? "success"
                            : task.status === "in_progress"
                            ? "warning"
                            : "default"
                        }
                      />
                      <Chip
                        label={getPriorityText(task.priority)}
                        size="small"
                        color={getPriorityColor(task.priority)}
                      />
                    </Box>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {sprint && (
        <SprintFormDialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          projectId={projectId}
          onSuccess={handleFormSuccess}
          sprint={sprint}
          isEditing
        />
      )}

      <TaskSelectionDialog
        open={openAddTaskDialog}
        onClose={handleCloseAddTaskDialog}
        projectId={projectId}
        sprintId={sprintId}
        onSuccess={handleFormSuccess}
        existingTaskIds={sprint?.tasks?.map((task) => task._id) || []}
      />

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xóa Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa sprint "{sprint?.name}"? Tất cả các nhiệm
            vụ sẽ được gỡ khỏi sprint này, nhưng không bị xóa. Hành động này
            không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Hủy</Button>
          <Button onClick={handleDeleteSprint} color="error">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openRemoveTaskDialog} onClose={handleCloseRemoveTaskDialog}>
        <DialogTitle>Gỡ nhiệm vụ khỏi Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn gỡ nhiệm vụ "{selectedTask?.title}" khỏi
            sprint này?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRemoveTaskDialog}>Hủy</Button>
          <Button onClick={handleRemoveTask} color="error">
            Gỡ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SprintDetail;
