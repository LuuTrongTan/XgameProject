import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import fs from "fs";
import path from "path";
import uploadService from "../services/upload.services.js";
import auditLogService from "../services/auditlog.service.js";

// Upload attachment for a task
export const addAttachment = async (req, res) => {
  try {
    console.log("\n=== DEBUG addAttachment ===");
    console.log("Request params:", req.params);
    console.log("Request headers:", {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
    });
    console.log("Request user:", req.user ? { id: req.user.id, name: req.user.name } : 'No user');
    console.log("Request file:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    
    // Kiểm tra xem có files từ multer hay không (req.files cho uploads nhiều file)
    const uploadedFiles = req.files || (req.file ? [req.file] : []);
    console.log(`Số lượng files được tải lên: ${uploadedFiles.length}`);
    
    if (uploadedFiles.length === 0) {
      console.error("Không có file nào được tải lên");
      return res.status(400).json({ 
        success: false,
        message: "Không có file nào được tải lên" 
      });
    }
    
    // Validate required parameters
    const { projectId, sprintId, taskId } = req.params;
    
    if (!projectId || !taskId) {
      console.error("Missing required parameters:", { projectId, taskId });
      return res.status(400).json({ 
        success: false,
        message: "Thiếu thông tin bắt buộc: projectId, taskId" 
      });
    }

    // Check authenticated user
    if (!req.user) {
      console.error("User not authenticated");
      return res.status(401).json({ 
        success: false,
        message: "Người dùng chưa đăng nhập" 
      });
    }
    
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error("User ID not found in request");
      return res.status(401).json({ 
        success: false,
        message: "Không tìm thấy ID người dùng" 
      });
    }

    // Get the task from the database
    const task = await Task.findById(taskId);
    if (!task) {
      console.error("Task not found with ID:", taskId);
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy task với ID: " + taskId
      });
    }

    // Khởi tạo mảng attachments nếu task chưa có
    if (!task.attachments) {
      task.attachments = [];
    }
    
    // Kết quả tải lên
    const uploadResults = [];
    const failedUploads = [];
    
    // Xử lý từng file tải lên
    for (const file of uploadedFiles) {
      try {
        console.log(`Đang xử lý file: ${file.originalname}`);
        
        // Lấy tên file gốc và xử lý encoding nếu cần
        let originalName = file.originalname;
        
        // Sử dụng tên file đã được decode từ middleware nếu có
        if (req.fileOriginalNames && req.fileOriginalNames[file.filename]) {
          originalName = req.fileOriginalNames[file.filename];
        }
        
        console.log("Đã xử lý tên file:", originalName);
        
        // Lưu file vào Upload model
        console.log("Đang lưu vào Upload model...");
        const uploadResult = await uploadService.saveFileInfo(
          { file: { ...file, originalname: originalName } },
          {
            userId,
            taskId,
            projectId,
            permissions: 'public'
          }
        );
        
        if (!uploadResult || !uploadResult._id) {
          console.error("Lỗi: Không thể lưu file vào Upload model");
          failedUploads.push({
            name: originalName,
            error: "Không thể lưu vào cơ sở dữ liệu"
          });
          continue;
        }
        
        console.log(`File đã được lưu với ID: ${uploadResult._id}`);
        
        // Tạo bản ghi đính kèm cho task
        const attachment = {
          _id: uploadResult._id,
          name: originalName,
          filename: file.filename,
          path: file.path,
          url: `uploads/${file.filename}`,
          size: file.size,
          type: file.mimetype,
          uploadedBy: userId,
          uploadedAt: new Date(),
          uploadId: uploadResult._id,
          accessControl: {
            public: true, 
            permissions: []
          }
        };
        
        // Thêm vào task và lưu
        task.attachments.push(attachment);
        
        // Lấy URL đầy đủ
        const fullUrl = uploadService.getFullUrl({
          filename: file.filename
        }, req);
        
        uploadResults.push({
          ...attachment,
          id: attachment._id,
          fullUrl
        });
        
      } catch (fileError) {
        console.error(`Lỗi khi xử lý file ${file.originalname}:`, fileError);
        failedUploads.push({
          name: file.originalname,
          error: fileError.message
        });
      }
    }
    
    // Lưu task sau khi đã thêm tất cả các file thành công
    if (uploadResults.length > 0) {
      await task.save();
      console.log(`Đã lưu task với ${uploadResults.length} tệp đính kèm mới`);
      
      // Ghi log cho việc thêm tệp đính kèm
      try {
        for (const attachment of uploadResults) {
          // Log chi tiết attachment để debug
          console.log('[DEBUG] Logging attachment to history:', {
            name: attachment.name,
            size: attachment.size,
            type: attachment.type,
            id: attachment._id || attachment.id
          });
          
          await auditLogService.addLog({
            entityId: taskId,
            entityType: 'Task',
            action: 'attachment',
            userId: userId,
            projectId: projectId,
            sprintId: sprintId || task.sprint,
            details: {
              attachmentId: attachment._id || attachment.id,
              attachmentName: attachment.name,
              name: attachment.name, // Thêm trường name để đảm bảo tương thích
              fileName: attachment.name, // Thêm trường fileName để đảm bảo tương thích
              action: 'add',
              size: attachment.size,
              fileSize: attachment.size, // Thêm trường fileSize để đảm bảo tương thích
              type: attachment.type
            }
          });
        }
        console.log(`Đã ghi log cho ${uploadResults.length} tệp đính kèm`);
      } catch (logError) {
        console.error("Lỗi khi ghi log:", logError);
      }
      
      // Lấy thông tin người dùng tải lên
      const user = await User.findById(userId).select('name email avatar');
      
      // Gửi thông báo real-time qua socket
      // 1. Emit to task room
      global.io.to(`task:${taskId}`).emit("attachments_added", {
        taskId,
        attachments: uploadResults,
        uploader: {
          id: userId,
          name: user ? user.name : "Unknown",
          avatar: user ? user.avatar : null
        }
      });
      
      // 2. Emit to project room
      global.io.to(`project:${projectId}`).emit("task_attachments_updated", {
        taskId,
        projectId,
        sprintId: sprintId || task.sprint,
        action: "added",
        count: uploadResults.length,
        uploader: {
          id: userId,
          name: user ? user.name : "Unknown"
        }
      });
      
      // 3. Emit to sprint room
      if (sprintId || task.sprint) {
        global.io.to(`sprint:${sprintId || task.sprint}`).emit("task_updated", {
          taskId,
          type: "attachments_added",
          data: {
            count: uploadResults.length
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Đã tải lên ${uploadResults.length} tệp đính kèm thành công`,
      data: {
        attachments: uploadResults,
        failed: failedUploads
      }
    });
  } catch (error) {
    console.error("Lỗi khi tải tệp đính kèm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải tệp đính kèm",
      error: error.message,
    });
  }
};

// Lấy danh sách tệp đính kèm của task
export const getTaskAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`Lấy attachments cho task: ${taskId}`);

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại",
      });
    }

    // Kết hợp hai nguồn: từ attachments của Task và từ model Upload
    const taskAttachments = [];
    
    // 1. Lấy từ Task model
    if (task.attachments && Array.isArray(task.attachments) && task.attachments.length > 0) {
      task.attachments.forEach(att => {
        taskAttachments.push({
          _id: att._id,
          id: att._id,
          name: att.name || 'Unnamed file',
          filename: att.filename,
          url: att.url,
          type: att.type || 'application/octet-stream',
          size: att.size || 0,
          uploadedBy: att.uploadedBy,
          uploadedAt: att.uploadedAt || new Date(),
          createdAt: att.uploadedAt || new Date(),
          accessControl: att.accessControl || { public: true },
          source: 'task'
        });
      });
    }
    
    // 2. Lấy từ Upload model
    let uploadAttachments = [];
    try {
      uploadAttachments = await uploadService.getFilesByTaskId(taskId);
      
      // Chuyển đổi các đối tượng Upload thành định dạng tương thích
      if (uploadAttachments && uploadAttachments.length > 0) {
        uploadAttachments = uploadAttachments.map(att => ({
          _id: att._id,
          id: att._id,
          name: att.originalname || 'Unnamed file',
          filename: att.filename,
          url: `/uploads/${att.filename}`,
          fullUrl: uploadService.getFullUrl(att, req),
          type: att.mimetype || 'application/octet-stream',
          size: att.size || 0,
          uploadedBy: att.uploadedBy?._id || att.uploadedBy,
          uploadedAt: att.createdAt || new Date(),
          createdAt: att.createdAt || new Date(),
          accessControl: { public: att.permissions === 'public' },
          source: 'upload'
        }));
      }
    } catch (error) {
      console.error("Lỗi khi lấy file từ Upload model:", error);
      // Tiếp tục với chỉ attachments từ Task model
    }
    
    // Kết hợp hai mảng và loại bỏ trùng lặp dựa trên ID
    const allAttachments = [...taskAttachments];
    
    // Thêm các file từ Upload model mà không có trong Task attachments
    uploadAttachments.forEach(ua => {
      if (!taskAttachments.some(ta => ta._id.toString() === ua._id.toString())) {
        allAttachments.push(ua);
      }
    });
    
    // Thêm fullUrl cho mỗi attachment nếu chưa có
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
      : `${req.protocol}://${req.get('host')}`;
      
    const attachments = allAttachments.map(att => {
      // Đã có fullUrl
      if (att.fullUrl) {
        return att;
      }
      
      // Tạo URL đầy đủ
      let fullUrl = '';
      if (att.url) {
        if (att.url.startsWith('http')) {
          fullUrl = att.url;
        } else {
          fullUrl = `${baseUrl}/${att.url.startsWith('/') ? att.url.substring(1) : att.url}`;
        }
      }
      
      return {
        ...att,
        fullUrl
      };
    });

    console.log(`Trả về ${attachments.length} attachments`);
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tệp đính kèm thành công",
      data: attachments,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tệp đính kèm:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách tệp đính kèm",
      error: error.message,
    });
  }
};

// Xóa tệp đính kèm
export const deleteAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = req.user.id || req.user._id;
    
    console.log(`Delete attachment request: Task=${taskId}, Attachment=${attachmentId}`);
    
    // Validate required parameters
    if (!taskId || !attachmentId) {
      return res.status(400).json({ 
        success: false,
        message: "Thiếu thông tin bắt buộc: taskId, attachmentId" 
      });
    }

    // Get the task from the database
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy task với ID: " + taskId
      });
    }

    // Tìm attachment trong danh sách
    const attachmentIndex = task.attachments.findIndex(
      att => att._id.toString() === attachmentId || 
            att.id?.toString() === attachmentId
    );
    
    if (attachmentIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy tệp đính kèm trong task" 
      });
    }
    
    // Lưu thông tin attachment trước khi xóa để ghi log
    const attachment = task.attachments[attachmentIndex];
    const attachmentName = attachment.name || 'Unknown file';
    const attachmentType = attachment.type || '';
    const attachmentSize = attachment.size || 0;
    
    // Xóa file khỏi upload model nếu có
    if (attachment.uploadId) {
      try {
        await uploadService.deleteFile(attachment.uploadId);
        console.log(`Đã xóa file từ Upload model: ${attachment.uploadId}`);
      } catch (uploadError) {
        console.error(`Lỗi khi xóa file từ Upload model: ${uploadError.message}`);
      }
    }
    
    // Xóa file vật lý nếu có path
    if (attachment.path) {
      try {
        fs.unlinkSync(attachment.path);
        console.log(`Đã xóa file vật lý: ${attachment.path}`);
      } catch (fileError) {
        console.error(`Lỗi khi xóa file vật lý: ${fileError.message}`);
      }
    }
    
    // Xóa khỏi task
    task.attachments.splice(attachmentIndex, 1);
    await task.save();
    
    // Ghi log cho việc xóa tệp đính kèm
    try {
      // Log chi tiết attachment để debug khi xóa
      console.log('[DEBUG] Logging attachment deletion to history:', {
        name: attachmentName,
        size: attachmentSize,
        type: attachmentType,
        id: attachmentId
      });
      
      await auditLogService.addLog({
        entityId: taskId,
        entityType: 'Task',
        action: 'attachment',
        userId: userId,
        projectId: task.project || null,
        sprintId: task.sprint || null,
        details: {
          attachmentId: attachmentId,
          attachmentName: attachmentName,
          name: attachmentName, // Thêm trường name để đảm bảo tương thích
          fileName: attachmentName, // Thêm trường fileName để đảm bảo tương thích
          action: 'delete',
          type: attachmentType,
          size: attachmentSize,
          fileSize: attachmentSize // Thêm trường fileSize để đảm bảo tương thích
        }
      });
      console.log(`Đã ghi log cho việc xóa tệp đính kèm ${attachmentId}`);
    } catch (logError) {
      console.error("Error logging attachment deletion:", logError);
    }
    
    return res.status(200).json({
      success: true,
      message: "Đã xóa tệp đính kèm thành công",
      data: {
        taskId: task._id,
        attachmentId: attachmentId,
        remainingAttachments: task.attachments.length
      }
    });
    
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa tệp đính kèm", 
      error: error.message
    });
  }
};

// Thêm hàm helper để kiểm tra quyền truy cập tệp đính kèm
export const checkFileAccessPermission = async (taskId, userId) => {
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
      member => member.user.toString() === userId.toString() && 
      (member.role === 'manager' || member.role === 'admin')
    );
    
    if (isProjectManager) {
      return { hasAccess: true };
    }
    
    // Kiểm tra người dùng có được gán vào task không
    const isAssignee = task.assignees && task.assignees.some(
      assignee => assignee._id.toString() === userId.toString() || 
      assignee.toString() === userId.toString()
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

// Middleware kiểm tra quyền truy cập file
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
      member => member.user.toString() === userId.toString() && 
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