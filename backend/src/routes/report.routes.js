import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getBurndownChartData,
  getMemberPerformance,
  getProjectOverview,
  getTimeReport,
  getReportOverview
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
 * /reports/projects/{projectId}/time-report:
 *   get:
 *     summary: Lấy báo cáo thời gian làm việc
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sprint
 *         schema:
 *           type: string
 *         description: ID của sprint (không bắt buộc)
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         default: day
 *         description: Nhóm theo ngày, tuần hoặc tháng
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Báo cáo thời gian làm việc
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Dự án không tồn tại
 */
router.get("/projects/:projectId/time-report", getTimeReport);

/**
 * @swagger
 * /reports/projects/{projectId}/project-overview:
 *   get:
 *     summary: Lấy báo cáo chi tiết tổng quan dự án
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
 *         description: Báo cáo chi tiết tổng quan dự án
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Dự án không tồn tại
 */
router.get("/projects/:projectId/project-overview", getProjectOverview);

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
 *       - in: query
 *         name: sprint
 *         schema:
 *           type: string
 *         description: ID của sprint (không bắt buộc)
 *     responses:
 *       200:
 *         description: Báo cáo tổng quan dự án
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Dự án không tồn tại
 */
router.get("/projects/:projectId/overview", getReportOverview);

export default router;
