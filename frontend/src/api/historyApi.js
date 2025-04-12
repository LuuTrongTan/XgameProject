import API from "./api";

/**
 * Lấy các hoạt động gần đây
 * @param {Object} params - Tham số truy vấn
 * @param {string} params.userId - ID của người dùng nếu admin xem dữ liệu của người dùng cụ thể 
 * @returns {Promise} - Promise chứa kết quả trả về
 */
export const getRecentActivities = async (params = {}) => {
  try {
    const response = await API.get("/activities/recent", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching recent activities:", error);
    throw error;
  }
};

/**
 * Lấy lịch sử thay đổi của task
 * @param {string} taskId - ID của task
 * @param {Object} params - Tham số truy vấn
 * @returns {Promise} - Promise chứa kết quả trả về
 */
export const getTaskHistory = async (taskId, params = {}) => {
  try {
    const response = await API.get(`/tasks/${taskId}/history`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching task history:", error);
    throw error;
  }
};

/**
 * Lấy lịch sử hoạt động của dự án
 * @param {string} projectId - ID của dự án
 * @param {Object} params - Tham số truy vấn
 * @param {number} params.page - Số trang
 * @param {number} params.limit - Số lượng hoạt động mỗi trang
 * @returns {Promise} - Promise chứa kết quả trả về
 */
export const getProjectHistory = async (projectId, params = {}) => {
  try {
    const response = await API.get(`/projects/${projectId}/history`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching project history:", error);
    throw error;
  }
};

/**
 * Lấy lịch sử hoạt động của người dùng
 * @param {Object} params - Tham số truy vấn
 * @param {number} params.page - Số trang
 * @param {number} params.limit - Số lượng hoạt động mỗi trang
 * @param {string} params.userId - ID của người dùng nếu admin xem dữ liệu của người dùng cụ thể
 * @returns {Promise} - Promise chứa kết quả trả về
 */
export const getUserHistory = async (params = {}) => {
  try {
    console.log('Getting user history with params:', params);
    
    // Luôn sử dụng cùng một endpoint, userId nằm trong query params
    const endpoint = "/history/user";
    console.log('Using endpoint with query params:', endpoint);
    
    const response = await API.get(endpoint, { params });
    console.log('User history response status:', response.status);
    console.log('User history response data:', response.data);
    
    if (!response.data.success) {
      console.error('API returned error:', response.data.message);
    } else if (!response.data.data || response.data.data.length === 0) {
      console.log('API returned empty data array');
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching user history:", error);
    console.error("Error details:", error.response?.data || error.message);
    
    // Trả về đối tượng error với định dạng tương tự API response
    return {
      success: false,
      message: error.response?.data?.message || 'Lỗi khi lấy lịch sử hoạt động',
      error: error.message
    };
  }
};

/**
 * Lấy lịch sử hoạt động hệ thống (chỉ cho admin)
 * @param {Object} params - Tham số truy vấn
 * @param {number} params.page - Số trang
 * @param {number} params.limit - Số lượng hoạt động mỗi trang 
 * @param {string} params.userId - ID của người dùng nếu admin xem dữ liệu của người dùng cụ thể
 * @returns {Promise} - Promise chứa kết quả trả về
 */
export const getSystemHistory = async (params = {}) => {
  try {
    console.log('Getting system history with params:', params);
    const endpoint = "/history/system";
    console.log('Using endpoint:', endpoint);
    
    const response = await API.get(endpoint, { params });
    console.log('System history response status:', response.status);
    console.log('System history response data:', response.data);
    
    if (!response.data.success) {
      console.error('API returned error:', response.data.message);
    } else if (!response.data.data || response.data.data.length === 0) {
      console.log('API returned empty data array');
    }
    
    return response.data;
  } catch (error) {
    console.error("Error fetching system history:", error);
    console.error("Error details:", error.response?.data || error.message);
    
    // Trả về đối tượng error với định dạng tương tự API response
    return {
      success: false,
      message: error.response?.data?.message || 'Lỗi khi lấy lịch sử hoạt động hệ thống',
      error: error.message
    };
  }
};

export default {
  getRecentActivities,
  getTaskHistory,
  getProjectHistory,
  getUserHistory,
  getSystemHistory
}; 