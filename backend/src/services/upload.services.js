import Upload from "../models/upload.model.js";
import fs from 'fs';
import path from 'path';
import mongoose from "mongoose";

class UploadService {
  // Lưu thông tin file vào database
  async saveFileInfo(fileData, options = {}) {
    try {
      console.log("\n=== DEBUG: uploadService.saveFileInfo ===");
      
      // Kiểm tra dữ liệu đầu vào
      if (!fileData) {
        console.error("fileData is NULL or UNDEFINED");
        throw new Error('Không có dữ liệu file');
      }
      
      console.log("fileData keys:", Object.keys(fileData));
      
      if (!fileData.file) {
        console.error("fileData.file is missing");
        throw new Error('Không có thông tin file');
      }
      
      const { userId, taskId = null, projectId = null, commentId = null, permissions = 'public' } = options;
      console.log("Options:", { userId, taskId, projectId, commentId, permissions });
      
      // Bắt buộc phải có userId
      if (!userId) {
        throw new Error('Thiếu thông tin người dùng tải lên');
      }
      
      // Lấy thông tin file
      const file = fileData.file;
      
      if (!file.filename || !file.path) {
        console.error("Missing critical file data", { 
          filename: file.filename,
          path: file.path
        });
        throw new Error('Thiếu thông tin quan trọng của file');
      }
      
      console.log("File details:", {
        filename: file.filename || 'missing',
        originalname: file.originalname || 'missing',
        mimetype: file.mimetype || 'missing', 
        size: file.size || 'missing',
        path: file.path || 'missing',
        fieldname: file.fieldname || 'missing'
      });

      // Xác định loại file
      let fileType = 'other';
      const mimetype = file.mimetype || '';
      if (mimetype.startsWith('image/')) fileType = 'image';
      else if (mimetype.startsWith('video/')) fileType = 'video';
      else if (mimetype.startsWith('audio/')) fileType = 'audio';
      else if (
        mimetype.includes('pdf') || 
        mimetype.includes('document') || 
        mimetype.includes('sheet') || 
        mimetype.includes('presentation')
      ) {
        fileType = 'document';
      }

      console.log("Determined file type:", fileType);

      // Kiểm tra file tồn tại
      try {
        const fileExists = fs.existsSync(file.path);
        console.log("File exists check:", fileExists);
        
        if (!fileExists) {
          throw new Error('File không tồn tại trên đĩa');
        }
        
        const stats = fs.statSync(file.path);
        console.log("File stats:", {
          size: stats.size,
          isFile: stats.isFile(),
          createdAt: stats.birthtime
        });
        
        if (!stats.isFile()) {
          throw new Error('Đường dẫn không phải là file hợp lệ');
        }
      } catch (fsError) {
        console.warn("File system check error:", fsError.message);
        throw new Error(`Lỗi kiểm tra file: ${fsError.message}`);
      }

      // Tạo bản ghi upload
      console.log("Creating Upload record");
      const upload = new Upload({
        filename: file.filename,
        originalname: file.originalname || 'unknown',
        path: file.path,
        mimetype: file.mimetype || 'application/octet-stream',
        size: file.size || 0,
        uploadedBy: userId,
        task: taskId,
        project: projectId,
        comment: commentId,
        type: fileType,
        permissions,
        status: 'completed'
      });

      // Lưu vào database
      const savedUpload = await upload.save();
      console.log("Upload record saved with ID:", savedUpload._id);
      
      if (!savedUpload || !savedUpload._id) {
        throw new Error('Không thể lưu thông tin file vào database');
      }
      
      return savedUpload;
    } catch (error) {
      console.error('Lỗi khi lưu thông tin file:', error);
      throw error;
    }
  }

  // Lấy thông tin file theo ID
  async getFileById(fileId) {
    try {
      console.log("Getting file by ID:", fileId);
      const file = await Upload.findById(fileId).populate('uploadedBy', 'name email avatar');
      console.log("File found:", file ? "Yes" : "No");
      return file;
    } catch (error) {
      console.error('Lỗi khi lấy thông tin file:', error);
      throw error;
    }
  }

  // Lấy tất cả file thuộc về một task
  async getFilesByTaskId(taskId) {
    try {
      console.log("Getting files for task:", taskId);
      const files = await Upload.find({ task: taskId }).populate('uploadedBy', 'name email avatar').sort('-createdAt');
      console.log(`Found ${files.length} files for task ${taskId}`);
      return files;
    } catch (error) {
      console.error('Lỗi khi lấy danh sách file của task:', error);
      throw error;
    }
  }

  // Xóa file
  async deleteFile(fileId, userId) {
    try {
      console.log("Deleting file:", fileId, "by user:", userId);
      const file = await Upload.findById(fileId);
      
      if (!file) {
        console.error("File not found:", fileId);
        throw new Error('File không tồn tại');
      }
      
      // Kiểm tra quyền: chỉ người tải lên hoặc admin mới có thể xóa
      console.log("Checking permissions - file owner:", file.uploadedBy.toString(), "requestor:", userId.toString());
      if (file.uploadedBy.toString() !== userId.toString()) {
        // Ở đây có thể thêm kiểm tra vai trò admin
        console.error("Permission denied - user is not the file owner");
        throw new Error('Không có quyền xóa file này');
      }
      
      // Xóa file khỏi đĩa
      console.log("Checking file on disk:", file.path);
      if (fs.existsSync(file.path)) {
        console.log("Deleting file from disk:", file.path);
        fs.unlinkSync(file.path);
      } else {
        console.warn("File not found on disk:", file.path);
      }
      
      // Xóa bản ghi
      console.log("Deleting record from database");
      await Upload.findByIdAndDelete(fileId);
      
      return { success: true, message: 'Đã xóa file thành công' };
    } catch (error) {
      console.error('Lỗi khi xóa file:', error);
      throw error;
    }
  }

  // Kiểm tra quyền truy cập file
  async checkFileAccess(fileId, userId, userRoles = []) {
    try {
      const file = await Upload.findById(fileId);
      if (!file) {
        throw new Error('File không tồn tại');
      }
      
      return file.checkPermission(userId, userRoles);
    } catch (error) {
      console.error('Lỗi khi kiểm tra quyền truy cập:', error);
      throw error;
    }
  }

  // Xử lý URL đầy đủ cho file
  getFullUrl(fileObj, req) {
    try {
      if (!fileObj) return null;
      
      const baseUrl = process.env.NODE_ENV === 'production'
        ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
        : `${req.protocol}://${req.get('host')}`;
      
      // Nếu file đã có URL đầy đủ
      if (fileObj.url && fileObj.url.startsWith('http')) {
        return fileObj.url;
      }
      
      // Nếu là file từ model Upload
      if (fileObj.filename) {
        return `${baseUrl}/uploads/${fileObj.filename}`;
      }
      
      // Fallback
      return `${baseUrl}/uploads/${fileObj._id || fileObj.id}`;
    } catch (error) {
      console.error('Lỗi khi tạo URL đầy đủ:', error);
      return null;
    }
  }
}

export default new UploadService(); 