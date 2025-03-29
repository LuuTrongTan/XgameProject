import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { checkPermission, protect } from "../middlewares/auth.middleware.js";
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

export default router;
