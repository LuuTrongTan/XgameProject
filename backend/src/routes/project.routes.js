import express from "express";
import multer from "multer";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  inviteMember,
  updateMemberRole,
} from "../controllers/project.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Quản lý dự án
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Lấy danh sách dự án
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách dự án
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/", getProjects);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Lấy thông tin dự án theo ID
 *     tags: [Projects]
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
 *         description: Thông tin dự án
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy dự án
 */
router.get("/:id", getProjectById);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Tạo dự án mới
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: "Dự án XGame"
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 example: "Phát triển hệ thống quản lý game"
 *     responses:
 *       201:
 *         description: Dự án đã được tạo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post("/", createProject);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Cập nhật dự án
 *     tags: [Projects]
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
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               status:
 *                 type: string
 *                 enum: ["Active", "Completed", "Archived"]
 *     responses:
 *       200:
 *         description: Dự án đã được cập nhật
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy dự án
 */
router.put("/:id", updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Xóa dự án
 *     tags: [Projects]
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
 *         description: Dự án đã được xóa
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy dự án
 */
router.delete("/:id", deleteProject);

/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     summary: Thêm thành viên vào dự án
 *     tags: [Projects]
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
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               role:
 *                 type: string
 *                 enum: ["Admin", "Project Manager", "Member"]
 *     responses:
 *       200:
 *         description: Thành viên đã được thêm
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy dự án hoặc người dùng
 */
router.post("/:id/members", addMember);

/**
 * @swagger
 * /projects/{id}/members/{userId}:
 *   delete:
 *     summary: Xóa thành viên khỏi dự án
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành viên đã được xóa khỏi dự án
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy dự án hoặc thành viên
 */
router.delete("/:id/members/:userId", removeMember);

/**
 * @swagger
 * /projects/{id}/members/{userId}:
 *   put:
 *     summary: Cập nhật vai trò thành viên trong dự án
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: ["Admin", "Project Manager", "Member"]
 *     responses:
 *       200:
 *         description: Vai trò thành viên đã được cập nhật
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy dự án hoặc thành viên
 */
router.put("/:id/members/:userId", updateMemberRole);

/**
 * @swagger
 * /projects/{id}/invite:
 *   post:
 *     summary: Gửi lời mời tham gia dự án qua email
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [Admin, Project Manager, Member]
 */
router.post("/:id/invite", inviteMember);

export default router;
