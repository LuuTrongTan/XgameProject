import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import { getUnassignedTasks } from "../../api/taskApi";

const TaskSelectionDialog = ({ open, onClose, onSubmit, projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchUnassignedTasks();
    }
  }, [open, projectId]);

  const fetchUnassignedTasks = async () => {
    try {
      setLoading(true);
      const response = await getUnassignedTasks(projectId);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching unassigned tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = (taskId) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSubmit = () => {
    onSubmit(selectedTasks);
    setSelectedTasks([]);
    setSearchTerm("");
  };

  const handleClose = () => {
    setSelectedTasks([]);
    setSearchTerm("");
    onClose();
  };

  const filteredTasks = tasks.filter((task) =>
    task.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Chọn công việc cho Sprint</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Tìm kiếm công việc"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            margin="normal"
          />
        </Box>
        {loading ? (
          <Typography>Đang tải...</Typography>
        ) : tasks.length === 0 ? (
          <Typography>Không có công việc nào chưa được phân công</Typography>
        ) : (
          <List>
            {filteredTasks.map((task) => (
              <ListItem
                key={task.id}
                button
                onClick={() => handleToggleTask(task.id)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedTasks.includes(task.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText
                  primary={task.name}
                  secondary={task.description}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={selectedTasks.length === 0}
        >
          Thêm công việc ({selectedTasks.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskSelectionDialog;
