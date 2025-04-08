import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  uploadAttachment,
  getTaskAttachments,
  updateStatus,
  addTag,
  removeTag,
  syncWithGoogleCalendar,
  updateEstimatedTime,
  getTaskTimeStats,
  updateProgress,
  toggleWatcher,
  toggleDependency,
  getUpcomingTasks,
  getTaskHistory,
} from "../controllers/task.controller.js";
import { addTaskComment } from "../controllers/comment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../config/constants.js";

const router = express.Router();

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory:", uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Quản lý công việc
 */

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks:
 *   get:
 *     summary: Lấy danh sách công việc của sprint
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks", protect, getTasks);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
 *   get:
 *     summary: Lấy thông tin chi tiết công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId", protect, getTaskById);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks:
 *   post:
 *     summary: Tạo công việc mới trong sprint
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
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
 */
router.post("/projects/:projectId/sprints/:sprintId/tasks", protect, checkPermission(PERMISSIONS.CREATE_TASK), createTask);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
 *   put:
 *     summary: Cập nhật công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId", protect, updateTask);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/assign:
 *   post:
 *     summary: Gán công việc cho thành viên
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/assign", protect, assignTask);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/attachments:
 *   post:
 *     summary: Upload file đính kèm
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.post(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments",
  protect,
  upload.single("file"),
  uploadAttachment
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
 *   delete:
 *     summary: Xóa một công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.delete("/projects/:projectId/sprints/:sprintId/tasks/:taskId", protect, deleteTask);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/status:
 *   put:
 *     summary: Cập nhật trạng thái công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId/status", protect, updateStatus);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/comments:
 *   post:
 *     summary: Thêm bình luận
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments", protect, addTaskComment);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/tags:
 *   post:
 *     summary: Thêm tag cho công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/tags", protect, addTag);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/tags/{tag}:
 *   delete:
 *     summary: Xóa tag khỏi công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 */
router.delete("/projects/:projectId/sprints/:sprintId/tasks/:taskId/tags/:tag", protect, removeTag);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/sync-calendar:
 *   post:
 *     summary: Đồng bộ với Google Calendar/Outlook
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/sync-calendar", protect, syncWithGoogleCalendar);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/estimated-time:
 *   put:
 *     summary: Cập nhật thời gian dự kiến
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId/estimated-time", protect, updateEstimatedTime);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/time-stats:
 *   get:
 *     summary: Lấy thống kê thời gian của task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId/time-stats", protect, getTaskTimeStats);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/progress:
 *   put:
 *     summary: Cập nhật tiến độ công việc
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId/progress", protect, updateProgress);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/upcoming:
 *   get:
 *     summary: Lấy danh sách công việc sắp tới
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/upcoming", protect, getUpcomingTasks);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/attachments:
 *   get:
 *     summary: Lấy danh sách tệp đính kèm của task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments", protect, getTaskAttachments);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/history:
 *   get:
 *     summary: Lấy lịch sử thay đổi của task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
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
 */
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId/history", protect, getTaskHistory);

// Task assignment and watchers
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/watchers", protect, toggleWatcher);

// Task dependencies and relationships
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/dependencies", protect, toggleDependency);

export default router;
