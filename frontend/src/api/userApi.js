import api from "./api";

// Get all users
export const getAllUsers = async () => {
  try {
    const response = await api.get("/users");
    console.log("API response from getAllUsers:", response.data);
    if (response.data && response.data.success) {
      return response.data;
    }
    return { success: false, message: "Không thể lấy danh sách người dùng" };
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return { success: false, message: error.response?.data?.message || "Lỗi khi tải danh sách người dùng" };
  }
};

// Get user by ID
export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in getUserById:", error);
    return {
      success: false,
      message: "Không thể lấy thông tin người dùng",
      error: error.message,
    };
  }
};

// Update user
export const updateUser = async (id, data) => {
  try {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Error in updateUser:", error);
    return {
      success: false,
      message: "Không thể cập nhật thông tin người dùng",
      error: error.message,
    };
  }
};

// Delete user
export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return {
      success: false,
      message: "Không thể xóa người dùng",
      error: error.message,
    };
  }
};
