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