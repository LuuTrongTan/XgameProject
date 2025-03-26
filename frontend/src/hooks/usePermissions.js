import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";

// Định nghĩa các role
export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  MEMBER: "member",
};

// Map hiển thị tên role
export const ROLE_NAMES = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.PROJECT_MANAGER]: "Project Manager",
  [ROLES.MEMBER]: "Member",
};

export const getRoleName = (roleValue) => {
  return ROLE_NAMES[roleValue] || roleValue;
};

/**
 * Hook kiểm tra quyền trên dự án - đơn giản hóa
 */
export const usePermissions = () => {
  const { user } = useAuth();
  // Bật mặc định chế độ debug để dễ kiểm tra lỗi
  const [debugMode, setDebugMode] = useState(true);

  // Debug log khi khởi tạo
  console.log("usePermissions - user từ useAuth:", user);

  const toggleDebugMode = () => {
    setDebugMode((prev) => !prev);
  };

  /**
   * Kiểm tra đơn giản nếu user là Admin
   */
  const isAdmin = useCallback(() => {
    if (!user) {
      if (debugMode) console.log("isAdmin: user không tồn tại");
      return false;
    }

    if (debugMode)
      console.log(
        "isAdmin check:",
        user.role,
        "===",
        ROLES.ADMIN,
        "->",
        user.role === ROLES.ADMIN
      );
    return user.role === ROLES.ADMIN;
  }, [user, debugMode]);

  /**
   * Kiểm tra đơn giản nếu user là owner của project
   */
  const isProjectOwner = useCallback(
    (project) => {
      if (!project || !user) {
        if (debugMode)
          console.log("isProjectOwner: user hoặc project không tồn tại");
        return false;
      }

      // Lấy ID của owner
      const ownerId = project.owner?._id || project.owner;
      const userId = user._id;

      if (debugMode) {
        console.log("isProjectOwner check:");
        console.log("- Owner ID:", ownerId);
        console.log("- User ID:", userId);
        console.log("- Result:", ownerId && String(ownerId) === String(userId));
      }

      // So sánh với ID của user hiện tại
      return ownerId && String(ownerId) === String(userId);
    },
    [user, debugMode]
  );

  /**
   * Kiểm tra đơn giản nếu user là Project Manager của project
   */
  const isProjectManager = useCallback(
    (project) => {
      if (!project || !user || !project.members) {
        if (debugMode)
          console.log(
            "isProjectManager: user, project, hoặc project.members không tồn tại"
          );
        return false;
      }

      // Tìm membership của user
      const membership = project.members.find((member) => {
        const memberId = member.user?._id || member.user;
        const userId = user._id;

        if (debugMode) {
          console.log("So sánh member:");
          console.log("- Member ID:", memberId);
          console.log("- User ID:", userId);
          console.log(
            "- Match:",
            memberId && String(memberId) === String(userId)
          );
        }

        return memberId && String(memberId) === String(userId);
      });

      if (debugMode) {
        console.log("isProjectManager check:");
        console.log("- User:", user?.name, user?._id);
        console.log("- Membership found:", !!membership);

        if (membership) {
          console.log("- Membership:", JSON.stringify(membership, null, 2));
          console.log("- Role:", membership.role);
          console.log(
            "- So sánh với PROJECT_MANAGER:",
            membership.role === ROLES.PROJECT_MANAGER
          );
          console.log(
            "- So sánh chuỗi 'project_manager':",
            membership.role === "project_manager"
          );

          if (typeof membership.role === "string") {
            const normalized = membership.role
              .toLowerCase()
              .replace(/[_\s]/g, "");
            console.log("- Normalized role:", normalized);
            console.log(
              "- So sánh với 'projectmanager':",
              normalized === "projectmanager"
            );
          }
        }
      }

      // Kiểm tra role đơn giản
      return (
        membership &&
        (membership.role === ROLES.PROJECT_MANAGER ||
          membership.role === "project_manager" ||
          (typeof membership.role === "string" &&
            membership.role.toLowerCase().replace(/[_\s]/g, "") ===
              "projectmanager"))
      );
    },
    [user, debugMode]
  );

  /**
   * Hàm trung tâm kiểm tra quyền - đơn giản hóa
   */
  const hasPermission = useCallback(
    (project) => {
      if (!project) {
        if (debugMode) console.log("hasPermission: project không tồn tại");
        return false;
      }

      if (!user) {
        if (debugMode)
          console.log(
            "hasPermission: user không tồn tại - bạn cần đăng nhập lại"
          );
        return false;
      }

      if (debugMode) {
        console.log("Kiểm tra quyền cho project:", project.name);
        console.log(
          "User hiện tại:",
          user ? `${user.name} (${user._id})` : "Không có user"
        );
      }

      // Admin luôn có quyền
      if (isAdmin()) {
        if (debugMode) console.log("User là Admin - có quyền");
        return true;
      }

      // Owner luôn có quyền
      if (isProjectOwner(project)) {
        if (debugMode) console.log("User là Owner - có quyền");
        return true;
      }

      // Project Manager có quyền
      if (isProjectManager(project)) {
        if (debugMode) console.log("User là Project Manager - có quyền");
        return true;
      }

      if (debugMode) console.log("User không có quyền");
      return false;
    },
    [isAdmin, isProjectOwner, isProjectManager, user, debugMode]
  );

  // Wrapper để xử lý khi project là null
  const safePermissionCheck = useCallback(
    (checkFunction) => (project) => {
      // Nếu không có user, không có quyền
      if (!user) {
        if (debugMode) console.log("No user - Permission denied");
        return false;
      }

      // Nếu không có project, không có quyền
      if (!project) {
        if (debugMode) console.log("No project - Permission denied");
        return false;
      }

      // Gọi hàm kiểm tra quyền thực tế
      return checkFunction(project);
    },
    [user, debugMode]
  );

  // Các hàm kiểm tra quyền cụ thể - tất cả dùng chung một logic
  const rawCanEditProject = useCallback(
    (project) => {
      if (debugMode) console.log("Kiểm tra canEditProject");
      return hasPermission(project);
    },
    [hasPermission, debugMode]
  );

  const rawCanDeleteProject = useCallback(
    (project) => {
      if (debugMode) console.log("Kiểm tra canDeleteProject");
      return hasPermission(project);
    },
    [hasPermission, debugMode]
  );

  const rawCanArchiveProject = useCallback(
    (project) => {
      if (debugMode) console.log("Kiểm tra canArchiveProject");
      return hasPermission(project);
    },
    [hasPermission, debugMode]
  );

  const rawCanAddMembers = useCallback(
    (project) => {
      if (debugMode) console.log("Kiểm tra canAddMembers");
      return hasPermission(project);
    },
    [hasPermission, debugMode]
  );

  // Bọc các hàm kiểm tra bằng safePermissionCheck
  const canEditProject = safePermissionCheck(rawCanEditProject);
  const canDeleteProject = safePermissionCheck(rawCanDeleteProject);
  const canArchiveProject = safePermissionCheck(rawCanArchiveProject);
  const canAddMembers = safePermissionCheck(rawCanAddMembers);

  // Kiểm tra task - đơn giản hóa
  const canDeleteTask = useCallback(
    (task, project) => {
      if (!task) {
        if (debugMode) console.log("canDeleteTask: task không tồn tại");
        return false;
      }

      if (!user) {
        if (debugMode) console.log("canDeleteTask: user không tồn tại");
        return false;
      }

      // Admin luôn có quyền
      if (isAdmin()) return true;

      // Người tạo task có quyền xóa task chưa được gán
      const isCreator =
        task.createdBy &&
        String(task.createdBy._id || task.createdBy) === String(user._id);

      const hasNoAssignees = !task.assignees || task.assignees.length === 0;

      if (isCreator && hasNoAssignees) return true;

      // Owner và Project Manager có quyền
      return hasPermission(project);
    },
    [user, isAdmin, hasPermission, debugMode]
  );

  // Kiểm tra tài liệu - đơn giản hóa
  const canEditDocument = useCallback(
    (document, project) => {
      if (!document) {
        if (debugMode) console.log("canEditDocument: document không tồn tại");
        return false;
      }

      if (!user) {
        if (debugMode) console.log("canEditDocument: user không tồn tại");
        return false;
      }

      // Admin luôn có quyền
      if (isAdmin()) return true;

      // Người tạo tài liệu có quyền
      if (
        document.createdBy &&
        String(document.createdBy._id || document.createdBy) ===
          String(user._id)
      ) {
        return true;
      }

      // Owner và Project Manager có quyền
      return hasPermission(project);
    },
    [user, isAdmin, hasPermission, debugMode]
  );

  const canDeleteDocument = useCallback(
    (document, project) => {
      if (!document) {
        if (debugMode) console.log("canDeleteDocument: document không tồn tại");
        return false;
      }

      if (!user) {
        if (debugMode) console.log("canDeleteDocument: user không tồn tại");
        return false;
      }

      // Admin luôn có quyền
      if (isAdmin()) return true;

      // Người tạo tài liệu có quyền
      if (
        document.createdBy &&
        String(document.createdBy._id || document.createdBy) ===
          String(user._id)
      ) {
        return true;
      }

      // Owner và Project Manager có quyền
      return hasPermission(project);
    },
    [user, isAdmin, hasPermission, debugMode]
  );

  return {
    // Tiện ích
    debugMode,
    toggleDebugMode,
    getRoleName,
    ROLES,

    // Kiểm tra role
    isAdmin,
    isProjectOwner,
    isProjectManager,

    // Quyền dự án
    canEditProject,
    canDeleteProject,
    canArchiveProject,
    canAddMembers,

    // Quyền task
    canDeleteTask,

    // Quyền tài liệu
    canEditDocument,
    canDeleteDocument,
  };
};

export default usePermissions;
