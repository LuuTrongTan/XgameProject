import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Typography,
  CircularProgress,
  Box,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TaskIcon from "@mui/icons-material/Task";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { useSnackbar } from "notistack";
import { addTaskToSprint } from "../../api/sprintApi";
import { getProjectTasks } from "../../api/projectApi";

// Function để lấy danh sách task của dự án đã được định nghĩa trong projectApi.js

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

const TaskSelectionDialog = ({
  open,
  onClose,
  projectId,
  sprintId,
  onSuccess,
  existingTaskIds = [],
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      fetchTasks();
    }
  }, [open, projectId]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = tasks.filter((task) =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTasks(filtered);
    } else {
      setFilteredTasks(tasks);
    }
  }, [searchTerm, tasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Sử dụng API từ projectApi
      const tasks = await getProjectTasks(projectId);
      if (tasks && Array.isArray(tasks)) {
        // Lọc ra các task chưa được thêm vào sprint
        const availableTasks = tasks.filter(
          (task) => !existingTaskIds.includes(task._id)
        );
        setTasks(availableTasks);
        setFilteredTasks(availableTasks);
        setSelectedTaskIds([]);
        setError(null);
      } else {
        setTasks([]);
        setFilteredTasks([]);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("Không thể tải danh sách nhiệm vụ");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleToggleTask = (taskId) => {
    setSelectedTaskIds((prevSelected) => {
      if (prevSelected.includes(taskId)) {
        return prevSelected.filter((id) => id !== taskId);
      } else {
        return [...prevSelected, taskId];
      }
    });
  };

  const handleSubmit = async () => {
    if (selectedTaskIds.length === 0) {
      enqueueSnackbar("Vui lòng chọn ít nhất một nhiệm vụ", {
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Thêm từng task vào sprint
      for (const taskId of selectedTaskIds) {
        await addTaskToSprint(projectId, sprintId, taskId);
      }

      enqueueSnackbar(`Đã thêm ${selectedTaskIds.length} nhiệm vụ vào sprint`, {
        variant: "success",
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      enqueueSnackbar(error.message || "Không thể thêm nhiệm vụ vào sprint", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Thêm nhiệm vụ vào Sprint
        <IconButton
          aria-label="close"
          onClick={onClose}
          disabled={submitting}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          placeholder="Tìm kiếm nhiệm vụ..."
          value={searchTerm}
          onChange={handleSearchChange}
          margin="normal"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" sx={{ my: 2 }}>
            {error}
          </Typography>
        ) : filteredTasks.length === 0 ? (
          <Typography align="center" sx={{ my: 2 }}>
            {searchTerm
              ? "Không tìm thấy nhiệm vụ phù hợp"
              : "Không có nhiệm vụ nào có thể thêm"}
          </Typography>
        ) : (
          <List sx={{ pt: 1 }}>
            {filteredTasks.map((task) => (
              <React.Fragment key={task._id}>
                <ListItem
                  button
                  onClick={() => handleToggleTask(task._id)}
                  disabled={submitting}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedTaskIds.includes(task._id)}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemIcon>{getTaskStatusIcon(task.status)}</ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      task.description
                        ? task.description.substring(0, 60) +
                          (task.description.length > 60 ? "..." : "")
                        : ""
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            px: 2,
          }}
        >
          <Typography variant="body2">
            Đã chọn: {selectedTaskIds.length} nhiệm vụ
          </Typography>
          <Box>
            <Button onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button
              onClick={handleSubmit}
              color="primary"
              disabled={submitting || selectedTaskIds.length === 0}
              variant="contained"
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? "Đang thêm..." : "Thêm vào Sprint"}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default TaskSelectionDialog;
