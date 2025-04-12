import User from "../models/user.model.js";
import { validateEmail } from "../utils/validation.js";
import { ROLES } from "../config/constants.js";
import { isAdmin } from "../middlewares/auth.middleware.js";
import AuditLog from "../models/auditlog.model.js";
import auditLogService from "../services/auditlog.service.js";

export const updateProfile = async (req, res) => {
  try {
    const { name, email, position, department } = req.body;

    // Validate email format
    if (email && !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Check if email already exists
    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email đã được sử dụng",
        });
      }
    }

    // Update user profile
    const updateData = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      ...(position && { position }),
      ...(department && { department }),
    };

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
    }).select("-password");

    res.json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: user,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin",
      error: error.message,
    });
  }
};

// Cập nhật avatar người dùng
export const updateAvatar = async (req, res) => {
  try {
    const avatarBase64 = req.body.avatar;
    
    console.log("Received avatar data type:", typeof avatarBase64);
    console.log("Avatar data length:", avatarBase64 ? avatarBase64.length : 0);
    console.log("Avatar data starts with:", avatarBase64 ? avatarBase64.substring(0, 30) + "..." : "undefined");
    console.log("User ID for avatar update:", req.user.id);
    
    if (!avatarBase64) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu avatar",
      });
    }

    // Kiểm tra kiểu dữ liệu
    if (typeof avatarBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu avatar không phải định dạng chuỗi",
      });
    }

    // Kiểm tra định dạng base64
    if (!avatarBase64.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: "Định dạng ảnh không hợp lệ",
      });
    }

    // Giới hạn kích thước (nếu quá lớn)
    // Giảm giới hạn xuống còn 2MB để tránh vượt quá kích thước document MongoDB
    if (avatarBase64.length > 2 * 1024 * 1024) { // 2MB (thay vì 5MB)
      return res.status(400).json({
        success: false,
        message: "Kích thước ảnh quá lớn (tối đa 2MB)",
      });
    }

    try {
      // Tìm user hiện tại trước khi cập nhật để log thông tin
      const currentUser = await User.findById(req.user.id).select("_id name email");
      console.log("Found user for avatar update:", currentUser ? {
        id: currentUser._id,
        name: currentUser.name,
        email: currentUser.email
      } : "User not found");
      
      // Cập nhật avatarBase64 trong database
      const user = await User.findByIdAndUpdate(
        req.user.id, 
        { avatarBase64 }, 
        { new: true }
      ).select("-password");
      
      if (!user) {
        console.error("User not found or update failed");
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng hoặc cập nhật thất bại",
        });
      }
      
      console.log("Avatar updated successfully for user:", user ? user._id : "unknown");
      console.log("Updated avatar starts with:", user.avatarBase64 ? user.avatarBase64.substring(0, 30) + "..." : "undefined");
      console.log("Updated avatar length:", user.avatarBase64 ? user.avatarBase64.length : 0);

      res.json({
        success: true,
        message: "Cập nhật avatar thành công",
        data: user,
      });
    } catch (dbError) {
      console.error("Database error updating avatar:", dbError);
      
      // Check for MongoDB document size limit error
      if (dbError.message && dbError.message.includes("document too large")) {
        return res.status(413).json({
          success: false,
          message: "Ảnh quá lớn để lưu vào cơ sở dữ liệu, vui lòng chọn ảnh nhỏ hơn",
          error: dbError.message,
        });
      }
      
      return res.status(500).json({
        success: false,
        message: "Lỗi cơ sở dữ liệu khi cập nhật avatar",
        error: dbError.message,
      });
    }
  } catch (error) {
    console.error("Error updating avatar:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật avatar",
      error: error.message,
    });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    // Đảm bảo trả về trường avatarBase64
    const users = await User.find().select("-password");
    
    console.log("getAllUsers - Số lượng người dùng:", users.length);
    console.log("getAllUsers - Người dùng có avatarBase64:", users.filter(u => !!u.avatarBase64).length);
    
    res.json({
      success: true,
      message: "Lấy danh sách người dùng thành công",
      data: users,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách người dùng",
      error: error.message,
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    // Chắc chắn trả về trường avatarBase64
    const user = await User.findById(req.params.id)
      .select("-password");
      
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }
    
    console.log("Get user by ID - Returning user data with avatarBase64:", !!user.avatarBase64);
    
    res.json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: user,
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin người dùng",
      error: error.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      data: user,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thông tin người dùng",
      error: error.message,
    });
  }
};

// Thay đổi vai trò người dùng - chỉ Admin mới có quyền này
export const changeUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Kiểm tra role hợp lệ
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ",
      });
    }

    // Chỉ Admin mới có quyền thay đổi vai trò
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thay đổi vai trò người dùng",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Gửi thông báo cập nhật vai trò
    if (global.io) {
      global.io.emit("user_role_updated", {
        userId,
        newRole: role,
        updatedBy: {
          id: req.user.id,
          name: req.user.name,
        },
      });
    }

    res.json({
      success: true,
      message: "Cập nhật vai trò người dùng thành công",
      data: user,
    });
  } catch (error) {
    console.error("Error in changeUserRole:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật vai trò người dùng",
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      message: "Xóa người dùng thành công",
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa người dùng",
      error: error.message,
    });
  }
};

// Lấy lịch sử hoạt động của người dùng hiện tại
export const getUserHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    
    // Lấy lịch sử hoạt động từ AuditLog
    const result = await auditLogService.getEntityLogsWithPagination(
      null, 
      null, 
      { user: userId }, 
      { 
        page: parseInt(page), 
        limit: parseInt(limit),
        sort: { createdAt: -1 } 
      }
    );
    
    res.json({
      success: true,
      message: "Lấy lịch sử hoạt động thành công",
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử hoạt động",
      error: error.message
    });
  }
};
