import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  searchProjects,
  searchTasks,
  searchUsers,
} from "../controllers/search.controller.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Tìm kiếm
 */

/**
 * @swagger
 * /search/projects:
 *   get:
 *     summary: Tìm kiếm dự án
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Trạng thái dự án
 *     responses:
 *       200:
 *         description: Danh sách dự án tìm thấy
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/projects", searchProjects);

/**
 * @swagger
 * /search/tasks:
 *   get:
 *     summary: Tìm kiếm công việc
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: ID dự án
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Trạng thái công việc
 *     responses:
 *       200:
 *         description: Danh sách công việc tìm thấy
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/tasks", searchTasks);

/**
 * @swagger
 * /search/users:
 *   get:
 *     summary: Tìm kiếm người dùng
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (tên hoặc email)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Vai trò người dùng
 *     responses:
 *       200:
 *         description: Danh sách người dùng tìm thấy
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/users", searchUsers);

export default router;
