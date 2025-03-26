import express from "express";
import multer from "multer";
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  deleteDocument,
  downloadDocument,
  updateDocument,
} from "../controllers/document.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../config/constants.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Quản lý tài liệu dự án
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Lấy danh sách tài liệu
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách tài liệu
 */
router.get(
  "/",
  protect,
  checkPermission(PERMISSIONS.VIEW_DOCUMENT),
  getDocuments
);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Lấy thông tin tài liệu theo ID
 *     tags: [Documents]
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
 *         description: Thông tin tài liệu
 *       404:
 *         description: Không tìm thấy tài liệu
 */
router.get(
  "/:id",
  protect,
  checkPermission(PERMISSIONS.VIEW_DOCUMENT),
  getDocumentById
);

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload tài liệu mới
 *     tags: [Documents]
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
 *               - projectId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               projectId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tài liệu đã được tải lên
 */
router.post(
  "/upload",
  protect,
  checkPermission(PERMISSIONS.UPLOAD_DOCUMENT),
  upload.single("file"),
  uploadDocument
);

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     summary: Xóa tài liệu
 *     tags: [Documents]
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
 *         description: Tài liệu đã được xóa
 *       404:
 *         description: Không tìm thấy tài liệu
 */
router.delete(
  "/:id",
  protect,
  checkPermission(PERMISSIONS.DELETE_DOCUMENT),
  deleteDocument
);

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     summary: Tải tài liệu
 *     tags: [Documents]
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
 *         description: File tài liệu
 *       404:
 *         description: Không tìm thấy tài liệu
 */
router.get(
  "/:id/download",
  protect,
  checkPermission(PERMISSIONS.VIEW_DOCUMENT),
  downloadDocument
);

/**
 * @swagger
 * /documents/{id}:
 *   put:
 *     summary: Cập nhật thông tin tài liệu
 *     tags: [Documents]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tài liệu đã được cập nhật
 *       404:
 *         description: Không tìm thấy tài liệu
 */
router.put(
  "/:id",
  protect,
  checkPermission(PERMISSIONS.UPLOAD_DOCUMENT),
  updateDocument
);

export default router;
