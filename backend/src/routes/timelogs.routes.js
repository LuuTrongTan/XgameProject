import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  createTimelog,
  startTimer,
  pauseTimer,
  completeTimer,
  getTimelogReport,
  getTimeComparison,
  updateTimelog,
  deleteTimelog,
  getTimelogs,
} from "../controllers/timelogs.controller.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Timelogs
 *   description: Quản lý thời gian làm việc
 */

/**
 * @swagger
 * /timelogs:
 *   post:
 *     summary: Tạo bản ghi thời gian mới
 *     tags: [Timelogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - description
 *             properties:
 *               taskId:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Bản ghi thời gian đã được tạo
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy công việc
 */
router.post("/", createTimelog);

/**
 * @swagger
 * /timelogs/{timelogId}/start:
 *   put:
 *     summary: Bắt đầu đếm thời gian
 *     tags: [Timelogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timelogId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã bắt đầu đếm thời gian
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bản ghi thời gian
 */
router.put("/:timelogId/start", startTimer);

/**
 * @swagger
 * /timelogs/{timelogId}/pause:
 *   put:
 *     summary: Tạm dừng đếm thời gian
 *     tags: [Timelogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timelogId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã tạm dừng đếm thời gian
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bản ghi thời gian
 */
router.put("/:timelogId/pause", pauseTimer);

/**
 * @swagger
 * /timelogs/{timelogId}/complete:
 *   put:
 *     summary: Hoàn thành và kết thúc đếm thời gian
 *     tags: [Timelogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: timelogId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã hoàn thành và kết thúc đếm thời gian
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bản ghi thời gian
 */
router.put("/:timelogId/complete", completeTimer);

/**
 * @swagger
 * /timelogs/report/{userId}:
 *   get:
 *     summary: Lấy báo cáo thời gian làm việc của người dùng
 *     tags: [Timelogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.get("/report/:userId", getTimelogReport);

/**
 * @swagger
 * /timelogs/comparison:
 *   get:
 *     summary: So sánh thời gian dự kiến và thực tế
 *     tags: [Timelogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: ID của công việc cần so sánh
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: ID của dự án cần so sánh
 *     responses:
 *       200:
 *         description: Thông tin so sánh thời gian
 *       400:
 *         description: Thiếu taskId hoặc projectId
 *       404:
 *         description: Không tìm thấy công việc hoặc dự án
 */
router.get("/comparison", getTimeComparison);

export default router;
