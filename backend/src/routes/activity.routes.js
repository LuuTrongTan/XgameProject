import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { createActivity, getRecentActivities } from "../controllers/activity.controller.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`[Activity Route] ${req.method} ${req.url}`);
  next();
});

/**
 * @route   POST /api/activities
 * @desc    Create a new activity
 * @access  Private
 */
router.post("/", protect, createActivity);

/**
 * @route   GET /api/activities/recent
 * @desc    Get recent activities
 * @access  Private
 */
router.get("/recent", protect, getRecentActivities);

export default router; 