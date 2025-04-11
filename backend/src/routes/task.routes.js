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
  updateTime,
  updateAssignees
} from "../controllers/task.controller.js";
import { addAttachment, getTaskAttachments, deleteAttachment } from "../controllers/task.attachment.controller.js";
import { addTaskComment, getComments } from "../controllers/comment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../config/constants.js";
import { checkAttachmentAccess, checkDeletePermission } from "../middlewares/attachment.middleware.js";
import { downloadAttachment } from "../controllers/attachment.controller.js";
import Task from "../models/task.model.js";
import {
  logTaskCreate,
  logTaskUpdate,
  logTaskDelete,
  logStatusChange,
  logAttachmentAction,
  logAttachmentDelete,
  logCommentAction,
  logAssignUser,
  logTaskView,
  logTaskProgress,
  logTaskTime,
  logTaskAssignee
} from "../middlewares/auditlog.middleware.js";

const router = express.Router();

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory:", uploadDir);
}

// Cấu hình storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Processing file destination:", file.originalname);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    try {
      console.log("Processing file name:", file.originalname);
      
      // Lưu tên file gốc để debugging
      console.log("Original file details:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        encoding: file.encoding,
        fieldname: file.fieldname
      });
      
      // Tạo tên file mới với timestamp để đảm bảo duy nhất
      const timestamp = Date.now();
      const randomString = Math.round(Math.random() * 1E9).toString(36);
      
      // Xác định extension của file
      const extension = path.extname(file.originalname) || '.unknown';
      
      // Tạo filename an toàn cho hệ thống
      const safeFilename = `${timestamp}-${randomString}${extension}`;
      console.log("Generated safe filename:", safeFilename);
      
      // Lưu mapping giữa tên file gốc và tên file trên đĩa
      if (!req.fileOriginalNames) {
        req.fileOriginalNames = {};
      }
      req.fileOriginalNames[safeFilename] = file.originalname;
      
      cb(null, safeFilename);
    } catch (error) {
      console.error("Error generating filename:", error);
      // Trong trường hợp lỗi, tạo tên file failback an toàn
      const fallbackName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${path.extname(file.originalname) || 'bin'}`;
      cb(null, fallbackName);
    }
  }
});

// Cấu hình multer đơn giản với storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  // Thêm debug callback
  fileFilter: (req, file, cb) => {
    console.log("\n=== MULTER FILE FILTER ===");
    console.log("- File being processed:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype
    });
    
    console.log("- Request headers:", {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length']
    });
    
    // Always accept the file
    cb(null, true);
  }
});

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
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId", protect, logTaskView, getTaskById);

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
router.post("/projects/:projectId/sprints/:sprintId/tasks", protect, checkPermission(PERMISSIONS.CREATE_TASK), logTaskCreate, createTask);

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
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId", protect, logTaskUpdate, updateTask);

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
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/assign", protect, logAssignUser, assignTask);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/attachments:
 *   post:
 *     summary: Upload file attachment to a task
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
router
  .route("/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments")
  .post(
    protect,
    checkPermission(PERMISSIONS.ADD_TASK_ATTACHMENT),
    upload.array("attachments", 10),
    addAttachment
  )
  .get(
    protect,
    checkPermission(PERMISSIONS.VIEW_TASK_ATTACHMENT),
    checkAttachmentAccess,
    getTaskAttachments
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
router.delete("/projects/:projectId/sprints/:sprintId/tasks/:taskId", protect, logTaskDelete, deleteTask);

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
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId/status", 
  protect, 
  async (req, res, next) => {
    try {
      console.log('\n\n[STATUS CHANGE DEBUGGING] ===============================');
      console.log('[STATUS CHANGE DEBUGGING] Request received');
      console.log('[STATUS CHANGE DEBUGGING] URL:', req.originalUrl);
      console.log('[STATUS CHANGE DEBUGGING] Method:', req.method);
      console.log('[STATUS CHANGE DEBUGGING] Headers:', JSON.stringify(req.headers));
      console.log('[STATUS CHANGE DEBUGGING] User:', req.user ? {
        id: req.user.id || req.user._id,
        name: req.user.name,
        email: req.user.email
      } : 'No user in request');
      console.log('[STATUS CHANGE DEBUGGING] Params:', JSON.stringify(req.params));
      console.log('[STATUS CHANGE DEBUGGING] Body:', JSON.stringify(req.body));
      
      // Kiểm tra path params
      if (!req.params.taskId || !req.params.projectId || !req.params.sprintId) {
        console.error('[STATUS CHANGE DEBUGGING] Missing required path parameters');
      }
      
      // Kiểm tra body
      if (!req.body.status) {
        console.error('[STATUS CHANGE DEBUGGING] Missing status in request body');
      }
      
      next();
    } catch (error) {
      console.error('[STATUS CHANGE DEBUGGING] Error in debug middleware:', error);
      next();
    }
  },
  async (req, res, next) => {
    // Tìm và lưu trạng thái hiện tại của task vào request để logStatusChange có thể sử dụng
    try {
      console.log('[Pre-middleware] Loading task for status change logging');
      const taskId = req.params.taskId;
      const task = await Task.findById(taskId);
      
      if (task) {
        req.task = task;
        console.log(`[Pre-middleware] Found task ${taskId} with status: ${task.status}`);
        console.log(`[Pre-middleware] Task details:`, {
          id: task._id.toString(),
          title: task.title,
          status: task.status,
          projectId: task.project.toString(),
          createdBy: task.createdBy.toString()
        });
      } else {
        console.log(`[Pre-middleware] Task ${taskId} not found`);
      }
      next();
    } catch (error) {
      console.error('[Pre-middleware] Error loading task:', error);
      next(); // Vẫn tiếp tục middleware chain
    }
  },
  logStatusChange, 
  updateStatus
);

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
router.post("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments", protect, logCommentAction, addTaskComment);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/comments:
 *   get:
 *     summary: Lấy danh sách bình luận của task
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
router.get("/projects/:projectId/sprints/:sprintId/tasks/:taskId/comments", protect, async (req, res) => {
  try {
    // Gán taskId vào query params để sử dụng lại getComments controller
    req.query.taskId = req.params.taskId;
    await getComments(req, res);
  } catch (error) {
    console.error("Lỗi khi lấy comments của task:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy comments",
      error: error.message
    });
  }
});

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
router.put("/projects/:projectId/sprints/:sprintId/tasks/:taskId/progress", protect, logTaskProgress, updateProgress);

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

// Direct task operations without sprint context
/**
 * @swagger
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Xóa một công việc trực tiếp bằng ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Công việc đã được xóa
 *       404:
 *         description: Không tìm thấy công việc
 *       403:
 *         description: Không có quyền xóa công việc này
 */
router.delete("/tasks/:taskId", protect, logTaskDelete, deleteTask);

// Attachment routes
router
  .route("/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments/:attachmentId")
  .delete(
    protect,
    checkPermission(PERMISSIONS.DELETE_TASK_ATTACHMENT),
    checkDeletePermission,
    deleteAttachment
  )
  .get(
    protect,
    checkPermission(PERMISSIONS.VIEW_TASK_ATTACHMENT),
    checkAttachmentAccess,
    downloadAttachment
  );

// Route cập nhật thời gian task
router.put('/projects/:projectId/sprints/:sprintId/tasks/:taskId/time', 
  protect, 
  logTaskTime,
  updateTime
);

// Route gán/hủy gán người thực hiện task
router.put('/projects/:projectId/sprints/:sprintId/tasks/:taskId/assignees', 
  protect, 
  logTaskAssignee,
  updateAssignees
);

export default router;
