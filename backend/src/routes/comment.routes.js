import express from "express";
import {
  addTaskComment,
  getComments,
  updateComment,
  deleteComment,
  addReply,
  toggleReaction,
} from "../controllers/comment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Quản lý bình luận
 */

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Thêm bình luận mới
 *     tags: [Comments]
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
 *               - content
 *             properties:
 *               taskId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Bình luận đã được tạo
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/", addTaskComment);

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Lấy danh sách bình luận
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: ID của công việc
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
 *         description: Số lượng bình luận mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách bình luận
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/", getComments);

/**
 * @swagger
 * /comments/{id}:
 *   put:
 *     summary: Cập nhật bình luận
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Bình luận đã được cập nhật
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bình luận
 */
router.put("/:id", updateComment);

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Xóa bình luận
 *     tags: [Comments]
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
 *         description: Bình luận đã được xóa
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bình luận
 */
router.delete("/:id", deleteComment);

/**
 * @swagger
 * /comments/{id}/replies:
 *   post:
 *     summary: Thêm phản hồi cho bình luận
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Phản hồi đã được thêm
 */
router.post("/:id/replies", addReply);

/**
 * @swagger
 * /comments/{id}/reactions:
 *   post:
 *     summary: Thêm/xóa reaction cho bình luận
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [like, heart, laugh, sad, angry]
 *     responses:
 *       200:
 *         description: Reaction đã được cập nhật
 */
router.post("/:id/reactions", toggleReaction);

export default router;
