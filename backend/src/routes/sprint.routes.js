import express from "express";
import {
  getSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  getSprintMembers,
  addMemberToSprint,
  removeMemberFromSprint,
  getAvailableUsersForSprint,
} from "../controllers/sprint.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { PERMISSIONS, ROLES } from "../config/constants.js";
import Project from "../models/project.model.js";

const router = express.Router();

// Middleware debug để check user info và project role
const debugUserInfo = (req, res, next) => {
  console.log("\n=== DEBUG USER INFO FOR SPRINT ROUTES ===");
  console.log("User ID:", req.user.id);
  console.log("User Name:", req.user.name);
  console.log("User Email:", req.user.email);
  console.log("User Role:", req.user.role);
  console.log("Project Role:", req.projectRole);
  console.log("Project ID param:", req.params.projectId);
  console.log("Full params:", req.params);
  console.log(
    "Required permissions for createSprint:",
    PERMISSIONS.CREATE_SPRINT
  );
  console.log("=== END DEBUG USER INFO ===\n");
  next();
};

// Middleware để kiểm tra và đặt project role
const setProjectRole = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Admin luôn có quyền
    if (req.user.role === ROLES.ADMIN) {
      req.projectRole = ROLES.ADMIN;
      return next();
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID dự án",
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra nếu là owner
    if (project.owner.toString() === req.user.id.toString()) {
      // Owner có quyền cao nhất trong dự án, set role là PROJECT_MANAGER
      req.projectRole = ROLES.PROJECT_MANAGER;
      console.log(
        "User is project owner - setting projectRole to:",
        req.projectRole
      );
      return next();
    }

    // Kiểm tra quyền member
    const member = project.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );
    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Bạn không phải thành viên của dự án này",
      });
    }

    req.projectRole = member.role;
    console.log(
      "User is project member - setting projectRole to:",
      req.projectRole
    );
    next();
  } catch (error) {
    console.error("Lỗi khi kiểm tra quyền dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra quyền",
      error: error.message,
    });
  }
};

/**
 * @swagger
 * tags:
 *   name: Sprints
 *   description: Quản lý sprint
 */

/**
 * @swagger
 * /api/projects/{projectId}/sprints:
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
router.get("/projects/:projectId/sprints", protect, setProjectRole, getSprints);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}:
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
router.get(
  "/projects/:projectId/sprints/:sprintId",
  protect,
  setProjectRole,
  getSprintById
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints:
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
  setProjectRole,
  debugUserInfo,
  checkPermission(PERMISSIONS.CREATE_SPRINT),
  createSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}:
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
  setProjectRole,
  checkPermission(PERMISSIONS.UPDATE_SPRINT),
  updateSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}:
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
  setProjectRole,
  checkPermission(PERMISSIONS.DELETE_SPRINT),
  deleteSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
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
  setProjectRole,
  checkPermission(PERMISSIONS.UPDATE_SPRINT),
  addTaskToSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/tasks/{taskId}:
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
  setProjectRole,
  checkPermission(PERMISSIONS.UPDATE_SPRINT),
  removeTaskFromSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/members:
 *   get:
 *     summary: Lấy danh sách thành viên của sprint
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
 *         description: Danh sách thành viên của sprint
 */
router.get(
  "/projects/:projectId/sprints/:sprintId/members",
  protect,
  setProjectRole,
  getSprintMembers
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/members:
 *   post:
 *     summary: Thêm thành viên vào sprint
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
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thêm thành viên thành công
 */
router.post(
  "/projects/:projectId/sprints/:sprintId/members",
  protect,
  setProjectRole,
  checkPermission([ROLES.ADMIN, ROLES.PROJECT_MANAGER]),
  addMemberToSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/members/{userId}:
 *   delete:
 *     summary: Xóa thành viên khỏi sprint
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
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành viên thành công
 */
router.delete(
  "/projects/:projectId/sprints/:sprintId/members/:userId",
  protect,
  setProjectRole,
  checkPermission([ROLES.ADMIN, ROLES.PROJECT_MANAGER]),
  removeMemberFromSprint
);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/available-users:
 *   get:
 *     summary: Lấy danh sách người dùng có thể thêm vào sprint
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
 *         description: Danh sách người dùng có thể thêm vào sprint
 */
router.get(
  "/projects/:projectId/sprints/:sprintId/available-users",
  protect,
  setProjectRole,
  getAvailableUsersForSprint
);

export default router;
