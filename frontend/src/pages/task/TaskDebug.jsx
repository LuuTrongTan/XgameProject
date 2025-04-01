import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import axios from "axios";
import { getSprintTasks } from "../../api/taskApi";

const TaskDebug = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [sprintId, setSprintId] = useState("");

  const fetchTasks = async () => {
    if (!projectId) {
      setError("Vui lòng nhập ID của dự án");
      return;
    }

    if (!sprintId) {
      setError("Vui lòng nhập ID của sprint");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Sử dụng API thông thường
      console.log(`Fetching tasks for project: ${projectId}, sprint: ${sprintId} with normal API`);
      const result = await getSprintTasks(projectId, sprintId);
      console.log("API Response:", result);
      setTasks(result.data || []);
      setRawResponse(JSON.stringify(result, null, 2));

      // Thử truy cập thông qua proxy của Vite
      try {
        console.log(
          `Fetching tasks with direct axios call to: /projects/${projectId}/sprints/${sprintId}/tasks`
        );
        const response = await axios.get(`/projects/${projectId}/sprints/${sprintId}/tasks`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("Direct Axios Response:", response.data);
      } catch (axiosError) {
        console.error("Direct axios error:", axiosError);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message || "Không thể tải dữ liệu công việc từ server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Debug Tasks API
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="flex-end" gap={2}>
            <TextField
              label="Project ID"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              variant="outlined"
              sx={{ minWidth: 250 }}
            />
            <TextField
              label="Sprint ID"
              value={sprintId}
              onChange={(e) => setSprintId(e.target.value)}
              variant="outlined"
              sx={{ minWidth: 250 }}
            />
            <Button variant="contained" onClick={fetchTasks} disabled={loading}>
              {loading ? "Đang tải..." : "Tải công việc"}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Danh sách công việc ({tasks.length})
          </Typography>

          {tasks.length > 0 ? (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Tiêu đề</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell>Độ ưu tiên</TableCell>
                    <TableCell>Người thực hiện</TableCell>
                    <TableCell>Ngày hết hạn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task._id}>
                      <TableCell>{task._id}</TableCell>
                      <TableCell>{task.title || task.name}</TableCell>
                      <TableCell>{task.status}</TableCell>
                      <TableCell>{task.priority}</TableCell>
                      <TableCell>
                        {task.assignees
                          ? task.assignees
                              .map((a) => a.fullName || a.name || a)
                              .join(", ")
                          : "Chưa gán"}
                      </TableCell>
                      <TableCell>
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("vi-VN")
                          : "Không có"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">Không có công việc nào được tìm thấy.</Alert>
          )}

          {rawResponse && (
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Phản hồi API gốc:
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 400, overflow: "auto" }}>
                <pre>{rawResponse}</pre>
              </Paper>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default TaskDebug;
