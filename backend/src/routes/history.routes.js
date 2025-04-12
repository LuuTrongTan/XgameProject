import express from "express";
import { protect, isAdmin } from "../middlewares/auth.middleware.js";
import {
  getUserHistory,
  getSystemHistory,
  getProjectHistory,
  getTaskHistory
} from "../controllers/history.controller.js";

const router = express.Router();

// Tất cả các route đều cần xác thực
router.use(protect);

/**
 * @swagger
 * /history/user:
 *   get:
 *     summary: Lấy lịch sử hoạt động của người dùng hiện tại hoặc người dùng cụ thể (nếu là admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID của người dùng cụ thể (chỉ cho admin)
 *     responses:
 *       200:
 *         description: Lịch sử hoạt động
 *       403:
 *         description: Không có quyền truy cập
 */
router.get("/user", getUserHistory);

/**
 * @swagger
 * /history/system:
 *   get:
 *     summary: Lấy lịch sử hoạt động hệ thống (chỉ cho admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID của người dùng để lọc kết quả (tùy chọn)
 *     responses:
 *       200:
 *         description: Lịch sử hoạt động hệ thống
 *       403:
 *         description: Không có quyền truy cập
 */
router.get("/system", isAdmin, getSystemHistory);

/**
 * @swagger
 * /history/project/{projectId}:
 *   get:
 *     summary: Lấy lịch sử hoạt động của một dự án
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lịch sử hoạt động dự án
 *       403:
 *         description: Không có quyền truy cập
 */
router.get("/project/:projectId", getProjectHistory);

/**
 * @swagger
 * /history/task/{taskId}:
 *   get:
 *     summary: Lấy lịch sử hoạt động của một task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lịch sử hoạt động task
 *       403:
 *         description: Không có quyền truy cập
 */
router.get("/task/:taskId", getTaskHistory);

export default router; 