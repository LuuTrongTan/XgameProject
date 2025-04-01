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

const TaskSelectionDialog = ({ open, onClose, onSubmit, projectId, sprintId }) => {
  const [tasks, setTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && projectId && sprintId) {
      fetchUnassignedTasks();
    }
  }, [open, projectId, sprintId]);

  const fetchUnassignedTasks = async () => {
    try {
      setLoading(true);
      const response = await getUnassignedTasks(projectId, sprintId);
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Chọn công việc</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Tìm kiếm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        <List>
          {filteredTasks.map((task) => (
            <ListItem
              key={task._id}
              button
              onClick={() => handleToggleTask(task._id)}
            >
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={selectedTasks.includes(task._id)}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button onClick={handleSubmit} variant="contained">
          Thêm vào Sprint
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskSelectionDialog;
