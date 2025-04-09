import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middlewares/auth.middleware.js";
import uploadService from "../services/upload.services.js";

const router = express.Router();

// Đảm bảo thư mục uploads tồn tại
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created uploads directory:", uploadDir);
}

// Cấu hình storage cho multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Quản lý tập tin
 */

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Tải lên tập tin
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               taskId:
 *                 type: string
 *                 description: ID của công việc
 *     responses:
 *       200:
 *         description: Tập tin đã được tải lên
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Lấy các query params
    const { taskId, projectId, commentId, permissions = 'public' } = req.query;

    // Lưu thông tin file vào database
    const fileData = await uploadService.saveFileInfo({
      file: req.file
    }, {
      userId: req.user.id,
      taskId: taskId || null,
      projectId: projectId || null,
      commentId: commentId || null,
      permissions
    });

    // Tạo URL đầy đủ
    const fullUrl = uploadService.getFullUrl(fileData, req);

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        file: {
          ...fileData.toObject(),
          fullUrl
        }
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /upload/task/{taskId}:
 *   get:
 *     summary: Lấy danh sách tập tin của công việc
 *     tags: [Upload]
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
 *         description: Danh sách tập tin
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/task/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Task ID is required"
      });
    }
    
    // Sử dụng service để lấy danh sách file
    const files = await uploadService.getFilesByTaskId(taskId);
    
    // Thêm URL đầy đủ cho mỗi file
    const filesWithUrl = files.map(file => ({
      ...file.toObject(),
      fullUrl: uploadService.getFullUrl(file, req)
    }));
    
    res.json({
      success: true,
      message: "Files retrieved successfully",
      data: filesWithUrl
    });
  } catch (error) {
    console.error("Error getting files by task:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving files",
      error: error.message
    });
  }
});

/**
 * @swagger
 * /upload/{fileId}:
 *   delete:
 *     summary: Xóa tập tin
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tập tin đã được xóa
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy tập tin
 */
router.delete("/:fileId", protect, async (req, res) => {
  try {
    const fileId = req.params.fileId;

    // Xóa file
    const result = await uploadService.deleteFile(fileId, req.user.id);

    res.json({
      success: true,
      message: "File deleted successfully",
      data: result
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting file",
      error: error.message
    });
  }
});

// API lấy thông tin file
router.get("/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const file = await uploadService.getFileById(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found"
      });
    }

    // Kiểm tra quyền truy cập nếu file không public
    if (file.permissions !== 'public') {
      // Nếu chưa đăng nhập
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Kiểm tra quyền
      const hasAccess = await uploadService.checkFileAccess(
        fileId, 
        req.user.id, 
        req.user.roles || []
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to access this file"
        });
      }
    }

    // Tạo URL đầy đủ
    const fullUrl = uploadService.getFullUrl(file, req);

    res.json({
      success: true,
      data: {
        ...file.toObject(),
        fullUrl
      }
    });
  } catch (error) {
    console.error("Error getting file:", error);
    res.status(500).json({
      success: false,
      message: "Error getting file",
      error: error.message
    });
  }
});

export default router;
