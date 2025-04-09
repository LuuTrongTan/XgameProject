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
            // Debug thông tin response
            console.log(`[Audit Log] Processing response for ${action} on ${entityType}`);
            
            let responseBody;
            try {
              responseBody = JSON.parse(data);
              console.log(`[Audit Log] Parsed response: ${JSON.stringify(responseBody)}`);
            } catch (parseError) {
              console.error('[Audit Log] Error parsing response data:', parseError);
              console.log('[Audit Log] Raw response data:', data);
              responseBody = {}; // Sử dụng object rỗng thay vì trả về sớm
            }
            
            // Đảm bảo responseBody hợp lệ
            if (!responseBody) {
              responseBody = {};
              console.warn('[Audit Log] Invalid response body, using empty object');
            }
            
            // Nếu request thành công hoặc không có trường success (coi như thành công)
            if (responseBody.success === true || responseBody.success === undefined) {
              // Lưu responseBody vào request để các callbacks có thể sử dụng
              req.responseBody = responseBody;
              
              // Lấy entity ID
              const entityId = getEntityId(req, responseBody);
              console.log(`[Audit Log] Entity ID: ${entityId}`);
              
              // Nếu không có entityId, bỏ qua
              if (!entityId) {
                console.warn('[Audit Log] No entityId found for audit log');
                return originalSend.call(this, data);
              }
              
              // Tạo dữ liệu log
              let details = {};
              let changes = {};
              
              try {
                if (getDetails) {
                  details = getDetails(req, responseBody);
                  console.log(`[Audit Log] Generated details:`, details);
                }
              } catch (detailsError) {
                console.error('[Audit Log] Error getting details:', detailsError);
              }
              
              try {
                if (getChanges) {
                  changes = getChanges(req, responseBody);
                  console.log(`[Audit Log] Generated changes:`, changes);
                }
              } catch (changesError) {
                console.error('[Audit Log] Error getting changes:', changesError);
              }
              
              const logData = {
                entityId,
                entityType,
                action,
                userId: req.user.id,
                projectId: req.params.projectId,
                sprintId: req.params.sprintId,
                details,
                changes,
              };
              
              console.log(`[Audit Log] Adding log with data:`, JSON.stringify(logData));
              
              // Thêm log và đảm bảo bắt lỗi đầy đủ
              auditLogService.addLog(logData)
                .then((savedLog) => {
                  console.log(`[Audit Log] Successfully logged ${action} action for ${entityType} ${entityId}`);
                  if (savedLog) {
                    console.log(`[Audit Log] Log ID: ${savedLog._id}`);
                  }
                })
                .catch(err => {
                  console.error('[Audit Log] Error saving log to database:', err);
                  if (err.name === 'ValidationError') {
                    console.error('[Audit Log] Validation errors:', err.errors);
                  }
                });
            } else {
              console.log(`[Audit Log] Skipping log due to unsuccessful response: ${responseBody.message || 'No success in response'}`);
            }
          } catch (error) {
            console.error('[Audit Log] Error in middleware:', error);
          }
        } else {
          console.log(`[Audit Log] Skipping log due to non-success status code: ${res.statusCode}`);
        }
        
        // Trả về response gốc
        return originalSend.call(this, data);
      };
      
      // Tiếp tục với các middleware tiếp theo
      next();
    } catch (error) {
      console.error('[Audit Log] Error in audit log middleware setup:', error);
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
    priority: req.body.priority,
    assignees: req.body.assignees,
    dueDate: req.body.dueDate,
    estimatedTime: req.body.estimatedTime,
    tags: req.body.tags,
    createdBy: req.user.name,
    createdAt: new Date().toISOString()
  })
);

/**
 * Log hành động cập nhật task
 */
export const logTaskUpdate = logAction(
  'Task',
  'update',
  (req) => req.params.taskId,
  (req, res) => {
    const updates = {};
    // Lấy oldValues từ response nếu có
    const oldValues = res.oldValues || {};
    
    Object.keys(req.body).forEach(key => {
      // Sử dụng oldValues từ response nếu có, ngược lại dùng req.task
      const oldValue = oldValues[key] !== undefined ? oldValues[key] : 
                      (req.task ? req.task[key] : undefined);
      
      updates[key] = {
        oldValue: oldValue,
        newValue: req.body[key]
      };
    });
    
    console.log('[Audit Log] Task update details generated:', updates);
    
    return {
      ...updates,
      updatedBy: req.user.name,
      updatedAt: new Date().toISOString()
    };
  },
  (req, res) => {
    const changes = {};
    // Lấy oldValues từ response nếu có
    const oldValues = res.oldValues || {};
    
    Object.keys(req.body).forEach(key => {
      // Sử dụng oldValues từ response nếu có, ngược lại dùng req.task
      const oldValue = oldValues[key] !== undefined ? oldValues[key] : 
                      (req.task ? req.task[key] : undefined);
      
      changes[key] = {
        oldValue: oldValue,
        newValue: req.body[key]
      };
    });
    
    return changes;
  }
);

/**
 * Log hành động xem task
 */
export const logTaskView = logAction(
  'Task',
  'view',
  (req) => req.params.taskId,
  (req) => ({
    viewedAt: new Date().toISOString(),
    viewerId: req.user.id,
    viewerName: req.user.name,
    viewerEmail: req.user.email
  })
);

/**
 * Log hành động xóa task
 */
export const logTaskDelete = logAction(
  'Task',
  'delete',
  (req) => req.params.taskId,
  (req) => ({ 
    taskName: req.task?.title || 'Unknown task',
    deletedBy: req.user.name,
    deletedAt: new Date().toISOString(),
    taskDetails: {
      title: req.task?.title,
      status: req.task?.status,
      priority: req.task?.priority,
      assignees: req.task?.assignees,
      dueDate: req.task?.dueDate
    }
  })
);

/**
 * Log hành động thay đổi trạng thái task
 */
export const logStatusChange = logAction(
  'Task',
  'status',
  (req) => req.params.taskId,
  (req, res) => {
    try {
      console.log('[Audit Log Status] Response data available:', JSON.stringify(res));
      
      // Ưu tiên lấy oldStatus từ nhiều nguồn theo thứ tự
      let oldStatus;
      
      // 1. Từ task đã được tải trong middleware trước đó
      if (req.task && req.task.status) {
        oldStatus = req.task.status;
        console.log('[Audit Log Status] Using oldStatus from req.task:', oldStatus);
      } 
      // 2. Từ trường oldStatus level cao nhất trong response 
      else if (res.oldStatus) {
        oldStatus = res.oldStatus;
        console.log('[Audit Log Status] Using oldStatus from res.oldStatus:', oldStatus);
      }
      // 3. Từ data.oldStatus trong response
      else if (res.data && res.data.oldStatus) {
        oldStatus = res.data.oldStatus;
        console.log('[Audit Log Status] Using oldStatus from res.data.oldStatus:', oldStatus);
      }
      // 4. Giá trị mặc định nếu không tìm thấy
      else {
        oldStatus = 'unknown';
        console.log('[Audit Log Status] Using default oldStatus:', oldStatus);
      }
      
      const newStatus = req.body.status;
      
      console.log('[Audit Log Status] Final status change values:', { 
        taskId: req.params.taskId, 
        oldStatus,
        newStatus, 
        user: req.user?.name 
      });
      
      return { 
        oldStatus,
        newStatus,
        changedBy: req.user.name,
        changedAt: new Date().toISOString(),
        reason: req.body.reason || 'Không có lý do'
      };
    } catch (error) {
      console.error('[Audit Log Status] Error generating status change details:', error);
      return {
        oldStatus: req.task?.status || 'unknown',
        newStatus: req.body.status,
        changedBy: req.user.name,
        changedAt: new Date().toISOString(),
        error: error.message
      };
    }
  },
  (req, res) => {
    try {
      // Ưu tiên lấy oldStatus từ nhiều nguồn theo thứ tự
      let oldStatus;
      
      // 1. Từ task đã được tải trong middleware trước đó
      if (req.task && req.task.status) {
        oldStatus = req.task.status;
      } 
      // 2. Từ trường oldStatus level cao nhất trong response
      else if (res.oldStatus) {
        oldStatus = res.oldStatus;
      }
      // 3. Từ data.oldStatus trong response
      else if (res.data && res.data.oldStatus) {
        oldStatus = res.data.oldStatus;
      }
      // 4. Giá trị mặc định nếu không tìm thấy
      else {
        oldStatus = 'unknown';
      }
      
      return {
        status: {
          oldValue: oldStatus,
          newValue: req.body.status
        }
      };
    } catch (error) {
      console.error('[Audit Log Status] Error generating status change records:', error);
      return {
        status: {
          oldValue: req.task?.status || 'unknown',
          newValue: req.body.status
        }
      };
    }
  }
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

export const logTaskProgress = logAction(
  'Task',
  'progress',
  (req) => req.params.taskId,
  (req) => ({
    oldProgress: req.task?.progress || 0,
    newProgress: req.body.progress,
    changedBy: req.user.name,
    changedAt: new Date().toISOString(),
    notes: req.body.notes || 'Không có ghi chú'
  })
);

export const logTaskTime = logAction(
  'Task',
  'time',
  (req) => req.params.taskId,
  (req) => ({
    oldEstimatedTime: req.task?.estimatedTime,
    newEstimatedTime: req.body.estimatedTime,
    oldActualTime: req.task?.actualTime,
    newActualTime: req.body.actualTime,
    changedBy: req.user.name,
    changedAt: new Date().toISOString()
  })
);

export const logTaskAssignee = logAction(
  'Task',
  'assignee',
  (req) => req.params.taskId,
  (req) => ({
    oldAssignees: req.task?.assignees || [],
    newAssignees: req.body.assignees || [],
    changedBy: req.user.name,
    changedAt: new Date().toISOString(),
    action: req.body.action || 'assign' // 'assign' hoặc 'unassign'
  })
); 