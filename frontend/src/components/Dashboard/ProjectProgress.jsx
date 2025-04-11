import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Divider,
} from "@mui/material";

/**
 * Component hiển thị tiến độ dự án với progress bar
 */
const ProjectProgress = ({ projects = [] }) => {
  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Không có dự án nào đang hoạt động
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Đang hoạt động":
        return "primary";
      case "Hoàn thành":
        return "success";
      case "Đóng":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tiến độ dự án
        </Typography>

        {projects.map((project, index) => (
          <Box key={project._id || index} mb={index !== projects.length - 1 ? 2 : 0}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="subtitle2">{project.name}</Typography>
              <Chip 
                size="small" 
                label={project.status} 
                color={getStatusColor(project.status)} 
              />
            </Box>
            
            <Box display="flex" alignItems="center">
              <Box width="100%" mr={1}>
                <LinearProgress 
                  variant="determinate" 
                  value={project.progress || 0} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                    }
                  }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {project.progress || 0}%
              </Typography>
            </Box>
            
            {index !== projects.length - 1 && (
              <Divider sx={{ my: 2 }} />
            )}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProjectProgress; 