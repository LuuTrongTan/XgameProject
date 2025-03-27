import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { getSprints, deleteSprint } from "../../api/sprintApi";
import SprintFormDialog from "../../components/sprint/SprintFormDialog";
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

const SprintList = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching sprints for project ID:", projectId);
        const response = await getSprints(projectId);
        console.log("Sprint list response:", response);

        if (response.success && response.data) {
          setSprints(response.data);
        } else {
          setError(response.message || "Không thể tải danh sách sprint");
          setSprints([]);
        }
      } catch (err) {
        console.error("Error fetching sprints:", err);
        setError("Không thể tải danh sách sprint");
        setSprints([]);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchSprints();
    } else {
      setError("ID dự án không hợp lệ");
      setLoading(false);
    }
  }, [projectId, refresh]);

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  const handleOpenEditDialog = (sprint) => {
    setSelectedSprint(sprint);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedSprint(null);
  };

  const handleOpenDeleteDialog = (sprint) => {
    setSelectedSprint(sprint);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedSprint(null);
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;

    try {
      await deleteSprint(projectId, selectedSprint._id);
      enqueueSnackbar("Sprint đã được xóa thành công", { variant: "success" });
      setRefresh((prev) => prev + 1);
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể xóa sprint", {
        variant: "error",
      });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const handleFormSuccess = () => {
    setRefresh((prev) => prev + 1);
  };

  const handleSprintClick = (sprintId) => {
    navigate(`/projects/${projectId}/sprints/${sprintId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Danh sách Sprint
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Tạo sprint mới
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {sprints.length === 0 && !loading && !error ? (
        <Card sx={{ minWidth: 275, mb: 2 }}>
          <CardContent>
            <Typography variant="h6" align="center">
              Chưa có sprint nào. Hãy tạo mới!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {sprints.map((sprint) => (
            <Grid item xs={12} md={6} lg={4} key={sprint._id}>
              <Card
                sx={{
                  minWidth: 275,
                  mb: 2,
                  cursor: "pointer",
                  transition: "transform 0.3s, box-shadow 0.3s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 6,
                  },
                }}
                onClick={() => handleSprintClick(sprint._id)}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Typography variant="h6" component="div">
                      {sprint.name}
                    </Typography>
                    <Box>
                      <Tooltip title="Chỉnh sửa sprint">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditDialog(sprint);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Xóa sprint">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteDialog(sprint);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Chip
                    label={getStatusLabel(sprint.status)}
                    color={getStatusColor(sprint.status)}
                    size="small"
                    sx={{ mt: 1, mb: 2 }}
                  />

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {sprint.description}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 1,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Từ: {formatDate(sprint.startDate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đến: {formatDate(sprint.endDate)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <AssignmentIcon
                      fontSize="small"
                      sx={{ mr: 0.5, color: "text.secondary" }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {sprint.tasks ? sprint.tasks.length : 0} nhiệm vụ
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <SprintFormDialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        projectId={projectId}
        onSuccess={handleFormSuccess}
      />

      {selectedSprint && (
        <SprintFormDialog
          open={openEditDialog}
          onClose={handleCloseEditDialog}
          projectId={projectId}
          onSuccess={handleFormSuccess}
          sprint={selectedSprint}
          isEditing
        />
      )}

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xóa Sprint</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc chắn muốn xóa sprint "{selectedSprint?.name}"? Hành động
            này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Hủy</Button>
          <Button onClick={handleDeleteSprint} color="error">
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SprintList;
