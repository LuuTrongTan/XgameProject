import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { ROLES, PERMISSIONS } from "../config/constants.js";
import { isAdmin } from "./auth.middleware.js";

// Map quyền cho từng role
const rolePermissions = {
  [ROLES.ADMIN]: [
    // Admin có tất cả quyền
    ...Object.values(PERMISSIONS),
  ],
  [ROLES.PROJECT_MANAGER]: [
    // Quản lý dự án
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.CREATE_PROJECT,
    PERMISSIONS.UPDATE_PROJECT,
    PERMISSIONS.DELETE_PROJECT,
    PERMISSIONS.MANAGE_PROJECT_MEMBERS,
    PERMISSIONS.ARCHIVE_PROJECT,

    // Sprint permissions
    PERMISSIONS.CREATE_SPRINT,
    PERMISSIONS.UPDATE_SPRINT,
    PERMISSIONS.DELETE_SPRINT,
    PERMISSIONS.VIEW_SPRINT,

    // Quản lý công việc
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.UPDATE_TASK,
    PERMISSIONS.DELETE_TASK,
    PERMISSIONS.ASSIGN_TASK,
    PERMISSIONS.COMMENT_TASK,
    PERMISSIONS.UPLOAD_TASK_FILE,
    PERMISSIONS.MANAGE_TASK_TAGS,
    PERMISSIONS.SYNC_CALENDAR,

    // Document permissions
    PERMISSIONS.UPLOAD_DOCUMENT,
    PERMISSIONS.DELETE_DOCUMENT,
    PERMISSIONS.VIEW_DOCUMENT,

    // Time tracking
    PERMISSIONS.MANAGE_TIME_LOGS,
    PERMISSIONS.VIEW_TIME_REPORTS,
    PERMISSIONS.UPDATE_ESTIMATED_TIME,

    // Báo cáo
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROJECT_REPORTS,
    PERMISSIONS.VIEW_PERFORMANCE_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,

    // Thông báo
    PERMISSIONS.MANAGE_NOTIFICATIONS,
  ],
  [ROLES.MEMBER]: [
    // Quyền dự án
    PERMISSIONS.VIEW_PROJECT,
    PERMISSIONS.CREATE_PROJECT,

    // Sprint permissions
    PERMISSIONS.VIEW_SPRINT,

    // Quyền công việc
    PERMISSIONS.VIEW_TASK,
    PERMISSIONS.CREATE_TASK,
    PERMISSIONS.UPDATE_TASK,
    PERMISSIONS.COMMENT_TASK,
    PERMISSIONS.UPLOAD_TASK_FILE,

    // Quyền document - giống như quyền task
    PERMISSIONS.VIEW_DOCUMENT,
    PERMISSIONS.UPLOAD_DOCUMENT,

    // Time tracking
    PERMISSIONS.MANAGE_TIME_LOGS,
    PERMISSIONS.VIEW_TIME_REPORTS,

    // Báo cáo cơ bản
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROJECT_REPORTS,

    // Thông báo
    PERMISSIONS.MANAGE_NOTIFICATIONS,
  ],
};

// Mapping quyền với vai trò được phép
const permissionRoleMap = {
  // Project permissions
  [PERMISSIONS.CREATE_PROJECT]: [ROLES.ADMIN],
  [PERMISSIONS.VIEW_PROJECT]: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.MEMBER,
  ],

  // Các quyền dự án yêu cầu vai trò owner hoặc project manager
  [PERMISSIONS.EDIT_PROJECT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.DELETE_PROJECT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.ARCHIVE_PROJECT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.MANAGE_MEMBERS]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],

  // Sprint permissions
  [PERMISSIONS.CREATE_SPRINT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.EDIT_SPRINT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.DELETE_SPRINT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.VIEW_SPRINT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.MEMBER],
  [PERMISSIONS.MANAGE_SPRINT_MEMBERS]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],

  // Task permissions
  [PERMISSIONS.CREATE_TASK]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.MEMBER],
  [PERMISSIONS.EDIT_TASK]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.MEMBER],
  [PERMISSIONS.DELETE_TASK]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.VIEW_TASK]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.MEMBER],
  [PERMISSIONS.ASSIGN_TASK]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],

  // Document permissions
  [PERMISSIONS.CREATE_DOCUMENT]: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.MEMBER,
  ],
  [PERMISSIONS.EDIT_DOCUMENT]: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.MEMBER,
  ],
  [PERMISSIONS.DELETE_DOCUMENT]: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  [PERMISSIONS.VIEW_DOCUMENT]: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.MEMBER,
  ],
};

// Kiểm tra quyền truy cập dự án
export const checkProjectPermission = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Admin có tất cả quyền và truy cập tất cả dự án dù không phải là thành viên
    if (isAdmin(req.user)) {
      console.log("Admin access granted for project:", projectId);
      return next();
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra nếu là owner
    if (project.owner.toString() === userId) {
      return next();
    }

    // Kiểm tra quyền member
    const member = project.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập dự án này",
      });
    }

    // Lưu role trong project vào request để sử dụng sau
    req.projectRole = member.role;
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

// Kiểm tra quyền thực hiện hành động
export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      console.log("\n=== DEBUG CHECK PERMISSION ===");
      console.log("User:", req.user.name, req.user.email);
      console.log("User role:", req.user.role);
      console.log("Project role:", req.projectRole);
      console.log("Required permission:", permission);

      // Admin luôn có tất cả quyền, không quan tâm đến projectRole
      if (isAdmin(req.user)) {
        console.log("User is ADMIN, full access granted for permission:", permission);
        return next();
      }

      // Project manager có tất cả quyền liên quan đến sprint
      const sprintPermissions = [
        PERMISSIONS.CREATE_SPRINT,
        PERMISSIONS.UPDATE_SPRINT, 
        PERMISSIONS.DELETE_SPRINT,
        PERMISSIONS.VIEW_SPRINT,
        PERMISSIONS.MANAGE_SPRINT_MEMBERS,
        PERMISSIONS.ADD_SPRINT_MEMBER,
        PERMISSIONS.REMOVE_SPRINT_MEMBER
      ];

      // Nếu là project manager của project và đây là quyền liên quan đến sprint
      if ((req.projectRole === ROLES.PROJECT_MANAGER || req.projectRole === 'owner') && 
          sprintPermissions.includes(permission)) {
        console.log("User is PROJECT_MANAGER or owner of project, granting sprint permission:", permission);
        return next();
      }

      // Xử lý các quyền
      // Lấy role từ project hoặc user
      const role = req.projectRole || req.user.role;
      console.log("Effective role for permission check:", role);

      // Kiểm tra quyền dựa trên role
      const permissions = rolePermissions[role] || [];
      console.log("Available permissions for role:", permissions);

      if (!permissions.includes(permission)) {
        console.log("Permission denied:", permission);
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền thực hiện hành động này",
        });
      }

      console.log("Permission granted:", permission);
      console.log("=== END DEBUG ===\n");
      next();
    } catch (error) {
      console.error("Lỗi khi kiểm tra quyền:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi khi kiểm tra quyền",
        error: error.message,
      });
    }
  };
};

// Kiểm tra quyền truy cập task
export const checkTaskPermission = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;

    // Admin có tất cả quyền
    if (isAdmin(req.user)) {
      console.log("Admin access granted for task:", taskId);
      return next();
    }

    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "members" },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    // Kiểm tra quyền trong project
    const project = task.project;
    if (project.owner.toString() === userId) {
      return next();
    }

    const member = project.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập công việc này",
      });
    }

    // Kiểm tra nếu là người được gán task
    const isAssignee = task.assignees.some(
      (assignee) => assignee.toString() === userId
    );
    if (isAssignee) {
      req.projectRole = ROLES.MEMBER;
      return next();
    }

    // Lưu role trong project vào request
    req.projectRole = member.role;
    next();
  } catch (error) {
    console.error("Lỗi khi kiểm tra quyền task:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra quyền",
      error: error.message,
    });
  }
};
