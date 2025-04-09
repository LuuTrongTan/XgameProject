import auditLogService from '../services/auditlog.service.js';

/**
 * Middleware ghi log hành động thay đổi
 * @param {string} entityType - Loại entity
 * @param {string} action - Loại hành động
 * @param {Function} getEntityId - Callback để lấy entityId từ request
 * @param {Function} getDetails - Callback để lấy thông tin chi tiết từ request
 * @param {Function} getChanges - Callback để lấy thông tin thay đổi
 * @returns {Function} Middleware function
 */
export const logAction = (entityType, action, getEntityId, getDetails = null, getChanges = null) => {
  return async (req, res, next) => {
    // Lưu response ban đầu để theo dõi
    const originalSend = res.send;
    
    try {
      res.send = function (data) {
        // Khôi phục function gốc
        res.send = originalSend;
        
        // Ghi log nếu request thành công (status 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const responseBody = JSON.parse(data);
            
            // Nếu request thành công
            if (responseBody.success) {
              const entityId = getEntityId(req, responseBody);
              
              // Nếu không có entityId, bỏ qua
              if (!entityId) {
                console.warn('No entityId found for audit log');
                return originalSend.call(this, data);
              }
              
              // Tạo dữ liệu log
              const logData = {
                entityId,
                entityType,
                action,
                userId: req.user.id,
                projectId: req.params.projectId,
                sprintId: req.params.sprintId,
                details: getDetails ? getDetails(req, responseBody) : {},
                changes: getChanges ? getChanges(req, responseBody) : {},
              };
              
              // Thêm log không đồng bộ để không làm chậm response
              auditLogService.addLog(logData)
                .then(() => console.log(`Logged ${action} action for ${entityType} ${entityId}`))
                .catch(err => console.error('Error logging action:', err));
            }
          } catch (error) {
            console.error('Error parsing response data for audit log:', error);
          }
        }
        
        // Trả về response gốc
        return originalSend.call(this, data);
      };
      
      // Tiếp tục với các middleware tiếp theo
      next();
    } catch (error) {
      console.error('Error in audit log middleware:', error);
      next();
    }
  };
};

/**
 * Log hành động tạo task
 */
export const logTaskCreate = logAction(
  'Task', 
  'create',
  (req, res) => res.data?.task?._id || res.data?._id,
  (req, res) => ({ 
    title: req.body.title,
    description: req.body.description,
    status: req.body.status || 'todo',
    priority: req.body.priority
  })
);

/**
 * Log hành động cập nhật task
 */
export const logTaskUpdate = logAction(
  'Task',
  'update',
  (req) => req.params.taskId,
  (req) => {
    // Xác định trường được cập nhật
    const updates = {};
    const field = Object.keys(req.body)[0]; // Lấy trường cập nhật chính
    
    if (field) {
      updates.field = field;
      updates.newValue = req.body[field];
    }
    
    return updates;
  },
  (req) => {
    // Chi tiết thay đổi với giá trị cũ và mới
    const changes = {};
    
    Object.keys(req.body).forEach(key => {
      changes[key] = {
        oldValue: req.task ? req.task[key] : undefined,
        newValue: req.body[key]
      };
    });
    
    return changes;
  }
);

/**
 * Log hành động xóa task
 */
export const logTaskDelete = logAction(
  'Task',
  'delete',
  (req) => req.params.taskId,
  (req) => ({ taskName: req.task?.title || 'Unknown task' })
);

/**
 * Log hành động thay đổi trạng thái task
 */
export const logStatusChange = logAction(
  'Task',
  'status',
  (req) => req.params.taskId,
  (req) => ({ 
    oldStatus: req.task?.status || 'unknown',
    newStatus: req.body.status
  }),
  (req) => ({
    status: {
      oldValue: req.task?.status || 'unknown',
      newValue: req.body.status
    }
  })
);

/**
 * Log hành động thêm tệp đính kèm
 */
export const logAttachmentAction = logAction(
  'Task',
  'attachment',
  (req) => req.params.taskId,
  (req, res) => ({ 
    action: 'add',
    fileName: res.data?.file?.originalname || res.data?.file?.name || req.file?.originalname || 'unknown file',
    fileId: res.data?.file?._id || res.data?.file?.id
  })
);

/**
 * Log hành động xóa tệp đính kèm
 */
export const logAttachmentDelete = logAction(
  'Task',
  'attachment',
  (req) => req.params.taskId,
  (req) => ({ 
    action: 'delete',
    fileName: req.attachment?.originalname || req.attachment?.name || 'unknown file',
    fileId: req.params.attachmentId
  })
);

/**
 * Log hành động thêm bình luận
 */
export const logCommentAction = logAction(
  'Task',
  'comment',
  (req) => req.params.taskId,
  (req, res) => {
    const commentData = res.data?.comment || res.data;
    return {
      action: 'add',
      commentId: commentData?._id || commentData?.id,
      content: req.body.content?.substring(0, 100) + (req.body.content?.length > 100 ? '...' : '')
    };
  }
);

/**
 * Log hành động gán người dùng vào task
 */
export const logAssignUser = logAction(
  'Task',
  'assign',
  (req) => req.params.taskId,
  (req) => {
    const assigneeId = req.body.userId || req.body.assigneeId;
    return {
      assigneeId,
      assigneeName: req.body.assigneeName || 'Unknown user'
    };
  }
); 