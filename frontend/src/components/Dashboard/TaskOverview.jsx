import React from "react";
import {
  Box,
  Typography,
  Chip,
  Grid,
  useTheme,
  alpha,
  Paper,
  Divider,
  Tooltip
} from "@mui/material";
import {
  AssignmentTurnedIn as DoneIcon,
  Assignment as TaskIcon,
  Timer as PendingIcon,
  Error as WarningIcon,
  Flag as FlagIcon,
  Circle as CircleIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";

// Component card cho số liệu thống kê 
const StatCardItem = ({ title, value, icon, color, delay }) => {
  const theme = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: delay }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: alpha(theme.palette[color].main, 0.03),
          border: `1px solid ${alpha(theme.palette[color].main, 0.08)}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: `0 5px 12px ${alpha(theme.palette[color].main, 0.06)}`,
            background: alpha(theme.palette[color].main, 0.05),
          }
        }}
      >
        <Box 
          sx={{ 
            mb: 1, 
            color: alpha(theme.palette[color].main, 0.8),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: alpha(theme.palette[color].main, 0.08),
          }}
        >
          {React.cloneElement(icon, { fontSize: 'small' })}
        </Box>
        <Typography variant="h5" fontWeight="medium" color={color}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {title}
        </Typography>
      </Paper>
    </motion.div>
  );
};

/**
 * Component hiển thị tổng quan về số lượng công việc theo trạng thái
 */
const TaskOverview = ({ stats }) => {
  const theme = useTheme();
  
  if (!stats) {
    return null;
  }

  const statsItems = [
    {
      title: "Tổng công việc",
      value: stats.total || 0,
      color: "primary",
      icon: <TaskIcon />,
      delay: 0.1
    },
    {
      title: "Đang thực hiện",
      value: stats.inProgress || 0,
      color: "info",
      icon: <CircleIcon />,
      delay: 0.2
    },
    {
      title: "Đang chờ",
      value: stats.pending || 0,
      color: "warning",
      icon: <PendingIcon />,
      delay: 0.3
    },
    {
      title: "Đã hoàn thành",
      value: stats.completed || 0,
      color: "success",
      icon: <DoneIcon />,
      delay: 0.4
    },
    {
      title: "Ưu tiên cao",
      value: stats.highPriority || 0,
      color: "secondary",
      icon: <FlagIcon />,
      delay: 0.5
    },
    {
      title: "Quá hạn",
      value: stats.overdue || 0,
      color: "error",
      icon: <WarningIcon />,
      delay: 0.6
    },
  ];

  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  return (
    <Box>
      <Box mb={2} display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle1" fontWeight="medium">
          Tóm tắt công việc
        </Typography>
        <Tooltip title={`${completionPercentage}% công việc đã hoàn thành`}>
          <Chip 
            label={`${completionPercentage}% hoàn thành`} 
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
        </Tooltip>
      </Box>
      
      <Grid container spacing={1.5} mb={2}>
        {statsItems.map((item) => (
          <Grid item xs={6} md={4} key={item.title}>
            <StatCardItem 
              title={item.title}
              value={item.value}
              icon={item.icon}
              color={item.color}
              delay={item.delay}
            />
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 1.5 }} />

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        <Box 
          sx={{ 
            py: 1.5, 
            px: 2, 
            borderRadius: 2, 
            bgcolor: alpha(theme.palette.grey[100], 0.5),
            border: `1px dashed ${alpha(theme.palette.grey[400], 0.2)}`,
          }}
        >
          <Typography variant="caption" gutterBottom color="text.secondary" fontWeight="medium">
            Tóm tắt nhanh
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', mr: 1 }}>
              <TaskIcon fontSize="small" sx={{ mr: 0.5, color: alpha(theme.palette.primary.main, 0.7), fontSize: '0.9rem' }} /> {stats.total} công việc
            </Box>
            |
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', mx: 1 }}>
              <CircleIcon fontSize="small" sx={{ mr: 0.5, color: alpha(theme.palette.info.main, 0.7), fontSize: '0.9rem' }} /> {stats.inProgress} đang làm
            </Box>
            |
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', mx: 1 }}>
              <PendingIcon fontSize="small" sx={{ mr: 0.5, color: alpha(theme.palette.warning.main, 0.7), fontSize: '0.9rem' }} /> {stats.pending} chờ
            </Box>
            |
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', ml: 1 }}>
              <DoneIcon fontSize="small" sx={{ mr: 0.5, color: alpha(theme.palette.success.main, 0.7), fontSize: '0.9rem' }} /> {stats.completed} hoàn thành
            </Box>
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};

export default TaskOverview;
