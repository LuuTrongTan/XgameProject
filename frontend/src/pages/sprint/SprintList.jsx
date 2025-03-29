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
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { getSprints, deleteSprint, getProjectById } from "../../api/sprintApi";
import SprintFormDialog from "../../components/sprints/SprintFormDialog";
import { useSnackbar } from "notistack";
import BackButton from "../../components/common/BackButton";
import { useAuth } from "../../contexts/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import ActionButtons from "../../components/common/ActionButtons";

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
      return "primary";
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
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const { user } = useAuth();
  const { canCreateSprint, canEditSprint, canDeleteSprint, canViewSprint } =
    usePermissions();

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details
      try {
        const projectResponse = await getProjectById(projectId);
        setProject(projectResponse.data);
      } catch (projectErr) {
        console.error("Error fetching project:", projectErr);
      }

      // Fetch sprint list
      const sprintsResponse = await getSprints(projectId);
      if (sprintsResponse.success) {
        // Lọc những sprint mà người dùng có quyền xem
        const filteredSprints = sprintsResponse.data.filter((sprint) =>
          canViewSprint(sprint)
        );
        setSprints(filteredSprints);
      } else {
        setError(sprintsResponse.message || "Không thể tải danh sách sprint");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateDialog = () => {
    // Kiểm tra quyền trước khi mở dialog tạo sprint
    if (!canCreateSprint()) {
      enqueueSnackbar("Bạn không có quyền tạo sprint", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  const handleOpenEditDialog = (event, sprint) => {
    event.stopPropagation();

    // Kiểm tra quyền trước khi mở dialog sửa sprint
    if (!canEditSprint()) {
      enqueueSnackbar("Bạn không có quyền sửa sprint", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }

    setSelectedSprint(sprint);
    setOpenEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
    setSelectedSprint(null);
  };

  const handleOpenDeleteDialog = (event, sprint) => {
    event.stopPropagation();

    // Kiểm tra quyền trước khi mở dialog xóa sprint
    if (!canDeleteSprint()) {
      enqueueSnackbar("Bạn không có quyền xóa sprint", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }

    setSelectedSprint(sprint);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedSprint(null);
  };

  const handleDeleteSprint = async () => {
    if (!selectedSprint) return;

    // Kiểm tra quyền trước khi xóa sprint
    if (!canDeleteSprint()) {
      enqueueSnackbar("Bạn không có quyền xóa sprint", { variant: "error" });
      handleCloseDeleteDialog();
      return;
    }

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

  const handleBackClick = () => {
    navigate(`/projects/${projectId}`);
  };

  const hasManagePermission = (projectRole) => {
    return projectRole === "admin" || projectRole === "project_manager";
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
      <BackButton onClick={handleBackClick} />

      <Box
        sx={{ display: "flex", justifyContent: "space-between", mb: 4, mt: 2 }}
      >
        <Typography variant="h4" component="h1">
          Danh sách Sprint
        </Typography>
        {hasManagePermission(project?.projectRole) && (
          <Tooltip
            title={
              project?.projectRole === "member"
                ? "Bạn không có quyền tạo sprint mới"
                : ""
            }
          >
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
                disabled={project?.projectRole === "member"}
              >
                TẠO SPRINT MỚI
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {sprints.length === 0 && !loading && !error ? (
        <Card sx={{ minWidth: 275, mb: 2 }}>
          <CardContent>
            <Typography variant="h6" align="center" gutterBottom>
              Dự án chưa có sprint nào.
            </Typography>
            {hasManagePermission(project?.projectRole) && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Tooltip
                  title={
                    project?.projectRole === "member"
                      ? "Bạn không có quyền tạo sprint mới"
                      : ""
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateDialog}
                      disabled={project?.projectRole === "member"}
                    >
                      TẠO SPRINT ĐẦU TIÊN
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {sprints.map((sprint) => (
            <Grid item xs={12} sm={6} md={4} key={sprint._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  "&:hover": {
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleSprintClick(sprint._id)}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 2,
                    borderBottom: "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <Typography variant="h6">{sprint.name}</Typography>
                  {hasManagePermission(project?.projectRole) && (
                    <ActionButtons
                      canEdit={true}
                      canDelete={true}
                      onEdit={(e) => handleOpenEditDialog(e, sprint)}
                      onDelete={(e) => handleOpenDeleteDialog(e, sprint)}
                      useIcons={true}
                      size="small"
                    />
                  )}
                </Box>
                <CardContent sx={{ flexGrow: 1, pt: 1 }}>
                  <Chip
                    label={getStatusLabel(sprint.status)}
                    color={getStatusColor(sprint.status)}
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="body2" color="text.secondary">
                    {sprint.description}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 2,
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Từ: {formatDate(sprint.startDate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Đến: {formatDate(sprint.endDate)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
                    <AssignmentIcon
                      fontSize="small"
                      color="action"
                      sx={{ mr: 1 }}
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
          sprint={selectedSprint}
          onSuccess={handleFormSuccess}
          isEditing
        />
      )}

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa sprint "{selectedSprint?.name}"? Tất cả công
            việc trong sprint này sẽ bị gỡ khỏi sprint.
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
