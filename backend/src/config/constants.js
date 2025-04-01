// Định nghĩa các role và quyền tương ứng
export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  MEMBER: "member",
};

export const PERMISSIONS = {
  // Project permissions
  CREATE_PROJECT: "create_project",
  UPDATE_PROJECT: "update_project",
  DELETE_PROJECT: "delete_project",
  VIEW_PROJECT: "view_project",
  ARCHIVE_PROJECT: "archive_project",
  MANAGE_MEMBERS: "manage_members",

  // Task permissions
  CREATE_TASK: "create_task",
  UPDATE_TASK: "update_task",
  DELETE_TASK: "delete_task",
  VIEW_TASK: "view_task",
  ASSIGN_TASK: "assign_task",

  // Sprint permissions
  CREATE_SPRINT: "create_sprint",
  UPDATE_SPRINT: "update_sprint",
  DELETE_SPRINT: "delete_sprint",
  VIEW_SPRINT: "view_sprint",
  MANAGE_SPRINT_MEMBERS: "manage_sprint_members",

  // Document permissions
  UPLOAD_DOCUMENT: "upload_document",
  DELETE_DOCUMENT: "delete_document",
  VIEW_DOCUMENT: "view_document",
};

// Định nghĩa các trạng thái task
export const TASK_STATUSES = {
  TODO: "todo",
  IN_PROGRESS: "inProgress",
  REVIEW: "review",
  DONE: "done"
};

// Định nghĩa các mức độ ưu tiên
export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};
