import API from "./api";

/**
 * Lấy dữ liệu dashboard
 * @param {Object} params - Tham số truy vấn (userId nếu admin đang xem dữ liệu của 1 người dùng cụ thể)
 * @returns {Promise} - Promise chứa dữ liệu dashboard
 */
export const getDashboardData = async (params = {}) => {
  try {
    const response = await API.get("/dashboard/data", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Lỗi khi lấy dữ liệu dashboard",
      error: error
    };
  }
};

/**
 * Lấy dữ liệu dashboard của admin
 * @param {Object} params - Tham số truy vấn (userId nếu admin đang xem dữ liệu của 1 người dùng cụ thể)
 * @returns {Promise} - Promise chứa dữ liệu dashboard admin
 */
export const getAdminDashboard = async (params = {}) => {
  try {
    const response = await API.get("/dashboard/admin", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching admin dashboard:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Lỗi khi lấy dữ liệu dashboard admin",
      error: error
    };
  }
};

export default {
  getDashboardData,
  getAdminDashboard
}; 