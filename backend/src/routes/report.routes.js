import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getBurndownChartData,
  getMemberPerformance,
  getProjectOverview,
} from "../controllers/reports.controller.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Quản lý báo cáo
 */

/**
 * @swagger
 * /reports/projects/{projectId}/burndown:
 *   get:
 *     summary: Lấy dữ liệu biểu đồ burndown
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dữ liệu biểu đồ burndown
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Dự án không tồn tại
 */
router.get("/projects/:projectId/burndown", getBurndownChartData);

/**
 * @swagger
 * /reports/projects/{projectId}/performance:
 *   get:
 *     summary: Lấy báo cáo hiệu suất thành viên
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Báo cáo hiệu suất thành viên
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Dự án không tồn tại
 */
router.get("/projects/:projectId/performance", getMemberPerformance);

/**
 * @swagger
 * /reports/projects/{projectId}/overview:
 *   get:
 *     summary: Lấy báo cáo tổng quan dự án
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Báo cáo tổng quan dự án
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Dự án không tồn tại
 */
router.get("/projects/:projectId/overview", getProjectOverview);

export default router;
