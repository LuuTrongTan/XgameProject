import React from 'react';
import { Tooltip, Badge, Box, CircularProgress, IconButton, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useWebSocket } from '../../contexts/WebSocketContext';

const WebSocketIndicator = () => {
  const { isConnected, reconnectAttempt, lastError, reconnect, joinedRooms } = useWebSocket();

  // Xử lý khi người dùng click vào nút kết nối lại
  const handleReconnectClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    reconnect();
  };

  // Tạo thông tin chi tiết trạng thái kết nối
  const getDetailedStatus = () => {
    if (isConnected) {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
            Đã kết nối WebSocket
          </Typography>
          {joinedRooms && joinedRooms.length > 0 && (
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              Đã tham gia: {joinedRooms.length} phòng
            </Typography>
          )}
        </>
      );
    } else if (lastError) {
      // Hiển thị thông báo lỗi tùy chỉnh dựa vào loại lỗi
      if (lastError.includes('JWT_SECRET is not defined')) {
        return (
          <>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
              Lỗi cấu hình server
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              JWT_SECRET không được định nghĩa
            </Typography>
            <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
              Vui lòng liên hệ quản trị viên
            </Typography>
          </>
        );
      }
      
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
            Mất kết nối
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
            Lỗi: {lastError}
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
            Nhấn vào biểu tượng để kết nối lại
          </Typography>
        </>
      );
    } else if (reconnectAttempt > 0) {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
            Đang thử kết nối lại
          </Typography>
          <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
            Lần thử: {reconnectAttempt}
          </Typography>
        </>
      );
    } else {
      return (
        <>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
            Đang kết nối...
          </Typography>
        </>
      );
    }
  };

  return (
    <Tooltip
      title={getDetailedStatus()}
      arrow
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mx: 1, position: 'relative' }}>
        {reconnectAttempt > 0 && !isConnected && (
          <CircularProgress
            size={24}
            thickness={5}
            sx={{
              position: 'absolute',
              color: 'warning.main',
              opacity: 0.7,
            }}
          />
        )}
        {!isConnected && (
          <IconButton 
            size="small" 
            onClick={handleReconnectClick}
            sx={{ 
              position: 'absolute',
              width: 24,
              height: 24,
              bgcolor: 'background.paper',
              '&:hover': {
                bgcolor: 'action.hover',
              },
              zIndex: 1,
              opacity: 0,
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 1,
              }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
        <Badge
          overlap="circular"
          variant="dot"
          color={isConnected ? "success" : "error"}
          sx={{
            '& .MuiBadge-badge': {
              width: 8,
              height: 8,
              borderRadius: '50%',
              boxShadow: '0 0 4px 1px rgba(0, 0, 0, 0.2)'
            }
          }}
        >
          {isConnected ? (
            <WifiIcon 
              fontSize="small" 
              color="action" 
              sx={{ 
                color: isConnected ? 'success.main' : 'error.main',
                opacity: 0.7
              }} 
            />
          ) : (
            <WifiOffIcon 
              fontSize="small" 
              color="error"
              sx={{ opacity: 0.7 }} 
            />
          )}
        </Badge>
      </Box>
    </Tooltip>
  );
};

export default WebSocketIndicator; 