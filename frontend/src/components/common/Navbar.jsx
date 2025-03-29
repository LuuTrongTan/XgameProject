/**
 * Navbar Component - Thanh điều hướng chính của ứng dụng
 * Hiển thị logo, thanh tìm kiếm, thông báo và thông tin người dùng
 * Layout: Logo (trái) | Search bar (giữa) | Notifications + User menu (phải)
 */

import React, { useState } from "react";
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
} from "@mui/material";

// Material Icons
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";

// React Router và Context
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

/**
 * @param {Object} props - Component props
 * @param {Function} props.onDrawerToggle - Hàm xử lý đóng/mở sidebar
 */
const Navbar = ({ onDrawerToggle }) => {
  // Hooks và state management
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null); // State cho user menu
  const [notificationCount] = useState(3); // Mock số lượng thông báo

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
          {/* Nút thông báo với badge */}
          <Tooltip title="Thông báo">
            <IconButton
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
