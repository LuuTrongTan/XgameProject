import express from "express";
import {
  getNotifications,
  markAsRead,
  deleteNotifications,
  getUnreadCount
} from "../controllers/notification.controller.js";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Tất cả các routes đều yêu cầu xác thực
router.use(protect);

// Notification routes
router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/read", markAsRead);
router.delete("/", deleteNotifications);

export default router;
