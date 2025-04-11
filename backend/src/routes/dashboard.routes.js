import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getAdminDashboard,
  getUserDashboard,
  getManagerDashboard,
  getDashboardData,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Quản lý bảng điều khiển
 */

/**
 * @swagger
 * /dashboard/admin:
 *   get:
 *     summary: Lấy thông tin bảng điều khiển admin
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thông tin bảng điều khiển admin
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/admin", getAdminDashboard);

/**
 * @swagger
 * /dashboard/user:
 *   get:
 *     summary: Lấy thông tin bảng điều khiển người dùng
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thông tin bảng điều khiển người dùng
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/user", getUserDashboard);

/**
 * @swagger
 * /dashboard/manager:
 *   get:
 *     summary: Lấy thông tin bảng điều khiển quản lý
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thông tin bảng điều khiển quản lý
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/manager", getManagerDashboard);

/**
 * @swagger
 * /dashboard/data:
 *   get:
 *     summary: Lấy dữ liệu tổng quan cho dashboard
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu dashboard
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/data", getDashboardData);

export default router;
