import Task from '../models/task.model.js';
import User from '../models/user.model.js';

// Hàm helper để kiểm tra quyền truy cập tệp đính kèm
const checkFileAccessPermission = async (taskId, userId) => {
  try {
    // Tìm task
    const task = await Task.findById(taskId)
      .populate('project')
      .populate('assignees');
    
    if (!task) {
      return { 
        hasAccess: false, 
        message: 'Không tìm thấy task' 
      };
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      return { 
        hasAccess: false, 
        message: 'Không tìm thấy thông tin người dùng' 
      };
    }
    
    // Kiểm tra admin hệ thống
    if (user.roles && user.roles.includes('Admin')) {
      return { hasAccess: true };
    }
    
    // Lấy thông tin dự án
    const project = task.project;
    if (!project) {
      return { 
        hasAccess: false, 
        message: 'Không tìm thấy thông tin dự án' 
      };
    }
    
    // Kiểm tra người dùng có phải là PM của dự án không
    const isProjectManager = project.members && project.members.some(
      member => member.user?.toString() === userId.toString() && 
      (member.role === 'manager' || member.role === 'admin')
    );
    
    if (isProjectManager) {
      return { hasAccess: true };
    }
    
    // Kiểm tra người dùng có được gán vào task không
    const isAssignee = task.assignees && task.assignees.some(
      assignee => {
        if (assignee._id) return assignee._id.toString() === userId.toString();
        return assignee.toString() === userId.toString();
      }
    );
    
    if (isAssignee) {
      return { hasAccess: true };
    }
    
    return { 
      hasAccess: false, 
      message: 'Bạn không có quyền truy cập tệp đính kèm này' 
    };
  } catch (error) {
    console.error("Lỗi kiểm tra quyền truy cập:", error);
    return { 
      hasAccess: false, 
      message: 'Lỗi xử lý yêu cầu' 
    };
  }
};

// Middleware cho việc kiểm tra quyền truy cập file
export const checkAttachmentAccess = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    
    const { hasAccess, message } = await checkFileAccessPermission(taskId, userId);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: message || 'Bạn không có quyền truy cập tệp đính kèm này'
      });
    }
    
    next();
  } catch (error) {
    console.error("Lỗi middleware kiểm tra quyền:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý yêu cầu',
      error: error.message
    });
  }
};

// Middleware kiểm tra quyền xóa file
export const checkDeletePermission = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = req.user.id;
    
    // Tìm task và attachment
    const task = await Task.findById(taskId)
      .populate('project')
      .populate('assignees');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }
    
    // Tìm attachment trong task
    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tệp đính kèm'
      });
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    
    // Kiểm tra admin hệ thống
    if (user.roles && user.roles.includes('Admin')) {
      return next();
    }
    
    // Lấy thông tin dự án
    const project = task.project;
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin dự án'
      });
    }
    
    // Kiểm tra người dùng có phải là PM của dự án không
    const isProjectManager = project.members && project.members.some(
      member => member.user?.toString() === userId.toString() && 
      (member.role === 'manager' || member.role === 'admin')
    );
    
    if (isProjectManager) {
      return next();
    }
    
    // Kiểm tra người dùng có phải là người tải lên file không
    const isUploader = attachment.uploadedBy && 
      attachment.uploadedBy.toString() === userId.toString();
    
    if (isUploader) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xóa tệp đính kèm này'
    });
  } catch (error) {
    console.error("Lỗi middleware kiểm tra quyền xóa:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý yêu cầu',
      error: error.message
    });
  }
}; 