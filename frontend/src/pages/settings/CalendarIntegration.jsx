import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  CalendarToday as CalendarIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import API from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';

const CalendarIntegration = () => {
  const [loading, setLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [settings, setSettings] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await API.get('/settings');
        
        if (response.data && response.data.success) {
          setSettings(response.data.data);
          
          // Kiểm tra trạng thái kết nối
          setGoogleConnected(
            response.data.data?.calendarIntegration?.googleCalendar?.connected || false
          );
          setOutlookConnected(
            response.data.data?.calendarIntegration?.outlookCalendar?.connected || false
          );
        }
      } catch (error) {
        console.error('Lỗi khi tải cài đặt:', error);
        enqueueSnackbar('Không thể tải cài đặt. Vui lòng thử lại sau.', { 
          variant: 'error' 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [enqueueSnackbar]);

  const handleConnectGoogle = async () => {
    try {
      setLoading(true);
      
      // Trong thực tế, cần thiết lập OAuth2 flow đầy đủ
      // Đây chỉ là mô phỏng cho demo để có thông tin đúng định dạng
      
      // Mô phỏng current time và expiry time
      const currentTime = new Date();
      const expiryTime = new Date(currentTime.getTime() + 3600 * 1000); // +1 giờ
      
      const mockResponse = {
        connected: true,
        accessToken: 'ya29.mock_access_token_' + currentTime.getTime(),
        refreshToken: '1//mock_refresh_token_' + currentTime.getTime(),
        expiryDate: expiryTime.getTime() // Epoch time in milliseconds
      };
      
      console.log('Đang kết nối với Google Calendar...', {
        accessToken: mockResponse.accessToken.substring(0, 15) + '...',
        refreshToken: mockResponse.refreshToken.substring(0, 15) + '...',
        expiryDate: new Date(mockResponse.expiryDate).toISOString()
      });
      
      // Cập nhật trạng thái kết nối
      const response = await API.put('/settings/calendar', {
        provider: 'googleCalendar',
        connected: mockResponse.connected,
        accessToken: mockResponse.accessToken,
        refreshToken: mockResponse.refreshToken,
        expiryDate: mockResponse.expiryDate
      });
      
      console.log('Kết quả kết nối:', response.data);
      
      if (response.data && response.data.success) {
        setGoogleConnected(true);
        enqueueSnackbar('Đã kết nối thành công với Google Calendar', { 
          variant: 'success' 
        });
      } else {
        throw new Error(response.data?.message || 'Lỗi không xác định');
      }
    } catch (error) {
      console.error('Lỗi khi kết nối Google Calendar:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Không thể kết nối với Google Calendar. Vui lòng thử lại sau.';
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setLoading(true);
      
      const response = await API.delete('/settings/calendar/googleCalendar');
      
      if (response.data && response.data.success) {
        setGoogleConnected(false);
        enqueueSnackbar('Đã ngắt kết nối Google Calendar', { 
          variant: 'success' 
        });
      } else {
        throw new Error(response.data?.message || 'Lỗi không xác định');
      }
    } catch (error) {
      console.error('Lỗi khi ngắt kết nối Google Calendar:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Không thể ngắt kết nối Google Calendar. Vui lòng thử lại sau.';
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectOutlook = async () => {
    enqueueSnackbar('Tính năng đồng bộ với Microsoft Outlook đang được phát triển', { 
      variant: 'info' 
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tích hợp lịch
      </Typography>
      <Typography variant="body1" paragraph>
        Kết nối với lịch để đồng bộ các công việc của bạn
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GoogleIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Google Calendar</Typography>
                {googleConnected && (
                  <Chip 
                    icon={<CheckIcon />} 
                    label="Đã kết nối" 
                    color="success" 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Đồng bộ task với Google Calendar để quản lý lịch làm việc hiệu quả.
              </Typography>
              
              {googleConnected ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Đã kết nối với Google Calendar. Bạn có thể đồng bộ task từ form tạo/chỉnh sửa task.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Kết nối với Google Calendar để đồng bộ task với lịch của bạn.
                </Alert>
              )}
            </CardContent>
            <CardActions>
              {googleConnected ? (
                <Button
                  startIcon={<DeleteIcon />}
                  color="error"
                  onClick={handleDisconnectGoogle}
                >
                  Ngắt kết nối
                </Button>
              ) : (
                <Button
                  startIcon={<GoogleIcon />}
                  variant="contained"
                  onClick={handleConnectGoogle}
                >
                  Kết nối Google Calendar
                </Button>
              )}
              
              {googleConnected && (
                <Tooltip title="Đồng bộ lại">
                  <IconButton color="primary" size="small">
                    <SyncIcon />
                  </IconButton>
                </Tooltip>
              )}
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MicrosoftIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Microsoft Outlook</Typography>
                {outlookConnected && (
                  <Chip 
                    icon={<CheckIcon />} 
                    label="Đã kết nối" 
                    color="success" 
                    size="small" 
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Đồng bộ task với Microsoft Outlook để theo dõi công việc.
              </Typography>
              
              <Alert severity="warning" sx={{ mb: 2 }}>
                Tính năng đồng bộ với Microsoft Outlook đang được phát triển.
              </Alert>
            </CardContent>
            <CardActions>
              <Button
                startIcon={<MicrosoftIcon />}
                variant="contained"
                onClick={handleConnectOutlook}
                disabled
              >
                Kết nối Microsoft Outlook
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Hướng dẫn
        </Typography>
        <Typography variant="body2" paragraph>
          <b>1.</b> Kết nối với dịch vụ lịch bằng cách nhấp vào nút "Kết nối" tương ứng.
        </Typography>
        <Typography variant="body2" paragraph>
          <b>2.</b> Khi tạo hoặc chỉnh sửa task, bật tùy chọn "Đồng bộ với lịch" và chọn loại lịch.
        </Typography>
        <Typography variant="body2" paragraph>
          <b>3.</b> Task sẽ được đồng bộ tự động và hiển thị trong lịch của bạn.
        </Typography>
      </Box>
    </Box>
  );
};

export default CalendarIntegration; 