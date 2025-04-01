import React from 'react';
import { Tooltip, Badge, Box, CircularProgress } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useWebSocket } from '../../contexts/WebSocketContext';

const WebSocketIndicator = () => {
  const { isConnected, reconnectAttempt, lastError } = useWebSocket();

  return (
    <Tooltip
      title={
        isConnected
          ? `Đã kết nối đến WebSocket`
          : lastError
          ? `Mất kết nối: ${lastError}`
          : reconnectAttempt > 0
          ? `Đang thử kết nối lại (lần ${reconnectAttempt})`
          : "Đang kết nối..."
      }
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