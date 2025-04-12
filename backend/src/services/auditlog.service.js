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
      console.log(`[AuditLog Service] ===== CREATING NEW LOG =====`);
      console.log(`[AuditLog Service] Entity: ${logData.entityType} ${logData.entityId}`);
      console.log(`[AuditLog Service] Action: ${logData.action}`);
      console.log(`[AuditLog Service] User: ${logData.userId}`);
      console.log(`[AuditLog Service] Project: ${logData.projectId}`);
      console.log(`[AuditLog Service] Sprint: ${logData.sprintId}`);
      console.log(`[AuditLog Service] Details: ${JSON.stringify(logData.details || {})}`);
      console.log(`[AuditLog Service] Changes: ${JSON.stringify(logData.changes || {})}`);
      
      // Kiểm tra dữ liệu đầu vào
      const validationErrors = [];
      if (!logData.entityId) validationErrors.push('Missing entityId');
      if (!logData.entityType) validationErrors.push('Missing entityType');
      if (!logData.action) validationErrors.push('Missing action');
      if (!logData.userId) validationErrors.push('Missing userId');
      
      if (validationErrors.length > 0) {
        console.error(`[AuditLog Service] Validation errors: ${validationErrors.join(', ')}`);
        throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
      }
      
      // Nếu có projectId nhưng chưa có projectName trong details, thử lấy thông tin project
      if (logData.projectId && 
          (!logData.details.projectName || logData.details.projectName === 'unknown')) {
        try {
          console.log(`[AuditLog Service] Fetching project info for ID: ${logData.projectId}`);
          // Import Project model trực tiếp ở đây để tránh circular dependency
          const Project = await import('../models/project.model.js').then(m => m.default);
          const project = await Project.findById(logData.projectId).select('name').exec();
          
          if (project && project.name) {
            console.log(`[AuditLog Service] Found project name: ${project.name}`);
            // Đảm bảo details đã được khởi tạo
            if (!logData.details) {
              logData.details = {};
            }
            // Cập nhật projectName trong details
            logData.details.projectName = project.name;
          } else {
            console.log(`[AuditLog Service] Project not found or has no name`);
          }
        } catch (projectError) {
          console.error(`[AuditLog Service] Error fetching project:`, projectError);
        }
      }
      
      // Nếu có sprintId nhưng chưa có sprintName trong details, thử lấy thông tin sprint
      if (logData.sprintId && 
          (!logData.details.sprintName || logData.details.sprintName === 'unknown')) {
        try {
          console.log(`[AuditLog Service] Fetching sprint info for ID: ${logData.sprintId}`);
          // Import Sprint model trực tiếp ở đây
          const Sprint = await import('../models/sprint.model.js').then(m => m.default);
          const sprint = await Sprint.findById(logData.sprintId).select('name').exec();
          
          if (sprint && sprint.name) {
            console.log(`[AuditLog Service] Found sprint name: ${sprint.name}`);
            // Đảm bảo details đã được khởi tạo
            if (!logData.details) {
              logData.details = {};
            }
            // Cập nhật sprintName trong details
            logData.details.sprintName = sprint.name;
          } else {
            console.log(`[AuditLog Service] Sprint not found or has no name`);
          }
        } catch (sprintError) {
          console.error(`[AuditLog Service] Error fetching sprint:`, sprintError);
        }
      }
      
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
      
      console.log(`[AuditLog Service] Prepared new log document: ${newLog._id}`);
      console.log(`[AuditLog Service] Saving to database...`);
      
      const savedLog = await newLog.save();
      console.log(`[AuditLog Service] Successfully saved log with ID: ${savedLog._id}`);
      console.log(`[AuditLog Service] Created at: ${savedLog.createdAt}`);
      return savedLog;
    } catch (error) {
      console.error('[AuditLog Service] Error adding audit log:', error);
      if (error.name === 'ValidationError') {
        console.error('[AuditLog Service] Mongoose validation errors:', Object.keys(error.errors).map(key => 
          `${key}: ${error.errors[key].message}`
        ));
      }
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
      console.log(`[AuditLog Service] Getting logs for ${entityType} ${entityId}`);
      const logs = await AuditLog.find({ 
        entityId, 
        entityType 
      })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
      
      console.log(`[AuditLog Service] Found ${logs.length} logs for ${entityType} ${entityId}`);
      return logs;
    } catch (error) {
      console.error('[AuditLog Service] Error getting entity logs:', error);
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
      console.log(`[AuditLog Service] Getting logs for Task ${taskId}`);
      return await this.getEntityLogs(taskId, 'Task');
    } catch (error) {
      console.error('[AuditLog Service] Error getting task logs:', error);
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
      console.log(`[AuditLog Service] Getting logs for Project ${projectId}`);
      const logs = await AuditLog.find({ 
        projectId 
      })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
      
      console.log(`[AuditLog Service] Found ${logs.length} logs for Project ${projectId}`);
      return logs;
    } catch (error) {
      console.error('[AuditLog Service] Error getting project logs:', error);
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
      console.log(`[AuditLog Service] Getting logs for Sprint ${sprintId}`);
      const logs = await AuditLog.find({ 
        sprintId 
      })
      .populate('user', 'name email avatar')
      .sort({ createdAt: -1 });
      
      console.log(`[AuditLog Service] Found ${logs.length} logs for Sprint ${sprintId}`);
      return logs;
    } catch (error) {
      console.error('[AuditLog Service] Error getting sprint logs:', error);
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
      console.log(`[AuditLog Service] Getting user activity for User ${userId}`);
      const logs = await AuditLog.find({ 
        user: userId 
      })
      .populate('entityId')
      .limit(limit)
      .sort({ createdAt: -1 });
      
      console.log(`[AuditLog Service] Found ${logs.length} activity logs for User ${userId}`);
      return logs;
    } catch (error) {
      console.error('[AuditLog Service] Error getting user activity:', error);
      throw error;
    }
  },

  /**
   * Lấy lịch sử của một đối tượng với pagination
   * @param {string} entityId - ID của đối tượng
   * @param {string} entityType - Loại đối tượng
   * @param {Object} filter - Điều kiện lọc
   * @param {Object} options - Tùy chọn pagination
   * @param {number} options.page - Trang hiện tại
   * @param {number} options.limit - Số bản ghi mỗi trang
   * @param {Object} options.sort - Điều kiện sắp xếp
   * @returns {Promise<Object>} - Kết quả với pagination
   */
  async getEntityLogsWithPagination(entityId, entityType, filter = {}, options = {}) {
    try {
      const { page = 1, limit = 30, sort = { createdAt: -1 } } = options;
      
      // Đảm bảo filter có entityId và entityType
      const query = {
        ...filter,
        entityId,
        entityType
      };

      // Đếm tổng số bản ghi
      const total = await AuditLog.countDocuments(query);

      // Tính toán pagination
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;

      // Lấy dữ liệu
      const logs = await AuditLog.find(query)
        .populate('user', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('[AuditLog Service] Error getting paginated logs:', error);
      throw error;
    }
  }
};

export default auditLogService; 