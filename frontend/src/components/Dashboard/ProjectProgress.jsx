import React from "react";
import {
  Box,
  Typography,
  LinearProgress,
  Chip,
  Divider,
  Avatar,
  useTheme,
  alpha,
  Tooltip,
  IconButton
} from "@mui/material";
import {
  ArrowForward as ArrowForwardIcon,
  Folder as FolderIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  DonutLarge as DonutLargeIcon,
  Edit as EditIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

/**
 * Component hiển thị tiến độ dự án với progress bar
 */
const ProjectProgress = ({ projects = [] }) => {
  const theme = useTheme();
  
  // Debug thông tin về dự án
  console.log('ProjectProgress component received projects:', projects);
  console.log('ProjectProgress projects count:', projects.length);
  
  if (projects?.length > 0) {
    // Log chi tiết cho từng dự án
    projects.forEach((project, index) => {
      console.log(`Project ${index + 1}:`, {
        id: project._id,
        name: project.name,
        status: project.status,
        progress: project.progress || 0
      });
    });
  }

  if (!projects || projects.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <FolderIcon sx={{ fontSize: 40, color: alpha(theme.palette.grey[500], 0.2), mb: 1.5 }} />
          <Typography variant="body2" color="text.secondary">
            Không có dự án nào đang hoạt động
          </Typography>
        </motion.div>
      </Box>
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "Đang hoạt động":
        return <DonutLargeIcon fontSize="small" />;
      case "Hoàn thành":
        return <CheckCircleIcon fontSize="small" />;
      case "Đóng":
        return <CancelIcon fontSize="small" />;
      default:
        return <FolderIcon fontSize="small" />;
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return theme.palette.success.main;
    if (progress >= 50) return theme.palette.primary.main;
    if (progress >= 30) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return (
    <Box>
      <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" fontWeight="medium">
          Tiến độ dự án
        </Typography>
        <Chip 
          label={`${projects.length} dự án`} 
          color="primary" 
          size="small"
          sx={{ 
            fontWeight: 'medium', 
            borderRadius: 1.5,
            height: 22,
            px: 0.5,
            fontSize: '0.7rem'
          }} 
        />
      </Box>

      {projects.map((project, index) => (
        <motion.div
          key={project._id || index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.08 }}
        >
          <Box 
            sx={{ 
              mb: 1.5, 
              p: 1.5, 
              borderRadius: 2,
              transition: 'all 0.2s ease',
              background: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, 
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                background: alpha(theme.palette.background.paper, 0.8),
              } 
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Box display="flex" alignItems="center">
                <Avatar 
                  sx={{ 
                    width: 30, 
                    height: 30,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: alpha(theme.palette.primary.main, 0.8),
                    mr: 1,
                    fontSize: 14,
                    fontWeight: 'medium'
                  }}
                >
                  {project.name?.charAt(0) || 'P'}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {project.name}
                  </Typography>
                  <Chip 
                    icon={getStatusIcon(project.status)}
                    label={project.status} 
                    color={getStatusColor(project.status)}
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.65rem',
                      '& .MuiChip-label': { px: 0.8 },
                      '& .MuiChip-icon': { fontSize: 12 }
                    }}
                  />
                </Box>
              </Box>
              <Tooltip title="Xem chi tiết dự án">
                <IconButton 
                  size="small" 
                  component={Link} 
                  to={`/projects/${project._id}`}
                  sx={{ 
                    width: 24,
                    height: 24,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: alpha(theme.palette.primary.main, 0.8),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                    }
                  }}
                >
                  <ArrowForwardIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Box display="flex" alignItems="center">
              <Box width="100%" mr={1}>
                <Tooltip title={`${project.progress || 0}% hoàn thành`}>
                  <Box sx={{ width: '100%', position: 'relative' }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={project.progress || 0} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: alpha(getProgressColor(project.progress || 0), 0.1),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: alpha(getProgressColor(project.progress || 0), 0.8),
                        }
                      }} 
                    />
                  </Box>
                </Tooltip>
              </Box>
              <Typography 
                variant="caption" 
                fontWeight="medium" 
                sx={{ 
                  minWidth: 35, 
                  textAlign: 'right',
                  color: alpha(getProgressColor(project.progress || 0), 0.8)
                }}
              >
                {project.progress || 0}%
              </Typography>
            </Box>
          </Box>
        </motion.div>
      ))}
    </Box>
  );
};

export default ProjectProgress; 