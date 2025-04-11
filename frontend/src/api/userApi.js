import API from "./api";

// Lấy danh sách người dùng
export const getAllUsers = async () => {
  try {
    const response = await API.get("/users");
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      message: error.customMessage || "Lỗi khi lấy danh sách người dùng",
    };
  }
};

// Lấy thông tin người dùng theo ID
export const getUserById = async (userId) => {
  try {
    const response = await API.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return {
      success: false,
      message: error.customMessage || "Lỗi khi lấy thông tin người dùng",
    };
  }
};

// Cập nhật thông tin người dùng
export const updateUser = async (userId, userData) => {
  try {
    const response = await API.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    return {
      success: false,
      message: error.customMessage || "Lỗi khi cập nhật thông tin người dùng",
    };
  }
};

// Xóa người dùng
export const deleteUser = async (userId) => {
  try {
    const response = await API.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    return {
      success: false,
      message: error.customMessage || "Lỗi khi xóa người dùng",
    };
  }
};

// Thay đổi vai trò người dùng (Admin only)
export const changeUserRole = async (userId, role) => {
  try {
    const response = await API.put(`/users/${userId}/role`, { role });
    return response.data;
  } catch (error) {
    console.error(`Error changing role for user ${userId}:`, error);
    return {
      success: false,
      message: error.customMessage || "Lỗi khi thay đổi vai trò người dùng",
    };
  }
};
