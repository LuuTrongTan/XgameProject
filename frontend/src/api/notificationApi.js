import API from "./api";

/**
 * Fetches notifications from the server
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Number of notifications per page
 * @param {boolean} params.unreadOnly - Whether to fetch only unread notifications
 * @param {string} params.userId - User ID if admin is viewing specific user's notifications
 * @returns {Promise} - Promise containing notification data
 */
export const getNotifications = async (params = {}) => {
  try {
    console.log('[Notifications API] Getting notifications with params:', params);
    
    // Luôn sử dụng cùng một endpoint, userId nằm trong query params
    const endpoint = "/notifications";
    console.log('[Notifications API] Using endpoint with query params:', endpoint);
    
    const response = await API.get(endpoint, { params });
    console.log('[Notifications API] Response status:', response.status);
    console.log('[Notifications API] Response data:', response.data);
    
    if (!response.data.success) {
      console.error('[Notifications API] API returned error:', response.data.message);
    } else if (!response.data.data || !response.data.data.notifications || response.data.data.notifications.length === 0) {
      console.log('[Notifications API] API returned empty notifications array');
    }
    
    return response.data;
  } catch (error) {
    console.error("[Notifications API] Error fetching notifications:", error);
    console.error("[Notifications API] Error details:", error.response?.data || error.message);
    
    // Trả về đối tượng error với định dạng tương tự API response
    return {
      success: false,
      message: error.response?.data?.message || 'Lỗi khi lấy thông báo',
      error: error.message
    };
  }
};

/**
 * Gets the number of unread notifications
 * @param {Object} params - Query parameters
 * @param {string} params.userId - User ID if admin is viewing specific user's notifications
 * @returns {Promise} - Promise containing the count of unread notifications
 */
export const getUnreadCount = async (params = {}) => {
  const endpoint = params.userId ? `/notifications/user/${params.userId}/unread-count` : "/notifications/unread-count";
  const response = await API.get(endpoint, { params });
  return response.data;
};

/**
 * Marks notifications as read
 * @param {Object} data - Request data
 * @param {Array} data.notificationIds - Array of notification IDs to mark as read
 * @param {boolean} data.all - Whether to mark all notifications as read
 * @param {string} data.userId - User ID if admin is marking notifications for a specific user
 * @returns {Promise} - Promise containing result
 */
export const markAsRead = async (data) => {
  const endpoint = data.userId ? `/notifications/user/${data.userId}/read` : "/notifications/read";
  const response = await API.put(endpoint, data);
  return response.data;
};

/**
 * Deletes notifications
 * @param {Object} data - Request data
 * @param {Array} data.notificationIds - Array of notification IDs to delete
 * @param {boolean} data.all - Whether to delete all notifications
 * @param {string} data.userId - User ID if admin is deleting notifications for a specific user
 * @returns {Promise} - Promise containing result
 */
export const deleteNotifications = async (data) => {
  const endpoint = data.userId ? `/notifications/user/${data.userId}` : "/notifications";
  const response = await API.delete(endpoint, { data });
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotifications
}; 