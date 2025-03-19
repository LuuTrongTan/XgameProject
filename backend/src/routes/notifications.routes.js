import express from "express";
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Quản lý thông báo
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Lấy danh sách thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng thông báo mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/", getNotifications);

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: Đánh dấu thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông báo đã được đánh dấu đã đọc
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.put("/:id/read", markAsRead);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: Đánh dấu tất cả thông báo đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tất cả thông báo đã được đánh dấu đã đọc
 *       401:
 *         description: Không có quyền truy cập
 */
router.put("/read-all", (req, res) => {
  req.body.all = true;
  markAsRead(req, res);
});

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông báo đã được xóa
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.delete("/:id", deleteNotification);

export default router;
