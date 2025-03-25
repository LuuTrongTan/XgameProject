import express from "express";
import multer from "multer";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  uploadAttachment,
  updateStatus,
  addTag,
  removeTag,
  syncWithGoogleCalendar,
  updateEstimatedTime,
  getTaskTimeStats,
  updateProgress,
  getUpcomingTasks,
} from "../controllers/task.controller.js";
import { addTaskComment } from "../controllers/comment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Quản lý công việc
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Lấy danh sách công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [todo, in_progress, review, done]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách công việc
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get("/", protect, getTasks);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết công việc
 *     tags: [Tasks]
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
 *         description: Chi tiết công việc
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.get("/:id", protect, getTaskById);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Tạo công việc mới
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - projectId
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               projectId:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, review, done]
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               estimatedTime:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Công việc đã được tạo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.post("/", protect, createTask);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Cập nhật công việc
 *     tags: [Tasks]
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
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, review, done]
 *               estimatedTime:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date
 */
router.put("/:id", protect, updateTask);

/**
 * @swagger
 * /tasks/{id}/assign:
 *   post:
 *     summary: Gán công việc cho thành viên
 *     tags: [Tasks]
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
 *               - assignees
 *             properties:
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post("/:id/assign", protect, assignTask);

/**
 * @swagger
 * /tasks/{id}/comments:
 *   post:
 *     summary: Thêm bình luận
 *     tags: [Tasks]
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
 *               mentions:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.post("/:id/comments", protect, addTaskComment);

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   post:
 *     summary: Upload file đính kèm
 *     tags: [Tasks]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 */
router.post(
  "/:id/attachments",
  protect,
  upload.single("file"),
  uploadAttachment
);
/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Xóa một công việc
 *     description: Xóa một công việc dựa trên ID của nó. Yêu cầu quyền Admin hoặc Project Manager.
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của công việc cần xóa
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa công việc thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Công việc đã bị xóa"
 *       404:
 *         description: Công việc không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Công việc không tồn tại"
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Lỗi khi xóa công việc"
 */
router.delete("/:id", protect, deleteTask);

/**
 * @swagger
 * /tasks/{id}/status:
 *   put:
 *     summary: Cập nhật trạng thái công việc
 *     tags: [Tasks]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, review, done]
 */
router.put("/:id/status", protect, updateStatus);

/**
 * @swagger
 * /tasks/{id}/tags:
 *   post:
 *     summary: Thêm tag cho công việc
 *     tags: [Tasks]
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
 *               - tag
 *             properties:
 *               tag:
 *                 type: string
 */
router.post("/:id/tags", protect, addTag);

/**
 * @swagger
 * /tasks/{id}/tags/{tag}:
 *   delete:
 *     summary: Xóa tag khỏi công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 */
router.delete("/:id/tags/:tag", protect, removeTag);

/**
 * @swagger
 * /tasks/{id}/sync-calendar:
 *   post:
 *     summary: Đồng bộ với Google Calendar/Outlook
 *     tags: [Tasks]
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
 *               - calendarType
 *             properties:
 *               calendarType:
 *                 type: string
 *                 enum: [google, outlook]
 */
router.post("/:id/sync-calendar", protect, syncWithGoogleCalendar);

/**
 * @swagger
 * /tasks/{id}/estimated-time:
 *   put:
 *     summary: Cập nhật thời gian dự kiến
 *     tags: [Tasks]
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
 *               - estimatedTime
 *             properties:
 *               estimatedTime:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền cập nhật
 */
router.put("/:id/estimated-time", protect, updateEstimatedTime);

/**
 * @swagger
 * /tasks/{id}/time-stats:
 *   get:
 *     summary: Lấy thống kê thời gian của task
 *     tags: [Tasks]
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
 *         description: Thống kê thời gian
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy task
 */
router.get("/:id/time-stats", protect, getTaskTimeStats);

/**
 * @swagger
 * /tasks/{id}/progress:
 *   put:
 *     summary: Cập nhật tiến độ công việc
 *     tags: [Tasks]
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
 *               - progress
 *             properties:
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền cập nhật
 */
router.put("/:id/progress", protect, updateProgress);

/**
 * @swagger
 * /tasks/upcoming:
 *   get:
 *     summary: Lấy danh sách công việc sắp tới
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách công việc sắp tới
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get("/upcoming", protect, getUpcomingTasks);

export default router;
