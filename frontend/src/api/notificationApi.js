import API from "./api";

/**
 * Fetches the user's notifications from the server
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Number of notifications per page
 * @param {boolean} params.unreadOnly - Whether to fetch only unread notifications
 * @returns {Promise} - Promise containing notification data
 */
export const getNotifications = async (params = {}) => {
  const response = await API.get("/notifications", { params });
  return response.data;
};

/**
 * Gets the number of unread notifications
 * @returns {Promise} - Promise containing the count of unread notifications
 */
export const getUnreadCount = async () => {
  const response = await API.get("/notifications/unread-count");
  return response.data;
};

/**
 * Marks notifications as read
 * @param {Object} data - Request data
 * @param {Array} data.notificationIds - Array of notification IDs to mark as read
 * @param {boolean} data.all - Whether to mark all notifications as read
 * @returns {Promise} - Promise containing result
 */
export const markAsRead = async (data) => {
  const response = await API.put("/notifications/read", data);
  return response.data;
};

/**
 * Deletes notifications
 * @param {Object} data - Request data
 * @param {Array} data.notificationIds - Array of notification IDs to delete
 * @param {boolean} data.all - Whether to delete all notifications
 * @returns {Promise} - Promise containing result
 */
export const deleteNotifications = async (data) => {
  const response = await API.delete("/notifications", { data });
  return response.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotifications
}; 