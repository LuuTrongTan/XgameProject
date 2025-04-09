import Task from '../models/task.model.js';
import Upload from '../models/upload.model.js';
import fs from 'fs';
import path from 'path';

// Controller để tải xuống tệp đính kèm
export const downloadAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    
    // Tìm task
    const task = await Task.findById(taskId);
    
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
    
    // Kiểm tra thông tin file
    let filePath = '';
    let fileName = '';
    
    // Nếu có uploadId, lấy thông tin từ model Upload
    if (attachment.uploadId) {
      const uploadFile = await Upload.findById(attachment.uploadId);
      if (uploadFile) {
        filePath = uploadFile.path;
        fileName = uploadFile.originalname || attachment.name || 'download';
      }
    } else {
      // Nếu không có, sử dụng thông tin từ attachment trực tiếp
      filePath = attachment.path || path.join(process.cwd(), 'uploads', attachment.filename || '');
      fileName = attachment.name || attachment.filename || 'download';
    }
    
    // Kiểm tra file tồn tại
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('File không tồn tại:', filePath);
      
      // Nếu không tìm thấy file trên đĩa, thử sử dụng URL
      if (attachment.url) {
        const fileUrl = attachment.url.startsWith('http') 
          ? attachment.url 
          : `${req.protocol}://${req.get('host')}${attachment.url.startsWith('/') ? attachment.url : `/${attachment.url}`}`;
        
        return res.redirect(fileUrl);
      }
      
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại trên server'
      });
    }
    
    // Đọc thông tin file
    const fileStats = fs.statSync(filePath);
    
    // Set header cho việc tải xuống
    res.setHeader('Content-Type', attachment.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileStats.size);
    
    // Gửi file về client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Lỗi khi tải xuống file:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tải xuống file',
      error: error.message
    });
  }
}; 