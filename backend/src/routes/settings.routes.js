import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  getUserSettings,
  updateGeneralSettings,
  updateNotificationSettings,
  updateCalendarIntegration,
  disconnectCalendar,
} from "../controllers/settings.controller.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Quản lý cài đặt người dùng
 */

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Lấy cài đặt người dùng
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cài đặt người dùng
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/", getUserSettings);

/**
 * @swagger
 * /settings/general:
 *   put:
 *     summary: Cập nhật cài đặt chung
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *               theme:
 *                 type: string
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cài đặt đã được cập nhật
 *       401:
 *         description: Không có quyền truy cập
 */
router.put("/general", updateGeneralSettings);

/**
 * @swagger
 * /settings/notifications:
 *   put:
 *     summary: Cập nhật cài đặt thông báo
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: object
 *                 properties:
 *                   taskAssigned:
 *                     type: boolean
 *                   taskUpdated:
 *                     type: boolean
 *                   projectUpdated:
 *                     type: boolean
 *               inApp:
 *                 type: object
 *                 properties:
 *                   taskAssigned:
 *                     type: boolean
 *                   taskUpdated:
 *                     type: boolean
 *                   projectUpdated:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Cài đặt đã được cập nhật
 *       401:
 *         description: Không có quyền truy cập
 */
router.put("/notifications", updateNotificationSettings);

/**
 * @swagger
 * /settings/calendar:
 *   put:
 *     summary: Cập nhật tích hợp lịch
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tích hợp lịch đã được cập nhật
 *       401:
 *         description: Không có quyền truy cập
 */
router.put("/calendar", updateCalendarIntegration);

/**
 * @swagger
 * /settings/calendar/{provider}:
 *   delete:
 *     summary: Ngắt kết nối lịch
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã ngắt kết nối lịch
 *       401:
 *         description: Không có quyền truy cập
 */
router.delete("/calendar/:provider", disconnectCalendar);

export default router;
