import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ROLES } from "../config/constants.js";

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
      default: "default-avatar.png",
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
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
      enum: ["pending", "active", "inactive", "blocked"],
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

// Hàm so sánh mật khẩu khi đăng nhập
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Hàm xóa token
userSchema.methods.removeToken = function (token) {
  this.activeTokens = this.activeTokens.filter((t) => t.token !== token);
  return this.save();
};

const User = mongoose.model("User", userSchema);
export default User;
