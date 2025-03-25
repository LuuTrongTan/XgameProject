/**
 * Layout Component - Container chính cho layout của ứng dụng
 * Chia layout thành 3 phần chính:
 * 1. Navbar - Thanh điều hướng phía trên cùng (fixed position)
 * 2. Sidebar - Thanh menu bên trái
 * 3. Main Content - Khu vực hiển thị nội dung chính
 */

import React, { useState } from "react";
import { Box, CssBaseline, useTheme, useMediaQuery } from "@mui/material";
import {
  Toolbar,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Folder as ProjectIcon,
  Task as TasksIcon,
} from "@mui/icons-material";
import { Outlet, useNavigate, useLocation, useParams } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";

// Cấu hình kích thước cố định
const NAVBAR_HEIGHT = 64; // Chiều cao của navbar
const SIDEBAR_WIDTH = 240; // Chiều rộng của sidebar

const Layout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Lịch", icon: <CalendarIcon />, path: "/calendar" },
    { text: "Dự án", icon: <ProjectIcon />, path: "/projects" },
  ];

  if (projectId) {
    menuItems.push({
      text: "Công việc",
      icon: <TasksIcon />,
      path: `/projects/${projectId}/tasks`,
    });
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Quản lý X-Game
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) {
                setMobileOpen(false);
              }
            }}
            selected={location.pathname.startsWith(item.path)}
            sx={{
              "&.Mui-selected": {
                backgroundColor: "rgba(0, 0, 0, 0.08)",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.12)",
                },
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />

      {/* Navbar - Fixed at top */}
      <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1200 }}>
        <Navbar onDrawerToggle={handleDrawerToggle} />
      </Box>

      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileOpen}
        desktopOpen={desktopOpen}
        onDrawerToggle={handleDrawerToggle}
        width={SIDEBAR_WIDTH}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          backgroundColor: "#f3f4f6",
          mt: `${NAVBAR_HEIGHT}px`,
          ml: { sm: desktopOpen ? `${SIDEBAR_WIDTH}px` : 0 },
          transition: "margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms",
          p: { xs: 3, sm: 4, md: 6 },
        }}
      >
        <Box
          sx={{
            maxWidth: "100%",
            mx: "auto",
            px: { xs: 3, sm: 4, lg: 5 },
            py: 4,
            backgroundColor: "#fff",
            borderRadius: 1,
            boxShadow:
              "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
