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
  addAttachment,
  getTaskAttachments,
  deleteAttachment,
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
import { addTaskComment, getComments } from "../controllers/comment.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../config/constants.js";
import { checkAttachmentAccess, checkDeletePermission } from "../middlewares/attachment.middleware.js";
import { downloadAttachment } from "../controllers/attachment.controller.js";

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
router.post(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments",
  protect,
  checkAttachmentAccess,
  (req, res, next) => {
    console.log("\n=== FILE UPLOAD REQUEST - BEFORE MULTER ===");
    console.log("Request params:", req.params);
    console.log("Request headers:", {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      authorization: req.headers['authorization'] ? 'Present' : 'Missing',
    });
    
    // Tìm boundary trong Content-Type header
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:\"([^\"]*)\"|([^;]*))/) || [];
    const boundary = boundaryMatch[1] || boundaryMatch[2];
    
    console.log("Form data boundary:", boundary || 'Not detected');
    
    // Log một số thông tin về body
    if (req.body) {
      console.log("Request body keys:", Object.keys(req.body));
    }
    
    next();
  },
  upload.single("file"),
  (req, res, next) => {
    console.log("\n=== AFTER MULTER MIDDLEWARE ===");
    console.log("req.file:", req.file ? 'Present' : 'Missing');
    console.log("req.files:", req.files ? 'Present' : 'Missing');
    
    if (req.file) {
      console.log("File object:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        encoding: req.file.encoding,
        fieldname: req.file.fieldname,
        destination: req.file.destination
      });
      
      // Kiểm tra file trên đĩa
      try {
        const fileExists = fs.existsSync(req.file.path);
        const fileStats = fileExists ? fs.statSync(req.file.path) : null;
        console.log("File exists on disk:", fileExists);
        if (fileExists && fileStats) {
          console.log("File stats:", {
            size: fileStats.size,
            created: fileStats.birthtime,
            modified: fileStats.mtime,
            isFile: fileStats.isFile()
          });
          
          if (fileStats.size !== req.file.size) {
            console.warn("WARNING: File size mismatch - reported:", req.file.size, "actual:", fileStats.size);
          }
        }
      } catch (error) {
        console.error("Error checking file on disk:", error.message);
      }
      
      // Kiểm tra mapping tên file gốc
      if (req.fileOriginalNames && req.fileOriginalNames[req.file.filename]) {
        console.log("Original name mapping:", {
          savedAs: req.file.filename,
          originalName: req.fileOriginalNames[req.file.filename]
        });
      }
    } else {
      console.log("No file in request!");
      
      // Kiểm tra các thông tin request chi tiết để debug
      if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        console.log("Multipart form detected but no file processed by multer!");
        console.log("Form data keys:", Object.keys(req.body));
        console.log("Check field name - expected 'file' but found keys:", Object.keys(req.body));
      }
      
      // Kiểm tra xem có lỗi từ multer không
      if (req.multerError) {
        console.error("Multer error:", req.multerError);
      }
    }
    
    next();
  },
  addAttachment
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
router.get(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments",
  protect,
  checkAttachmentAccess,
  getTaskAttachments
);

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

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}/attachments/{attachmentId}:
 *   delete:
 *     summary: Xóa tệp đính kèm của công việc
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
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 */
router.delete(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments/:attachmentId",
  protect,
  checkDeletePermission,
  deleteAttachment
);

// Cập nhật route xem/tải tệp đính kèm
router.get(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId/attachments/:attachmentId",
  protect,
  checkAttachmentAccess,
  downloadAttachment
);

export default router;
