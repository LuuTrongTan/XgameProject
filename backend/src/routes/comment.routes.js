import express from "express";
import {
  addTaskComment,
  getComments,
  updateComment,
  deleteComment,
  toggleReaction,
  addReply,
} from "../controllers/comment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import Comment from "../models/comment.model.js";

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
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments", protect, addTaskComment);

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Lấy danh sách bình luận
 *     tags: [Comments]
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments", protect, getComments);

/**
 * @swagger
 * /projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/comments/count:
 *   get:
 *     summary: Lấy số lượng bình luận của task
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Số lượng bình luận
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments/count", protect, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "TaskId là bắt buộc"
      });
    }
    
    const count = await Comment.countDocuments({ task: taskId });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error("Error counting comments:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đếm số lượng bình luận",
      error: error.message
    });
  }
});

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
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments/:commentId", protect, updateComment);

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
router.delete("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments/:commentId", protect, deleteComment);

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
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments/:commentId/reactions", protect, toggleReaction);

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
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments/:commentId/replies", protect, addReply);

export default router;
