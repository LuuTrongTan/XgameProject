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

  // Task permissions
  CREATE_TASK: "create_task",
  UPDATE_TASK: "update_task",
  DELETE_TASK: "delete_task",
  VIEW_TASK: "view_task",
  ASSIGN_TASK: "assign_task",

  // Document permissions
  UPLOAD_DOCUMENT: "upload_document",
  DELETE_DOCUMENT: "delete_document",
  VIEW_DOCUMENT: "view_document",
};
