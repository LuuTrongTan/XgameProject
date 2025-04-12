/**
 * Navbar Component - Thanh điều hướng chính của ứng dụng
 * Hiển thị logo, thanh tìm kiếm, thông báo và thông tin người dùng
 * Layout: Logo (trái) | Search bar (giữa) | Notifications + User menu (phải)
 */

import React, { useState, useEffect } from "react";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  InputBase,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Button,
  CircularProgress,
} from "@mui/material";

// Material Icons
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import MoreVertIcon from "@mui/icons-material/MoreVert";

// React Router và Context
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import WebSocketIndicator from "./WebSocketIndicator";

// API
import { getNotifications, markAsRead } from "../../api/notificationApi";

// Socket
import { useWebSocket } from "../../contexts/WebSocketContext";

/**
 * @param {Object} props - Component props
 * @param {Function} props.onDrawerToggle - Hàm xử lý đóng/mở sidebar
 */
const Navbar = ({ onDrawerToggle }) => {
  // Hooks và state management
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { socket } = useWebSocket();
  const [anchorEl, setAnchorEl] = useState(null); // State cho user menu
  const [notificationEl, setNotificationEl] = useState(null); // State cho notification menu
  const [notificationCount, setNotificationCount] = useState(0); // Số lượng thông báo chưa đọc
  const [notifications, setNotifications] = useState([]); // Danh sách thông báo
  const [loadingNotifications, setLoadingNotifications] = useState(false); // Trạng thái loading

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
    
    // Setup socket listener for new notifications
    if (socket) {
      socket.on("new_notification", (data) => {
        setNotificationCount(prev => prev + 1);
        setNotifications(prev => [data.notification, ...prev].slice(0, 5));
      });
      
      socket.on("notifications_updated", (data) => {
        setNotificationCount(data.unreadCount);
      });
    }
    
    return () => {
      if (socket) {
        socket.off("new_notification");
        socket.off("notifications_updated");
      }
    };
  }, [socket]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const result = await getNotifications({ limit: 5, unreadOnly: false });
      if (result.success) {
        setNotifications(result.data.notifications);
        setNotificationCount(result.data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      const result = await markAsRead({ all: true });
      if (result.success) {
        setNotificationCount(0);
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        );
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  // Open notification menu
  const handleNotificationClick = (event) => {
    setNotificationEl(event.currentTarget);
  };

  // Close notification menu
  const handleNotificationClose = () => {
    setNotificationEl(null);
  };

  // Xử lý đóng/mở user menu
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Xử lý đăng xuất
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
      handleClose();
    } catch (error) {
      console.error("Đăng xuất thất bại:", error);
    }
  };

  // Xử lý chuyển đến trang Profile
  const handleProfile = () => {
    navigate("/profile");
    handleClose();
  };

  // Mở trang notifications
  const handleViewAllNotifications = () => {
    navigate("/notifications");
    handleNotificationClose();
  };

  // Xử lý click vào notification
  const handleNotificationItemClick = (notification) => {
    // Navigate to the link from notification and mark as read
    if (notification.link) {
      navigate(notification.link);
    }
    
    // Mark this notification as read if not already
    if (!notification.isRead) {
      markAsRead({ notificationIds: [notification._id] })
        .then(result => {
          if (result.success) {
            setNotificationCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => 
              prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
            );
          }
        })
        .catch(error => console.error("Error marking notification as read:", error));
    }
    
    handleNotificationClose();
  };

  // Format notification timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 30) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(8px)",
        color: "text.primary",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          height: 56,
          px: { xs: 1.5, sm: 2, md: 3 },
        }}
      >
        {/* Phần bên trái - Logo và nút menu */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Nút toggle sidebar */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{
              color: "primary.main",
              padding: 1,
              transition: "all 0.2s",
              "&:hover": {
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                transform: "scale(1.05)",
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo với gradient text */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              background: "linear-gradient(45deg, #4F46E5 30%, #7C3AED 90%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "0.5px",
              transition: "all 0.3s",
              cursor: "pointer",
              "&:hover": {
                transform: "translateY(-1px)",
                background: "linear-gradient(45deg, #4F46E5 50%, #7C3AED 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              },
            }}
          >
            Zira XGame
          </Typography>
        </Box>

        {/* Phần giữa - Thanh tìm kiếm */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            backgroundColor: "rgba(243, 244, 246, 0.8)",
            borderRadius: "12px",
            padding: "6px 16px",
            flex: 1,
            maxWidth: "500px",
            mx: 3,
            border: "1px solid rgba(0,0,0,0.06)",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: "#F3F4F6",
              boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
              border: "1px solid rgba(0,0,0,0.1)",
            },
            "&:focus-within": {
              backgroundColor: "#FFFFFF",
              boxShadow: "0 2px 6px rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            },
          }}
        >
          <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />
          <InputBase
            placeholder="Tìm kiếm..."
            sx={{
              flex: 1,
              "& input": {
                padding: "2px 0",
                fontSize: "0.9rem",
                fontWeight: 500,
                "&::placeholder": {
                  color: "text.secondary",
                  opacity: 0.7,
                },
              },
            }}
          />
        </Box>

        {/* Phần bên phải - Thông báo và thông tin user */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* WebSocket Indicator */}
          <WebSocketIndicator />
          
          {/* Nút thông báo với badge */}
          <Tooltip title="Thông báo">
            <IconButton
              onClick={handleNotificationClick}
              sx={{
                color: "text.secondary",
                padding: 1,
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: "rgba(0,0,0,0.04)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Badge
                badgeContent={notificationCount}
                color="error"
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: "0.65rem",
                    height: "16px",
                    minWidth: "16px",
                    padding: "0 4px",
                  },
                }}
              >
                <NotificationsIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* Notification Menu */}
          <Menu
            id="notifications-menu"
            anchorEl={notificationEl}
            open={Boolean(notificationEl)}
            onClose={handleNotificationClose}
            PaperProps={{
              sx: {
                width: 320,
                maxHeight: 400,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                mt: 1.5,
                "& .MuiMenuItem-root": {
                  px: 2,
                  py: 1,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
                Thông báo
              </Typography>
              {notificationCount > 0 && (
                <Button 
                  startIcon={<CheckCircleIcon />} 
                  size="small" 
                  sx={{ fontSize: "0.75rem" }}
                  onClick={handleMarkAllAsRead}
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </Box>
            <Divider />
            
            {loadingNotifications ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Không có thông báo nào
                </Typography>
              </Box>
            ) : (
              <List sx={{ py: 0, maxHeight: 280, overflow: "auto" }}>
                {notifications.map((notification) => (
                  <React.Fragment key={notification._id}>
                    <ListItem 
                      alignItems="flex-start" 
                      sx={{ 
                        py: 1.5,
                        backgroundColor: notification.isRead ? "transparent" : "rgba(25, 118, 210, 0.05)",
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        }
                      }}
                      onClick={() => handleNotificationItemClick(notification)}
                    >
                      <ListItemAvatar sx={{ minWidth: 40 }}>
                        <Avatar 
                          src={notification.sender?.avatar} 
                          sx={{ width: 32, height: 32 }}
                        >
                          {notification.sender?.name?.[0] || "S"}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ 
                            fontWeight: notification.isRead ? 400 : 600,
                            fontSize: "0.85rem",
                            mb: 0.5,
                            pr: 3
                          }}>
                            {notification.message}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                            {formatTime(notification.createdAt)}
                          </Typography>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
            
            <Box sx={{ px: 2, py: 1.5 }}>
              <Button 
                fullWidth 
                variant="outlined" 
                size="small"
                onClick={handleViewAllNotifications}
              >
                Xem tất cả thông báo
              </Button>
            </Box>
          </Menu>

          {/* User menu */}
          <Box>
            <Tooltip title="Tài khoản">
              <IconButton
                onClick={handleMenu}
                aria-label="Mở menu tài khoản"
                aria-controls={Boolean(anchorEl) ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl) ? "true" : undefined}
                sx={{
                  padding: 0.5,
                  transition: "all 0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(0,0,0,0.04)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "primary.main",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              id="account-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              onClick={handleClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              keepMounted
              sx={{
                "& .MuiPaper-root": {
                  borderRadius: 2,
                  minWidth: 180,
                  boxShadow:
                    "rgb(145 158 171 / 24%) 0px 0px 2px 0px, rgb(145 158 171 / 24%) 0px 20px 40px -4px",
                  mt: 1.5,
                },
              }}
              MenuListProps={{
                "aria-labelledby": "account-button",
                role: "menu",
              }}
            >
              <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                <AccountCircleIcon sx={{ mr: 2, fontSize: 20 }} />
                Hồ sơ
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
                Đăng xuất
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
