import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../config/constants.js";
import { PERMISSIONS } from "../constants/permissions.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Vui lòng nhập email"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Vui lòng nhập mật khẩu"],
      minlength: [6, "Mật khẩu phải có ít nhất 6 ký tự"],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    permissions: [
      {
        type: String,
        enum: Object.values(PERMISSIONS),
      },
    ],
    activeTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        device: {
          type: String,
          required: true,
        },
        ip: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    avatar: {
      type: String,
      default: null,
    },
    avatarBase64: {
      type: String,
      default: null,
    },
    position: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: (v) => /^\d{10,11}$/.test(v),
        message: "Số điện thoại không hợp lệ",
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      index: true,
    },
    emailVerificationExpires: Date,
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpires: Date,
    receiveAllNotifications: {
      type: Boolean,
      default: false,
    },
    canAccessAllProjects: {
      type: Boolean,
      default: false,
    },
    canAccessAllSprints: {
      type: Boolean,
      default: false,
    },
    canAccessAllTasks: {
      type: Boolean,
      default: false,
    },
    canManageUsers: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes để tối ưu hóa tìm kiếm
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ "activeTokens.token": 1 });

// Virtual field để lấy danh sách task được giao
userSchema.virtual("assignedTasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "assignees",
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hàm xóa token
userSchema.methods.removeToken = function (token) {
  this.activeTokens = this.activeTokens.filter((t) => t.token !== token);
  return this.save();
};

// Set default permissions based on role
userSchema.pre("save", function (next) {
  if (!this.isModified("role")) return next();

  // Set default permissions based on role
  switch (this.role) {
    case ROLES.ADMIN:
      // Admin có tất cả quyền trong hệ thống, không giới hạn
      this.permissions = Object.values(PERMISSIONS);
      
      // Đảm bảo nhận mọi thông báo và truy cập tất cả tính năng
      this.receiveAllNotifications = true;
      this.canAccessAllProjects = true;
      this.canAccessAllSprints = true;
      this.canAccessAllTasks = true;
      this.canManageUsers = true;
      break;
    case ROLES.PROJECT_MANAGER:
      this.permissions = [
        PERMISSIONS.CREATE_PROJECT,
        PERMISSIONS.EDIT_PROJECT,
        PERMISSIONS.VIEW_PROJECT,
        PERMISSIONS.MANAGE_PROJECT_MEMBERS,
        PERMISSIONS.CREATE_SPRINT,
        PERMISSIONS.EDIT_SPRINT,
        PERMISSIONS.VIEW_SPRINT,
        PERMISSIONS.MANAGE_SPRINT_MEMBERS,
        PERMISSIONS.CREATE_TASK,
        PERMISSIONS.EDIT_TASK,
        PERMISSIONS.VIEW_TASK,
        PERMISSIONS.ASSIGN_TASK,
        PERMISSIONS.UPDATE_TASK_STATUS,
        PERMISSIONS.VIEW_USERS,
        PERMISSIONS.INVITE_USERS,
      ];
      break;
    case ROLES.MEMBER:
      this.permissions = [
        PERMISSIONS.VIEW_PROJECT,
        PERMISSIONS.VIEW_SPRINT,
        PERMISSIONS.CREATE_TASK,
        PERMISSIONS.EDIT_TASK,
        PERMISSIONS.VIEW_TASK,
        PERMISSIONS.ASSIGN_TASK,
        PERMISSIONS.UPDATE_TASK_STATUS,
      ];
      break;
  }

  next();
});

const User = mongoose.model("User", userSchema);
export default User;
