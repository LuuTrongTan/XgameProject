import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import fs from "fs";
import path from "path";
import uploadService from "../services/upload.services.js";

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
    
    const { projectId, sprintId, taskId } = req.params;
    
    // Validate required parameters
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters:", { projectId, sprintId, taskId });
      return res.status(400).json({ 
        success: false,
        message: "Missing required parameters: projectId, sprintId, taskId" 
      });
    }

    // Check authenticated user
    if (!req.user) {
      console.error("User not authenticated");
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }
    
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error("User ID not found in request");
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    // Check if the file was uploaded
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ 
        success: false,
        message: "No file uploaded" 
      });
    }
    
    // Get the task from the database
    const task = await Task.findById(taskId);
    if (!task) {
      console.error("Task not found with ID:", taskId);
      return res.status(404).json({ 
        success: false,
        message: "Task not found with ID: " + taskId
      });
    }

    // Create a sanitized filename from the original name
    let originalName = req.file.originalname;
    
    // Log the raw filename before processing
    console.log("Original raw filename:", originalName);
    
    // Ensure originalName is properly decoded
    if (req.fileOriginalNames && req.fileOriginalNames[req.file.filename]) {
      // Use the already decoded filename from multer middleware
      originalName = req.fileOriginalNames[req.file.filename];
      console.log("Using decoded filename from multer:", originalName);
    } else {
      // Try to decode if it's URI encoded (for Vietnamese characters)
      try {
        if (originalName.includes('%')) {
          originalName = decodeURIComponent(originalName);
          console.log("Decoded URI encoded filename:", originalName);
        }
        
        // Try to fix encoding issues by assuming Latin1 misinterpretation
        if (/[\u0080-\uFFFF]/.test(originalName)) {
          console.log("Filename contains non-ASCII characters");
          const latinBytes = Buffer.from(originalName, 'latin1');
          const utf8Name = latinBytes.toString('utf8');
          if (utf8Name !== originalName) {
            console.log("Converted from latin1 to utf8:", utf8Name);
            originalName = utf8Name;
          }
        }
      } catch (error) {
        console.error("Error decoding filename:", error);
        // Continue with the original name if decoding fails
      }
    }

    console.log("Final filename after processing:", originalName);

    // Lưu file vào Upload model thông qua service
    console.log("Saving file to Upload model");
    
    // Prepare file data before passing to uploadService
    // Make sure all required fields are present
    const fileData = {
      file: {
        ...req.file,
        originalname: originalName
      }
    };
    
    // Log the data being sent to uploadService
    console.log("File data being sent to uploadService:", {
      filename: fileData.file.filename,
      originalname: fileData.file.originalname,
      mimetype: fileData.file.mimetype,
      size: fileData.file.size,
      path: fileData.file.path
    });
    
    // Check for any null or undefined values
    if (!fileData.file.filename || !fileData.file.path) {
      console.error("Critical file data missing:", {
        filename: fileData.file.filename, 
        path: fileData.file.path
      });
      return res.status(500).json({
        success: false,
        message: "File upload failed - missing critical data"
      });
    }

    const uploadResult = await uploadService.saveFileInfo(fileData, {
      userId,
      taskId,
      projectId,
      permissions: 'public' // Mặc định là công khai
    });

    console.log("File saved to Upload model:", uploadResult._id);

    // Create the attachment entry for Task model
    const attachment = {
      _id: uploadResult._id, // Sử dụng ID từ Upload model
      name: originalName,
      filename: req.file.filename,
      path: req.file.path,
      url: `uploads/${req.file.filename}`, // Chắc chắn đúng định dạng đường dẫn truy cập
      size: req.file.size,
      type: req.file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date(),
      // Thêm tham chiếu đến model Upload
      uploadId: uploadResult._id,
      // Thêm quyền truy cập "public" để cho phép mọi người xem
      accessControl: {
        public: true, 
        permissions: []
      }
    };

    console.log("Adding attachment to task:", {
      taskId: task._id,
      attachment: {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        url: attachment.url,
        accessControl: attachment.accessControl
      }
    });

    // Add the attachment to the task
    if (!task.attachments) {
      task.attachments = [];
    }
    
    task.attachments.push(attachment);
    
    // Save the task with the new attachment
    await task.save();
    console.log("Task saved with new attachment");

    // Get the ID of the newly added attachment
    const newAttachmentId = task.attachments[task.attachments.length - 1]._id;

    // Sử dụng service để lấy URL đầy đủ
    const fullUrl = uploadService.getFullUrl({
      filename: req.file.filename
    }, req);

    const attachmentWithFullUrl = {
      ...attachment,
      _id: newAttachmentId,
      id: newAttachmentId, // Add both formats for frontend compatibility
      fullUrl: fullUrl
    };

    console.log("Successfully added attachment:", {
      taskId: task._id,
      attachmentId: newAttachmentId,
      filename: originalName,
      fullUrl: fullUrl
    });

    // Return success response with the attachment data
    return res.status(200).json({
      success: true,
      message: "Attachment added successfully",
      data: {
        attachment: attachmentWithFullUrl,
        task: task
      }
    });
  } catch (error) {
    console.error("Error adding attachment:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      success: false,
      message: "Server error when adding attachment", 
      error: error.message
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
    console.log(`Xóa attachment ${attachmentId} từ task ${taskId}`);

    // Tìm task
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
    if (!task.attachments || task.attachments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task không có attachments'
      });
    }

    // Tìm vị trí của attachment trong mảng
    const index = task.attachments.findIndex(att => 
      att._id.toString() === attachmentId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy attachment'
      });
    }

    // Lấy thông tin attachment trước khi xóa
    const attachment = task.attachments[index];
    console.log("Attachment to delete:", attachment);

    // 1. Xóa từ Upload model nếu có tham chiếu
    const uploadId = attachment.uploadId || attachment._id;
    if (uploadId) {
      try {
        // Xóa file thông qua service
        await uploadService.deleteFile(uploadId, req.user.id);
        console.log(`Đã xóa file từ Upload model: ${uploadId}`);
      } catch (uploadError) {
        console.error("Lỗi khi xóa từ Upload model:", uploadError);
        // Tiếp tục xử lý ngay cả khi có lỗi
      }
    }

    // 2. Xóa file thực tế từ đĩa nếu không xóa qua service
    if (!uploadId) {
      try {
        if (attachment.path && fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
          console.log(`Đã xóa file: ${attachment.path}`);
        } else if (attachment.filename) {
          const filePath = path.join(process.cwd(), 'uploads', attachment.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Đã xóa file: ${filePath}`);
          }
        }
      } catch (fileError) {
        console.error("Lỗi khi xóa file từ đĩa:", fileError);
      }
    }

    // 3. Xóa attachment khỏi task
    task.attachments.splice(index, 1);
    await task.save();

    res.status(200).json({
      success: true,
      message: "Đã xóa tệp đính kèm",
    });
  } catch (error) {
    console.error("Lỗi khi xóa tệp đính kèm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa tệp đính kèm",
      error: error.message,
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