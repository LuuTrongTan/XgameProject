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

// Middleware để kiểm tra và gán role của user trong project
const setProjectRole = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Tìm project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại"
      });
    }

    // Kiểm tra nếu là owner
    if (project.owner.toString() === userId) {
      req.projectRole = 'owner';
      return next();
    }

    // Kiểm tra trong members
    const member = project.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập dự án này"
      });
    }

    // Lưu role vào request
    req.projectRole = member.role;
    next();
  } catch (error) {
    console.error("Error in setProjectRole middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra quyền truy cập",
      error: error.message
    });
  }
};

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
router.get("/projects/:projectId/sprints/:sprintId", protect, setProjectRole, debugUserInfo, getSprintById);

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
router.post("/projects/:projectId/sprints", protect, setProjectRole, debugUserInfo, checkPermission(PERMISSIONS.CREATE_SPRINT), createSprint);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}:
 *   put:
 *     summary: Cập nhật thông tin sprint
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
router.put("/projects/:projectId/sprints/:sprintId", protect, setProjectRole, debugUserInfo, checkPermission(PERMISSIONS.UPDATE_SPRINT), updateSprint);

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
router.delete("/projects/:projectId/sprints/:sprintId", protect, setProjectRole, debugUserInfo, checkPermission(PERMISSIONS.DELETE_SPRINT), deleteSprint);

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
 *         description: Danh sách thành viên
 */
router.get("/projects/:projectId/sprints/:sprintId/members", protect, setProjectRole, getSprintMembers);

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
 *         description: Thành viên đã được thêm vào sprint
 */
router.post("/projects/:projectId/sprints/:sprintId/members", protect, setProjectRole, debugUserInfo, checkPermission(PERMISSIONS.ADD_SPRINT_MEMBER), addMemberToSprint);

/**
 * @swagger
 * /api/projects/{projectId}/sprints/{sprintId}/members/{memberId}:
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
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành viên đã được xóa khỏi sprint
 */
router.delete("/projects/:projectId/sprints/:sprintId/members/:memberId", protect, setProjectRole, debugUserInfo, checkPermission(PERMISSIONS.REMOVE_SPRINT_MEMBER), removeMemberFromSprint);

/**
 * @swagger
 * /api/sprints/{sprintId}/project/{projectId}/available-users:
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
  "/:sprintId/project/:projectId/available-users",
  protect,
  setProjectRole,
  getAvailableUsersForSprint
);

export default router;
