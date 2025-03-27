import express from "express";
import {
  getSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
} from "../controllers/sprint.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../config/constants.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sprints
 *   description: Quản lý sprint
 */

/**
 * @swagger
 * /projects/{projectId}/sprints:
 *   get:
 *     summary: Lấy danh sách sprint của dự án
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách sprint
 */
router.get("/projects/:projectId/sprints", protect, getSprints);

/**
 * @swagger
 * /projects/{projectId}/sprints/{sprintId}:
 *   get:
 *     summary: Lấy thông tin chi tiết sprint
 *     tags: [Sprints]
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
 *     responses:
 *       200:
 *         description: Chi tiết sprint và danh sách task
 */
router.get("/projects/:projectId/sprints/:sprintId", protect, getSprintById);

/**
 * @swagger
 * /projects/{projectId}/sprints:
 *   post:
 *     summary: Tạo sprint mới
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *               - name
 *               - description
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [planning, active, completed]
 *               goal:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sprint đã được tạo
 */
router.post(
  "/projects/:projectId/sprints",
  protect,
  checkPermission(PERMISSIONS.CREATE_SPRINT),
  createSprint
);

/**
 * @swagger
 * /projects/{projectId}/sprints/{sprintId}:
 *   put:
 *     summary: Cập nhật sprint
 *     tags: [Sprints]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [planning, active, completed]
 *               goal:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sprint đã được cập nhật
 */
router.put(
  "/projects/:projectId/sprints/:sprintId",
  protect,
  checkPermission(PERMISSIONS.UPDATE_SPRINT),
  updateSprint
);

/**
 * @swagger
 * /projects/{projectId}/sprints/{sprintId}:
 *   delete:
 *     summary: Xóa sprint
 *     tags: [Sprints]
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
 *     responses:
 *       200:
 *         description: Sprint đã được xóa
 */
router.delete(
  "/projects/:projectId/sprints/:sprintId",
  protect,
  checkPermission(PERMISSIONS.DELETE_SPRINT),
  deleteSprint
);

/**
 * @swagger
 * /projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
 *   post:
 *     summary: Thêm task vào sprint
 *     tags: [Sprints]
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
 *     responses:
 *       200:
 *         description: Task đã được thêm vào sprint
 */
router.post(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId",
  protect,
  checkPermission(PERMISSIONS.UPDATE_SPRINT),
  addTaskToSprint
);

/**
 * @swagger
 * /projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
 *   delete:
 *     summary: Gỡ task khỏi sprint
 *     tags: [Sprints]
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
 *     responses:
 *       200:
 *         description: Task đã được gỡ khỏi sprint
 */
router.delete(
  "/projects/:projectId/sprints/:sprintId/tasks/:taskId",
  protect,
  checkPermission(PERMISSIONS.UPDATE_SPRINT),
  removeTaskFromSprint
);

export default router;
