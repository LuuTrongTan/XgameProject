import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, CircularProgress, Paper } from '@mui/material';
import PropTypes from 'prop-types';
import { getSprints } from '../../api/sprintApi';

/**
 * Component lựa chọn sprint
 * @param {Object} props - Props của component
 * @param {string} props.currentSprintId - ID của sprint hiện tại
 * @param {Function} props.onChange - Hàm xử lý khi người dùng chọn sprint khác
 * @param {string} [props.projectId] - ID của project (tùy chọn)
 */
const SprintSelector = ({ currentSprintId, onChange, projectId }) => {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        setLoading(true);
        const response = await getSprints(projectId);
        
        // Kiểm tra cấu trúc response
        let sprintList = [];
        if (Array.isArray(response)) {
          sprintList = response;
        } else if (response && Array.isArray(response.data)) {
          sprintList = response.data;
        } else if (response && response.data && Array.isArray(response.data.sprints)) {
          sprintList = response.data.sprints;
        }
        
        // Sắp xếp sprint theo thời gian bắt đầu, sprint mới nhất lên đầu
        sprintList.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        setSprints(sprintList);
        setError(null);
      } catch (err) {
        console.error('Lỗi khi tải danh sách sprint:', err);
        setError('Không thể tải danh sách sprint');
      } finally {
        setLoading(false);
      }
    };

    fetchSprints();
  }, [projectId]);

  const handleChange = (event) => {
    const newSprintId = event.target.value;
    if (onChange) {
      onChange(newSprintId);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Đang tải danh sách sprint...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.dark' }}>
        <Typography variant="body2">{error}</Typography>
      </Paper>
    );
  }

  if (sprints.length === 0) {
    return (
      <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.dark' }}>
        <Typography variant="body2">Không có sprint nào. Vui lòng tạo sprint mới.</Typography>
      </Paper>
    );
  }

  return (
    <FormControl fullWidth variant="outlined" size="small">
      <InputLabel>Sprint</InputLabel>
      <Select
        value={currentSprintId || ''}
        onChange={handleChange}
        label="Sprint"
      >
        {sprints.map((sprint) => (
          <MenuItem key={sprint._id} value={sprint._id}>
            <Box>
              <Typography variant="body1">{sprint.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

SprintSelector.propTypes = {
  currentSprintId: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  projectId: PropTypes.string
};

export default SprintSelector; 