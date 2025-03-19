import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import multer from "multer";
import {
  uploadFile,
  getFilesByTask,
  deleteFile,
} from "../controllers/upload.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

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
router.post("/", upload.single("file"), uploadFile);

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
router.get("/task/:taskId", getFilesByTask);

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
router.delete("/:fileId", deleteFile);

export default router;
