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
  // Tắt debug mặc định
  const [debugMode, setDebugMode] = useState(false);

  // Debug log khi khởi tạo chỉ hiển thị nếu debugMode = true
  if (debugMode) {
    console.log("usePermissions - user từ useAuth:", user);
  }

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

  // Thêm các hàm kiểm tra quyền Sprint
  const rawCanCreateSprint = useCallback(
    (project) => {
      if (debugMode) console.log("Kiểm tra canCreateSprint");

      // Admin và Project Manager mới có quyền tạo sprint
      if (!user) return false;

      // Nếu user là admin hệ thống
      if (user.role === ROLES.ADMIN) return true;

      // Nếu không có project, kiểm tra quyền dựa trên projectRole
      if (!project) {
        return (
          user.projectRole === ROLES.PROJECT_MANAGER ||
          user.projectRole === ROLES.ADMIN
        );
      }

      // Nếu có project, kiểm tra quyền trong project đó
      // Owner luôn có quyền
      if (isProjectOwner(project)) return true;

      // Project Manager có quyền
      if (isProjectManager(project)) return true;

      return false;
    },
    [user, isProjectOwner, isProjectManager, debugMode]
  );

  // Kiểm tra xem người dùng có quyền sửa sprint hay không 
  const rawCanEditSprint = useCallback(
    (project) => {
      if (debugMode) {
        console.log("Kiểm tra canEditSprint với project:", project);
        console.log("User hiện tại:", user);
      }

      // Sử dụng hàm hasPermission như trong các hàm project
      return hasPermission(project);
    },
    [hasPermission, debugMode]
  );

  const rawCanDeleteSprint = useCallback(
    (project) => {
      if (debugMode) {
        console.log("Kiểm tra canDeleteSprint với project:", project);
        console.log("User hiện tại:", user);
      }

      // Sử dụng hàm hasPermission như trong các hàm project
      return hasPermission(project);
    },
    [hasPermission, debugMode]
  );

  // Bọc các hàm kiểm tra bằng safePermissionCheck
  const canEditProject = safePermissionCheck(rawCanEditProject);
  const canDeleteProject = safePermissionCheck(rawCanDeleteProject);
  const canArchiveProject = safePermissionCheck(rawCanArchiveProject);
  const canAddMembers = safePermissionCheck(rawCanAddMembers);

  // Thêm các hàm sprint
  const canCreateSprint = safePermissionCheck(rawCanCreateSprint);
  const canEditSprint = safePermissionCheck(rawCanEditSprint);
  const canDeleteSprint = safePermissionCheck(rawCanDeleteSprint);

  // Kiểm tra task - đơn giản hóa
  const canEditTask = useCallback(
    (task, project) => {
      if (!task) {
        if (debugMode) console.log("canEditTask: task không tồn tại");
        return false;
      }

      if (!user) {
        if (debugMode) console.log("canEditTask: user không tồn tại");
        return false;
      }

      // Admin luôn có quyền
      if (isAdmin()) return true;

      // Người tạo task có quyền sửa
      const isCreator =
        task.createdBy &&
        String(task.createdBy._id || task.createdBy) === String(user._id);

      if (isCreator) return true;

      // Người được gán task có quyền sửa
      const isAssigned =
        task.assignees &&
        task.assignees.some(
          (assignee) => String(assignee._id || assignee) === String(user._id)
        );

      if (isAssigned) return true;

      // Owner và Project Manager có quyền
      return hasPermission(project);
    },
    [user, isAdmin, hasPermission, debugMode]
  );

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

  // Kiểm tra xem người dùng có phải là thành viên của sprint hay không
  const isSprintMember = useCallback(
    (sprint) => {
      if (!sprint || !user) {
        if (debugMode)
          console.log("isSprintMember: user hoặc sprint không tồn tại");
        return false;
      }

      // Kiểm tra user có trong danh sách thành viên của sprint không
      if (!sprint.members || !Array.isArray(sprint.members)) {
        if (debugMode)
          console.log("isSprintMember: sprint không có danh sách thành viên");
        return false;
      }

      const isMember = sprint.members.some((member) => {
        const memberId = member.user?._id || member.user;
        const userId = user._id;
        return memberId && String(memberId) === String(userId);
      });

      if (debugMode) {
        console.log("isSprintMember check:");
        console.log("- User:", user?.name, user?._id);
        console.log(
          "- Sprint members:",
          sprint.members.map((m) => m.user?._id || m.user)
        );
        console.log("- Is member:", isMember);
      }

      return isMember;
    },
    [user, debugMode]
  );

  // Kiểm tra xem người dùng có quyền xem sprint hay không
  const canViewSprint = useCallback(
    (sprint) => {
      if (debugMode) console.log("Kiểm tra canViewSprint");

      // Admin luôn có quyền
      if (isAdmin()) {
        if (debugMode) console.log("canViewSprint: User là Admin - có quyền");
        return true;
      }

      // Nếu là project owner hoặc project manager thì có quyền
      if (sprint && sprint.project) {
        if (isProjectOwner(sprint.project)) {
          if (debugMode)
            console.log("canViewSprint: User là Project Owner - có quyền");
          return true;
        }

        if (isProjectManager(sprint.project)) {
          if (debugMode)
            console.log("canViewSprint: User là Project Manager - có quyền");
          return true;
        }
      }

      // Kiểm tra xem user có phải là thành viên của sprint không
      if (isSprintMember(sprint)) {
        if (debugMode)
          console.log(
            "canViewSprint: User là thành viên của sprint - có quyền"
          );
        return true;
      }

      if (debugMode)
        console.log("canViewSprint: User không có quyền xem sprint");
      return false;
    },
    [isAdmin, isProjectOwner, isProjectManager, isSprintMember, debugMode]
  );

  // Kiểm tra xem người dùng có quyền quản lý thành viên sprint hay không
  const canManageSprintMembers = useCallback(
    (sprint) => {
      if (debugMode) console.log("Kiểm tra canManageSprintMembers với sprint:", sprint);

      // Nếu không có sprint, không có quyền
      if (!sprint) {
        if (debugMode)
          console.log("canManageSprintMembers: sprint không tồn tại");
        return false;
      }

      // Admin luôn có quyền
      if (isAdmin()) {
        if (debugMode)
          console.log("canManageSprintMembers: User là Admin - có quyền");
        return true;
      }

      // Kiểm tra người tạo sprint
      if (sprint.createdBy && String(sprint.createdBy) === String(user?._id)) {
        if (debugMode)
          console.log("canManageSprintMembers: User là người tạo sprint - có quyền");
        return true;
      }

      // Nếu user là project manager hệ thống  
      if (user?.role === ROLES.PROJECT_MANAGER) {
        if (debugMode)
          console.log(`canManageSprintMembers: User có role hệ thống ${user.role} - có quyền`);
        return true;
      }

      // Kiểm tra quyền dựa trên project - sử dụng hàm hasPermission như trong các hàm khác
      if (sprint.project) {
        const hasProjectPermission = hasPermission(sprint.project);
        if (hasProjectPermission) {
          if (debugMode)
            console.log("canManageSprintMembers: User có quyền dựa trên project - có quyền");
          return true;
        }
      }

      if (debugMode)
        console.log(
          "canManageSprintMembers: User không có quyền quản lý thành viên sprint"
        );
      return false;
    },
    [isAdmin, hasPermission, user, debugMode]
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
    canCreateSprint,
    canEditSprint,
    canDeleteSprint,

    // Quyền task
    canEditTask,
    canDeleteTask,

    // Quyền tài liệu
    canEditDocument,
    canDeleteDocument,

    // Quyền sprint
    isSprintMember,
    canViewSprint,
    canManageSprintMembers,
  };
};

export default usePermissions;
