import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Avatar,
  Tooltip,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Card,
  CardMedia,
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  AccountCircle as UserIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import api from '../../api/api';
import { decodeFileName, formatFileSize } from '../../utilities/fileNameUtils';

const AttachmentsList = ({ 
  attachments = [], 
  onDelete, 
  canEdit = false, 
  currentUser, // Thêm thông tin người dùng hiện tại
  taskAssignees = [], // Thêm danh sách người được gán task
  projectRole = 'member' // Vai trò của người dùng trong dự án
}) => {
  console.log("AttachmentsList received:", attachments);
  const [uploaderInfo, setUploaderInfo] = useState({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState('');
  
  // Lấy thông tin người tải lên
  useEffect(() => {
    const fetchUploaderInfo = async () => {
      const userIds = [...new Set(attachments
        .filter(att => att.uploadedBy)
        .map(att => att.uploadedBy))];
      
      if (userIds.length === 0) return;
      
      try {
        // Lấy thông tin người dùng từ API
        const promises = userIds.map(id => api.get(`/users/${id}`));
        const responses = await Promise.allSettled(promises);
        
        const userInfo = {};
        responses.forEach((response, index) => {
          if (response.status === 'fulfilled' && response.value?.data?.data) {
            userInfo[userIds[index]] = response.value.data.data;
          }
        });
        
        setUploaderInfo(userInfo);
      } catch (error) {
        console.error('Error fetching uploader info:', error);
      }
    };
    
    fetchUploaderInfo();
  }, [attachments]);
  
  // Kiểm tra xem người dùng hiện tại có quyền xem và tải file không
  const canViewAndDownload = () => {
    console.log("Checking view permissions with:", {
      currentUser: currentUser?.id || currentUser?._id || "No user",
      projectRole,
      assigneesCount: taskAssignees?.length || 0
    });
    
    if (!currentUser) {
      console.log("No current user, denying access");
      return false;
    }
    
    // Admin và Project Manager luôn có quyền
    if (projectRole === 'admin' || projectRole === 'manager') {
      console.log("User is admin/manager, granting access");
      return true;
    }
    
    // System admin has access
    if (currentUser.roles && Array.isArray(currentUser.roles) && currentUser.roles.includes('Admin')) {
      console.log("User is system admin, granting access");
      return true;
    }
    
    // Người được gán task có quyền
    if (!taskAssignees || !Array.isArray(taskAssignees) || taskAssignees.length === 0) {
      console.log("No assignees found, defaulting permission to creator only");
      // No assignees specified, only project members can view
      return true; // Cho phép tất cả thành viên dự án xem tạm thời
    }
    
    const userId = currentUser._id || currentUser.id;
    
    const isAssignee = taskAssignees.some(assignee => {
      if (!assignee) return false;
      
      // Check if assignee is an object with _id or id
      const assigneeId = assignee._id || assignee.id || assignee;
      
      console.log(`Comparing assignee ${typeof assigneeId === 'object' ? JSON.stringify(assigneeId) : assigneeId} with user ${userId}`);
      
      // Convert to string for comparison if both are defined
      return assigneeId && userId && 
        (assigneeId.toString() === userId.toString() || assigneeId === userId);
    });
    
    if (isAssignee) {
      console.log("User is an assignee, granting access");
      return true;
    }
    
    // If we got here, the user doesn't have permission
    console.log("User has no permission to view/download files");
    console.log("Current user:", currentUser);
    console.log("Task assignees:", taskAssignees);
    
    return false;
  };
  
  // Kiểm tra xem người dùng có quyền xóa file cụ thể không
  const canDeleteFile = (attachment) => {
    console.log("Checking delete permissions for attachment:", {
      attachment: attachment?.id || attachment?._id || "No attachment",
      user: currentUser?.id || currentUser?._id || "No user",
      projectRole,
      uploader: attachment?.uploadedBy || "Unknown"
    });
    
    if (!currentUser || !attachment) {
      console.log("No user or attachment, denying delete permission");
      return false;
    }
    
    // Admin và Project Manager luôn có quyền xóa
    if (projectRole === 'admin' || projectRole === 'manager') {
      console.log("User is admin/manager, granting delete permission");
      return true;
    }
    
    // System admin has delete rights
    if (currentUser.roles && Array.isArray(currentUser.roles) && currentUser.roles.includes('Admin')) {
      console.log("User is system admin, granting delete permission");
      return true;
    }
    
    // Người tải lên file có quyền xóa file của mình
    const userId = currentUser.id || currentUser._id;
    const uploaderId = attachment.uploadedBy;
    
    console.log(`Comparing uploader ID ${uploaderId} with current user ID ${userId}`);
    
    // Convert to string for comparison if both are defined
    const isUploader = uploaderId && userId && 
      (uploaderId.toString() === userId.toString() || uploaderId === userId);
    
    if (isUploader) {
      console.log("User is the uploader, granting delete permission");
      return true;
    }
    
    console.log("User has no permission to delete this file");
    console.log("Current user:", currentUser);
    console.log("Attachment uploader:", attachment.uploadedBy);
    
    return false;
  };

  if (!attachments || !attachments.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Typography color="text.secondary">
          Chưa có tệp đính kèm nào
        </Typography>
      </Box>
    );
  }

  const handleDownload = (attachment) => {
    try {
      if (!attachment) {
        console.error("No attachment provided to download handler");
        return;
      }
      
      // Kiểm tra quyền tải file
      if (!canViewAndDownload()) {
        alert("Bạn không có quyền tải xuống file này");
        return;
      }
      
      // Check for URL existence
      if (!attachment.url && !attachment.fullUrl) {
        console.error("Attachment missing URL:", attachment);
        alert("Không thể tải xuống file - URL không hợp lệ");
        return;
      }
      
      let url = '';
      
      // Tạo URL đầy đủ từ attachment URL
      if (attachment.fullUrl) {
        url = attachment.fullUrl;
      } else if (attachment.url && attachment.url.startsWith('http')) {
        url = attachment.url;
      } else if (attachment.url) {
        // Sử dụng domain của backend
        const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
        url = apiUrl + (attachment.url.startsWith('/') ? attachment.url : `/${attachment.url}`);
      } else {
        throw new Error('Invalid attachment URL');
      }
      
      console.log("Downloading from URL:", url);
      
      // Lấy tên file từ attachment, nếu không có thì dùng phần cuối của URL
      const fileName = attachment.name || attachment.filename || url.split('/').pop() || 'download';
      
      // Tạo thẻ a ẩn để tải file đúng cách
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName; // Sử dụng tên file gốc
      document.body.appendChild(a);
      
      // Click để tải xuống
      a.click();
      
      // Xóa thẻ a sau khi tải xuống
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error("Error in download handler:", error);
      alert("Không thể tải xuống file. Vui lòng thử lại sau.");
    }
  };
  
  // Xử lý xem trước file
  const handlePreview = (attachment) => {
    try {
      if (!attachment) {
        console.error("No attachment provided to preview handler");
        return;
      }
      
      // Kiểm tra quyền xem file
      if (!canViewAndDownload()) {
        alert("Bạn không có quyền xem file này");
        return;
      }
      
      // Check for URL existence
      if (!attachment.url && !attachment.fullUrl) {
        console.error("Attachment missing URL:", attachment);
        alert("Không thể xem trước file - URL không hợp lệ");
        return;
      }
      
      let url = '';
      
      // Tạo URL đầy đủ từ attachment URL
      if (attachment.fullUrl) {
        url = attachment.fullUrl;
      } else if (attachment.url && attachment.url.startsWith('http')) {
        url = attachment.url;
      } else if (attachment.url) {
        // Sử dụng domain của backend
        const apiUrl = process.env.REACT_APP_API_URL || window.location.origin;
        url = apiUrl + (attachment.url.startsWith('/') ? attachment.url : `/${attachment.url}`);
      } else {
        throw new Error('Invalid attachment URL');
      }
      
      console.log("Preview URL:", url);
      
      // Sử dụng tên file đã được decode
      const fileName = decodeFileName(attachment.name || attachment.filename || 'File');
      setPreviewTitle(fileName);
      setPreviewType(attachment.type || getFileTypeFromName(fileName));
      setPreviewContent(url);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Error in preview handler:", error);
      alert("Không thể xem trước file. Vui lòng thử lại sau.");
    }
  };
  
  // Xử lý xóa file
  const handleDelete = (attachment) => {
    if (!canDeleteFile(attachment)) {
      alert("Bạn không có quyền xóa file này");
      return;
    }
    
    // Gọi hàm onDelete được truyền từ component cha
    onDelete && onDelete(attachment);
  };
  
  // Lấy loại file từ phần mở rộng của tên file
  const getFileTypeFromName = (filename) => {
    if (!filename) return '';
    
    // Lấy phần mở rộng (loại bỏ các tham số query URL nếu có)
    const filenameParts = filename.split('?')[0].split('.');
    if (filenameParts.length <= 1) return ''; // Không có phần mở rộng
    
    const extension = filenameParts.pop().toLowerCase();
    
    const mimeTypeMap = {
      // Tài liệu
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'txt': 'text/plain',
      
      // Hình ảnh
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
      
      // Video
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mov': 'video/quicktime',
      'mkv': 'video/x-matroska',
      'avi': 'video/x-msvideo',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4',
      
      // Nén
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      
      // Khác
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
    };
    
    return mimeTypeMap[extension] || '';
  };
  
  // Kiểm tra file có thể preview được không
  const canPreview = (type) => {
    if (!type) return false;
    
    // Danh sách các loại MIME có thể xem trước
    const previewableTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
      
      // Videos
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
      
      // Audio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4',
      
      // Documents
      'application/pdf'
    ];
    
    // Kiểm tra chính xác loại MIME
    if (previewableTypes.includes(type)) return true;
    
    // Kiểm tra theo loại file chung
    return (
      type.startsWith('image/') ||
      type.startsWith('video/') ||
      type.startsWith('audio/') ||
      type === 'application/pdf'
    );
  };
  
  // Render nội dung xem trước
  const renderPreview = () => {
    if (!previewContent) return null;
    
    if (previewType.includes('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <img 
            src={previewContent} 
            alt={previewTitle} 
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} 
          />
        </Box>
      );
    } else if (previewType.includes('video/')) {
      return (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', p: 2 }}>
          <video controls style={{ maxWidth: '100%', maxHeight: '70vh' }}>
            <source src={previewContent} type={previewType} />
            Trình duyệt của bạn không hỗ trợ video này.
          </video>
        </Box>
      );
    } else if (previewType.includes('audio/')) {
      return (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', p: 2 }}>
          <audio controls style={{ width: '100%' }}>
            <source src={previewContent} type={previewType} />
            Trình duyệt của bạn không hỗ trợ audio này.
          </audio>
        </Box>
      );
    } else if (previewType.includes('pdf')) {
      // Cách 1: Sử dụng iframe cơ bản (để trình duyệt tự xử lý)
      return (
        <Box sx={{ width: '100%', height: '70vh', p: 2, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Nếu không hiển thị đúng, vui lòng tải xuống để xem đầy đủ.
          </Typography>
          <iframe 
            src={previewContent}
            width="100%" 
            height="100%" 
            style={{ border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '4px' }}
            title={previewTitle}
            allow="fullscreen"
          >
            Trình duyệt của bạn không hỗ trợ PDF.
          </iframe>
        </Box>
      );
    }
    
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1">
          Không thể xem trước loại file này. Vui lòng tải xuống để xem.
        </Typography>
      </Box>
    );
  };
  
  const getFileIcon = (attachment) => {
    if (!attachment) return <FileIcon />;
    
    const type = attachment.type || '';
    
    if (type.includes('pdf')) {
      return <PdfIcon />;
    } else if (type.includes('image')) {
      return <ImageIcon />;
    } else if (type.includes('video')) {
      return <VideoIcon />;
    } else if (type.includes('audio')) {
      return <AudioIcon />;
    }
    
    return <FileIcon />;
  };
  
  // Hiển thị thông tin người tải lên
  const renderUploaderInfo = (attachment) => {
    if (!attachment) return 'Unknown user';
    
    // Ưu tiên sử dụng thông tin được lưu trực tiếp trong uploader field
    if (attachment.uploader && (attachment.uploader.name || attachment.uploader.email)) {
      const uploader = attachment.uploader;
      return (
        <Tooltip title={`Uploaded by: ${uploader.name || uploader.email}`} component="span">
          <Chip
            avatar={uploader.avatar ? <Avatar src={uploader.avatar} /> : <UserIcon />}
            label={uploader.name || uploader.email}
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
            component="span"
          />
        </Tooltip>
      );
    }
    
    // Fallback về cách cũ nếu không có uploader field
    const uploaderId = attachment.uploadedBy;
    if (!uploaderId) {
      return (
        <Chip 
          icon={<UserIcon fontSize="small" />} 
          label="Unknown user" 
          size="small" 
          variant="outlined"
          component="span"
        />
      );
    }
    
    const user = uploaderInfo[uploaderId];
    
    if (!user) {
      return (
        <Chip 
          icon={<UserIcon fontSize="small" />} 
          label="Unknown user" 
          size="small" 
          variant="outlined"
          component="span"
        />
      );
    }
    
    return (
      <Tooltip title={`Uploaded by: ${user.name || user.email}`} component="span">
        <Chip
          avatar={user.avatar ? <Avatar src={user.avatar} /> : <UserIcon />}
          label={user.name || user.email}
          size="small"
          variant="outlined"
          sx={{ ml: 1 }}
          component="span"
        />
      </Tooltip>
    );
  };

  return (
    <>
    <List>
        {[...attachments]
          .sort((a, b) => {
            // Lấy thời gian tải lên từ cả hai file
            const dateA = new Date(a.uploadedAt || a.createdAt || 0);
            const dateB = new Date(b.uploadedAt || b.createdAt || 0);
            // Sắp xếp giảm dần (mới nhất ở trên)
            return dateB - dateA;
          })
          .filter(attachment => attachment) // Filter out any null or undefined attachments
          .map((attachment) => {
          // Ensure attachment exists before accessing properties
          if (!attachment) return null;
          
          const id = attachment.id || attachment._id || `attachment-${Math.random().toString(36).substring(2, 15)}`;
          const name = decodeFileName(attachment.name || attachment.filename || 'Unnamed file');
          const size = formatFileSize(attachment.size);
          // Xử lý ngày tháng dạng string hoặc Date
          const uploadDate = attachment.uploadedAt || attachment.createdAt || new Date();
          const isPreviewable = attachment.type ? canPreview(attachment.type) : false;
          
          // Kiểm tra các quyền
          const userCanView = canViewAndDownload();
          const userCanDelete = canDeleteFile(attachment);
          
          return (
        <ListItem
              key={id}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 1,
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
          }}
        >
          <ListItemIcon>
                {getFileIcon(attachment)}
          </ListItemIcon>
          <ListItemText
                primary={name}
            secondary={
                  <React.Fragment>
                    <Typography variant="body2" component="span" display="block">
                      Tải lên: {format(new Date(uploadDate), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      {size && ` • ${size}`}
                    </Typography>
                    <Typography variant="body2" component="span" display="block">
                      Người tải lên: {renderUploaderInfo(attachment)}
                    </Typography>
                  </React.Fragment>
            }
          />
          <ListItemSecondaryAction>
                {isPreviewable && userCanView ? (
                  <IconButton
                    edge="end"
                    onClick={() => handlePreview(attachment)}
                    title="Xem trước"
                    sx={{ mr: 1 }}
                  >
                    <VisibilityIcon />
                  </IconButton>
                ) : isPreviewable && !userCanView && (
                  <Tooltip title="Bạn không có quyền xem file này">
                    <IconButton
                      edge="end"
                      disabled
                      sx={{ mr: 1 }}
                    >
                      <LockIcon />
                    </IconButton>
                  </Tooltip>
                )}
            
            {userCanView ? (
              <IconButton
                edge="end"
                onClick={() => handleDownload(attachment)}
                title="Tải xuống"
              >
                <DownloadIcon />
              </IconButton>
            ) : (
              <Tooltip title="Bạn không có quyền tải xuống file này">
                <IconButton
                  edge="end"
                  disabled
                >
                  <LockIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {canEdit && userCanDelete ? (
              <IconButton
                edge="end"
                onClick={() => handleDelete(attachment)}
                title="Xóa"
                sx={{ ml: 1 }}
              >
                <DeleteIcon />
              </IconButton>
            ) : canEdit && !userCanDelete && (
              <Tooltip title="Chỉ admin, quản lý dự án hoặc người tải lên mới có quyền xóa">
                <IconButton
                  edge="end"
                  disabled
                  sx={{ ml: 1 }}
                >
                  <LockIcon />
                </IconButton>
              </Tooltip>
            )}
          </ListItemSecondaryAction>
        </ListItem>
          );
        })}
    </List>

      {/* Dialog xem trước */}
      <Dialog 
        open={previewOpen} 
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" noWrap sx={{ maxWidth: '80%' }}>
            {previewTitle}
          </Typography>
          <IconButton onClick={() => setPreviewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {renderPreview()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Đóng</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              // Tìm attachment đang xem để tải xuống
              const attachment = attachments.find(att => {
                if (!att || !att.url) return false;
                
                const baseUrl = process.env.REACT_APP_API_URL || '';
                const url = att.url.startsWith('http') 
                  ? att.url 
                  : `${baseUrl}${att.url}`;
                return url === previewContent;
              });
              if (attachment) handleDownload(attachment);
              else {
                // Nếu không tìm thấy attachment, tạo một đối tượng giả với URL hiện tại
                const fileName = previewTitle || 'download';
                handleDownload({
                  name: fileName,
                  fullUrl: previewContent
                });
              }
            }}
            disabled={!canViewAndDownload()}
          >
            Tải xuống
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AttachmentsList; 