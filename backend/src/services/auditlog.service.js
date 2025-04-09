import AuditLog from '../models/auditlog.model.js';

/**
 * Service để quản lý lịch sử thay đổi
 */
const auditLogService = {
  /**
   * Thêm log vào hệ thống
   * @param {Object} logData - Dữ liệu log
   * @param {string} logData.entityId - ID của đối tượng
   * @param {string} logData.entityType - Loại đối tượng ('Task', 'Project', etc.)
   * @param {string} logData.action - Hành động ('create', 'update', etc.)
   * @param {string} logData.userId - ID của người thực hiện
   * @param {Object} logData.details - Chi tiết bổ sung
   * @param {Object} logData.changes - Các thay đổi (oldValue, newValue)
   * @param {string} logData.projectId - ID của dự án
   * @param {string} logData.sprintId - ID của sprint
   * @returns {Promise<Object>} - Log được tạo
   */
  async addLog(logData) {
    try {
      const newLog = new AuditLog({
        entityId: logData.entityId,
        entityType: logData.entityType,
        action: logData.action,
        user: logData.userId,
        details: logData.details || {},
        changes: logData.changes || {},
        projectId: logData.projectId,
        sprintId: logData.sprintId,
      });
      
      return await newLog.save();
    } catch (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử của một đối tượng
   * @param {string} entityId - ID của đối tượng
   * @param {string} entityType - Loại đối tượng
   * @returns {Promise<Array>} - Danh sách logs
   */
  async getEntityLogs(entityId, entityType) {
    try {
      return await AuditLog.find({ 
        entityId, 
        entityType 
      })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting entity logs:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử của task
   * @param {string} taskId - ID của task
   * @returns {Promise<Array>} - Danh sách logs
   */
  async getTaskLogs(taskId) {
    try {
      return await this.getEntityLogs(taskId, 'Task');
    } catch (error) {
      console.error('Error getting task logs:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử của dự án
   * @param {string} projectId - ID của dự án
   * @returns {Promise<Array>} - Danh sách logs
   */
  async getProjectLogs(projectId) {
    try {
      return await AuditLog.find({ 
        projectId 
      })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting project logs:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử của sprint
   * @param {string} sprintId - ID của sprint
   * @returns {Promise<Array>} - Danh sách logs
   */
  async getSprintLogs(sprintId) {
    try {
      return await AuditLog.find({ 
        sprintId 
      })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting sprint logs:', error);
      throw error;
    }
  },

  /**
   * Lấy các hoạt động gần đây của một người dùng
   * @param {string} userId - ID của người dùng
   * @param {number} limit - Số lượng logs tối đa
   * @returns {Promise<Array>} - Danh sách logs
   */
  async getUserActivity(userId, limit = 20) {
    try {
      return await AuditLog.find({ 
        user: userId 
      })
      .populate('entityId')
      .limit(limit)
      .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting user activity:', error);
      throw error;
    }
  }
};

export default auditLogService; 