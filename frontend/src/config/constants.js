export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  MEMBER: "member",
};

export const getRoleName = (roleValue) => {
  switch (roleValue) {
    case ROLES.ADMIN:
      return "Admin";
    case ROLES.PROJECT_MANAGER:
      return "Project Manager";
    case ROLES.MEMBER:
      return "Member";
    default:
      return roleValue;
  }
};

export const PROJECT_STATUS = {
  ACTIVE: "Đang hoạt động",
  COMPLETED: "Hoàn thành",
  CLOSED: "Đóng",
};

export const getStatusColor = (status) => {
  if (!status) return "#4CAF50";
  switch (status.toLowerCase()) {
    case "đang hoạt động":
      return "#4CAF50";
    case "hoàn thành":
      return "#2196F3";
    case "đóng":
      return "#9E9E9E";
    default:
      return "#4CAF50";
  }
};

export const getStatusLabel = (status) => {
  if (!status) return "Đang hoạt động";
  switch (status.toLowerCase()) {
    case "đang hoạt động":
      return "Đang hoạt động";
    case "hoàn thành":
      return "Hoàn thành";
    case "đóng":
      return "Đóng";
    default:
      return "Đang hoạt động";
  }
};

// Constants for task statuses
export const TASK_STATUS = {
  TODO: "todo",
  IN_PROGRESS: "inProgress",
  REVIEW: "review",
  DONE: "done"
};

// Get task status color object with bg and color properties
export const getTaskStatusColor = (status) => {
  switch (status) {
    case TASK_STATUS.TODO:
      return { bg: "rgba(66, 165, 245, 0.08)", color: "rgba(25, 118, 210, 0.7)" };
    case TASK_STATUS.IN_PROGRESS:
      return { bg: "rgba(255, 152, 0, 0.08)", color: "rgba(245, 124, 0, 0.7)" };
    case TASK_STATUS.REVIEW:
      return { bg: "rgba(171, 71, 188, 0.08)", color: "rgba(123, 31, 162, 0.7)" };
    case TASK_STATUS.DONE:
      return { bg: "rgba(76, 175, 80, 0.08)", color: "rgba(46, 125, 50, 0.7)" };
    default:
      return { bg: "rgba(66, 165, 245, 0.08)", color: "rgba(25, 118, 210, 0.7)" };
  }
};

// Get task status label in Vietnamese
export const getTaskStatusLabel = (status) => {
  switch (status) {
    case TASK_STATUS.TODO:
      return "Chưa bắt đầu";
    case TASK_STATUS.IN_PROGRESS:
      return "Đang thực hiện";
    case TASK_STATUS.REVIEW:
      return "Đang kiểm tra";
    case TASK_STATUS.DONE:
      return "Hoàn thành";
    default:
      return "Không xác định";
  }
};

// Constants for task priorities
export const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

// Get priority label in Vietnamese
export const getTaskPriorityLabel = (priority) => {
  switch (priority) {
    case TASK_PRIORITY.LOW:
      return "Thấp";
    case TASK_PRIORITY.MEDIUM:
      return "Trung bình";
    case TASK_PRIORITY.HIGH:
      return "Cao";
    default:
      return "Không xác định";
  }
};

// Get priority color for display with bg and color properties
export const getTaskPriorityColor = (priority) => {
  switch (priority) {
    case TASK_PRIORITY.LOW:
      return { bg: "rgba(76, 175, 80, 0.08)", color: "rgba(46, 125, 50, 0.85)" };
    case TASK_PRIORITY.MEDIUM:
      return { bg: "rgba(255, 152, 0, 0.08)", color: "rgba(245, 124, 0, 0.85)" };
    case TASK_PRIORITY.HIGH:
      return { bg: "rgba(244, 67, 54, 0.08)", color: "rgba(211, 47, 47, 0.85)" };
    default:
      return { bg: "rgba(158, 158, 158, 0.08)", color: "rgba(117, 117, 117, 0.85)" };
  }
}; 