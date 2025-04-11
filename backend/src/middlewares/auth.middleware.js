import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ROLES } from "../config/constants.js";

// Helper function to check if a user is an admin
export const isAdmin = (user) => {
  return (
    user.role === ROLES.ADMIN ||
    user.role === 'admin' ||
    (user.roles && (user.roles.includes('admin') || user.roles.includes(ROLES.ADMIN)))
  );
};

export const protect = async (req, res, next) => {
  try {
    let token;

    // Kiểm tra token trong cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log("Found token in cookie:", token.substring(0, 10) + '...');
    }
    // Kiểm tra token trong header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Found token in header:", token.substring(0, 10) + '...');
    }

    if (!token) {
      console.log("No token found in request");
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy token xác thực",
      });
    }

    try {
      // Verify token
      console.log("Verifying token with JWT_SECRET:", process.env.JWT_SECRET ? `${process.env.JWT_SECRET.substring(0, 3)}...` : 'undefined');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Token successfully verified, decoded:", decoded);

      // Tìm user
      const user = await User.findById(decoded.id);

      if (!user) {
        console.log("User not found with ID from token:", decoded.id);
        return res.status(401).json({
          success: false,
          message: "Token không hợp lệ hoặc đã bị vô hiệu hóa",
        });
      }

      console.log("User authenticated:", user._id.toString(), "Role:", user.role);
      
      // Thêm user vào request
      req.user = user;
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi xác thực",
    });
  }
};

// Middleware kiểm tra vai trò của người dùng
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này",
      });
    }

    next();
  };
};

// Middleware kiểm tra người dùng có vai trò admin
export const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Không tìm thấy thông tin người dùng",
    });
  }

  // Kiểm tra kỹ nếu user có vai trò admin sử dụng helper function
  if (isAdmin(req.user)) {
    console.log("Admin access granted for protected route");
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Yêu cầu quyền quản trị viên",
  });
};

export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Không tìm thấy thông tin người dùng",
        });
      }

      // Admin có tất cả quyền
      if (isAdmin(req.user)) {
        return next();
      }

      // Kiểm tra quyền của user
      const hasPermission = req.user.permissions?.includes(permission);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền thực hiện hành động này",
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi kiểm tra quyền",
        error: error.message,
      });
    }
  };
};
