import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserRole,
  getUserHistory
} from "../controllers/user.controller.js";
import { checkPermission, protect, admin } from "../middlewares/auth.middleware.js";
import { PERMISSIONS } from "../constants/permissions.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Get all users - accessible to all authenticated users
router.get("/", getAllUsers);

// Get user by ID - accessible to all authenticated users
router.get("/:id", getUserById);

// Update user - requires EDIT_USERS permission
router.put("/:id", checkPermission(PERMISSIONS.EDIT_USERS), updateUser);

// Delete user - requires DELETE_USERS permission
router.delete("/:id", checkPermission(PERMISSIONS.DELETE_USERS), deleteUser);

// Change user role - admin only
router.put("/:userId/role", admin, changeUserRole);

// Lấy lịch sử hoạt động của người dùng hiện tại
router.get("/me/history", getUserHistory);

export default router;
