import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Link,
  Avatar,
  Divider,
  InputAdornment,
  Stack,
  Paper,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import HistoryIcon from "@mui/icons-material/History";
import CommentIcon from "@mui/icons-material/Comment";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import api from "../../api/api";
import { useAuth } from "../../contexts/AuthContext";
import CommentForm from "../comments/CommentForm";
import CommentItem from "../comments/CommentItem";
import FileUploader from "./FileUploader";
import AttachmentsList from "./AttachmentsList";
import TaskAuditLog from "./TaskAuditLog";
import * as uploadApi from "../../api/uploadApi";
import { toast } from "react-hot-toast";

const TaskInteractions = ({ task, project, sprint, onUpdate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  
  // Ref để track xem comments đã fetch chưa
  const commentsLoadedRef = useRef(false);
  // Unique ID để giúp debug
  const instanceIdRef = useRef(`ti-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
  
  // Log khi component mount và unmount để debug
  useEffect(() => {
    console.log(`TaskInteractions [${instanceIdRef.current}] mounted for task ${task?._id}`);
    return () => {
      console.log(`TaskInteractions [${instanceIdRef.current}] unmounted for task ${task?._id}`);
    };
  }, [task?._id]);

  // Fetch data only when component mounts or task changes
  useEffect(() => {
    // Reset loaded flag when task changes
    commentsLoadedRef.current = false;
    
    // Sửa điều kiện để chỉ cần task._id, không nhất thiết phải có project._id và sprint._id
    // vì các phương thức fetchComments, fetchAttachments, fetchHistory đã được cập nhật
    // để lấy thông tin sprint và project từ task object
    if (task?._id) {
      console.log(`TaskInteractions [${instanceIdRef.current}] task changed, fetching data for task ${task._id}`);
      
      if (activeTab === 0) {
        fetchComments();
      } else if (activeTab === 1) {
        fetchAttachments();
      } else if (activeTab === 2) {
        fetchHistory();
      }
    }
  }, [task?._id]);

  // Handle tab changes
  useEffect(() => {
    // Sửa điều kiện để chỉ cần task._id, không nhất thiết phải có project._id và sprint._id
    if (!task?._id) return;

    if (activeTab === 0 && !commentsLoadedRef.current) {
      console.log(`TaskInteractions [${instanceIdRef.current}] tab changed to comments`);
      fetchComments();
    } else if (activeTab === 1) {
      console.log(`TaskInteractions [${instanceIdRef.current}] tab changed to attachments`);
      fetchAttachments();
    } else if (activeTab === 2) {
      console.log(`TaskInteractions [${instanceIdRef.current}] tab changed to history`);
      fetchHistory();
    }
  }, [activeTab, task?._id]);

  // Fetch comments
  const fetchComments = async () => {
    // Lấy ID từ task nếu không có từ tham số
    const taskId = task?._id;
    const taskSprintId = sprint?._id || task?.sprint || task?.sprintId;
    const taskProjectId = project?._id || task?.project || task?.projectId;

    // Không fetch lại nếu đang loading hoặc thiếu thông tin cần thiết
    if (!taskId || !taskProjectId || loadingComments) return;
    
    // Nếu đã load comments và có comments, không cần fetch lại
    if (commentsLoadedRef.current && comments.length > 0) {
      console.log(`TaskInteractions [${instanceIdRef.current}] comments already loaded, skipping fetch`);
      return;
    }
    
    setLoadingComments(true);
    commentsLoadedRef.current = false;  // Reset loaded flag when fetching
    
    try {
      console.log(`TaskInteractions [${instanceIdRef.current}] fetching comments for task ${taskId} using projectId=${taskProjectId}, sprintId=${taskSprintId}`);
      
      // Thay đổi endpoint để đảm bảo sử dụng đúng sprint ID
      let endpoint = `/projects/${taskProjectId}/`;
      if (taskSprintId) {
        endpoint += `sprints/${taskSprintId}/`;
      }
      endpoint += `tasks/${taskId}/comments`;
      
      const response = await api.get(endpoint);
      
      // Reset comments state trước khi set cái mới để tránh duplicate
      setComments([]);
      
      let newComments = [];
      if (response.data?.data?.comments) {
        newComments = response.data.data.comments;
      } else if (Array.isArray(response.data?.data)) {
        newComments = response.data.data;
      } else if (Array.isArray(response.data)) {
        newComments = response.data;
      }

      // Sắp xếp comments theo thời gian mới nhất 
      newComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Lọc duplicate comments trước khi lưu vào state bằng Map với key là comment ID
      const uniqueComments = Array.from(
        new Map(newComments.map(comment => [comment._id, comment])).values()
      );
      
      setComments(uniqueComments);
      console.log(`TaskInteractions [${instanceIdRef.current}] loaded ${uniqueComments.length} comments`);
      
      // Đánh dấu là đã load
      commentsLoadedRef.current = true;
    } catch (error) {
      console.error(`TaskInteractions [${instanceIdRef.current}] error fetching comments:`, error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Fetch attachments
  const fetchAttachments = async () => {
    // Lấy ID từ task nếu không có từ tham số
    const taskId = task?._id;
    const taskSprintId = sprint?._id || task?.sprint || task?.sprintId;
    const taskProjectId = project?._id || task?.project || task?.projectId;
    
    if (!taskId || !taskProjectId) return;
    
    setLoadingAttachments(true);
    try {
      // Thay đổi endpoint để đảm bảo sử dụng đúng sprint ID
      let endpoint = `/projects/${taskProjectId}/`;
      if (taskSprintId) {
        endpoint += `sprints/${taskSprintId}/`;
      }
      endpoint += `tasks/${taskId}/attachments`;
      
      console.log(`Fetching attachments from: ${endpoint}`);
      
      const response = await api.get(endpoint);
      
      let attachmentsData = [];
      
      if (response.data?.data?.attachments && Array.isArray(response.data.data.attachments)) {
        attachmentsData = response.data.data.attachments;
      } else if (Array.isArray(response.data?.data)) {
        attachmentsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        attachmentsData = response.data;
      }
      
      // Filter out any null or undefined items
      const validAttachments = attachmentsData.filter(att => att !== null && att !== undefined);
      setAttachments(validAttachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setAttachments([]); // Set to empty array on error
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    // Lấy ID từ task nếu không có từ tham số
    const taskId = task?._id;
    const taskSprintId = sprint?._id || task?.sprint || task?.sprintId;
    const taskProjectId = project?._id || task?.project || task?.projectId;
    
    if (!taskId || !taskProjectId) {
      console.log('Missing required IDs for fetching history');
      return;
    }
    
    setLoadingHistory(true);
    setHistory([]); // Reset history before fetching
    
    try {
      console.log(`Fetching history for task ${taskId} using projectId=${taskProjectId}, sprintId=${taskSprintId}`);
      
      // Thay đổi endpoint để đảm bảo sử dụng đúng sprint ID
      let endpoint = `/projects/${taskProjectId}/`;
      if (taskSprintId) {
        endpoint += `sprints/${taskSprintId}/`;
      }
      endpoint += `tasks/${taskId}/history`;
      
      const response = await api.get(endpoint);
      
      console.log('History response:', response.data);
      
      let historyData = [];
      if (response.data?.data?.history) {
        historyData = response.data.data.history;
      } else if (Array.isArray(response.data?.data)) {
        historyData = response.data.data;
      } else if (Array.isArray(response.data)) {
        historyData = response.data;
      }
      
      // Format history data
      const formattedHistory = historyData.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp || item.createdAt).toLocaleString('vi-VN'),
        changes: item.changes || {},
        user: item.user || { name: 'Unknown User' }
      }));
      
      console.log('Formatted history:', formattedHistory);
      setHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching task history:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Kiểm tra xem người dùng có phải là admin hoặc project manager không
  const isAdminOrManager = () => {
    // Kiểm tra nếu người dùng là admin hệ thống
    if (user?.roles?.includes('Admin')) {
      console.log("User is system admin");
      return true;
    }
    
    // Kiểm tra vai trò trong dự án
    if (!project?.members || !Array.isArray(project.members)) {
      console.log("No project members found");
      return false;
    }
    
    // Tìm thành viên trong dự án
    const member = project.members.find(m => {
      if (!m.user) return false;
      
      const memberId = m.user._id || m.user;
      const userId = user?._id || user?.id;
      
      return memberId?.toString() === userId?.toString() || memberId === userId;
    });
    
    console.log("User project role:", member?.role || "not found");
    
    // Kiểm tra tất cả các biến thể có thể có của vai trò admin/manager
    const managerRoles = ['admin', 'manager', 'project_manager', 'projectmanager', 'project-manager'];
    const isManager = member && managerRoles.includes(member.role);
    
    console.log("Is user a manager?", isManager);
    return isManager;
  };
  
  // Kiểm tra xem người dùng có phải là người được gán task không
  const isTaskAssignee = () => {
    if (!task?.assignees || !Array.isArray(task.assignees) || !user) {
      return false;
    }
    
    return task.assignees.some(assignee => {
      if (!assignee) return false;
      
      const assigneeId = assignee._id || assignee.id || assignee;
      const userId = user._id || user.id;
      
      return assigneeId && userId && 
        (assigneeId.toString() === userId.toString() || assigneeId === userId);
    });
  };
  
  // Kiểm tra quyền upload file
  const canUploadFile = () => {
    return isAdminOrManager() || isTaskAssignee();
  };

  // Check if comment is from current user
  const isCurrentUserComment = (comment) => {
    return comment.user?._id === user?._id || 
           comment.author?._id === user?._id || 
           comment.user?.email === user?.email || 
           comment.author?.email === user?.email;
  };

  // Handle reply to comment
  const handleReply = (comment) => {
    setReplyingTo(comment);
    // Focus vào form comment
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.scrollIntoView({ behavior: 'smooth' });
      commentForm.focus();
    }
  };

  // Handle adding comment
  const handleAddComment = async (commentText) => {
    if (!commentText || typeof commentText !== 'string') {
      console.error('Invalid comment content:', commentText);
      return;
    }

    try {
      // Kiểm tra xem comment này đã được gửi đi chưa bằng cách sử dụng buffer ngắn hạn
      const commentBuffer = localStorage.getItem('last_comment');
      const currentTimestamp = Date.now();
      
      // Nếu có comment trong buffer và thời gian gửi < 2 giây, bỏ qua
      if (commentBuffer) {
        try {
          const { text, timestamp } = JSON.parse(commentBuffer);
          if (text === commentText && (currentTimestamp - timestamp) < 2000) {
            console.log(`Comment skipped - duplicate detected within 2s: ${commentText}`);
            return;
          }
        } catch (e) {
          console.error('Error parsing comment buffer:', e);
        }
      }
      
      // Lưu comment hiện tại vào buffer
      localStorage.setItem('last_comment', JSON.stringify({
        text: commentText,
        timestamp: currentTimestamp
      }));
      
      // LẤY SPRINT ID TỪ TASK OBJECT NẾU SPRINT KHÔNG CÓ
      const taskSprintId = sprint?._id || task?.sprint || task?.sprintId;
      const taskProjectId = project?._id || task?.project || task?.projectId;
      
      if (!taskSprintId) {
        console.error(`TaskInteractions [${instanceIdRef.current}] missing sprintId for task ${task._id}`);
        throw new Error("Thiếu thông tin sprint ID");
      }
      
      if (!taskProjectId) {
        console.error(`TaskInteractions [${instanceIdRef.current}] missing projectId for task ${task._id}`);
        throw new Error("Thiếu thông tin project ID");
      }
      
      console.log(`TaskInteractions [${instanceIdRef.current}] adding comment for task ${task._id}, using projectId=${taskProjectId}, sprintId=${taskSprintId}`);
      
      const response = await api.post(
        `/projects/${taskProjectId}/sprints/${taskSprintId}/tasks/${task._id}/comments`,
        {
          content: commentText,
          taskId: task._id,
          parentComment: replyingTo?._id
        }
      );
      
      if (response.data) {
        let newComment;
        
        if (response.data.data) {
          newComment = response.data.data;
        } else if (response.data.comment) {
          newComment = response.data.comment;
        } else {
          newComment = response.data;
        }
        
        if (newComment) {
          // Thêm comment mới vào state một cách an toàn
          setComments(prev => {
            // Kiểm tra xem comment đã tồn tại chưa
            const exists = prev.some(comment => comment._id === newComment._id);
            if (!exists) {
              console.log(`TaskInteractions [${instanceIdRef.current}] added new comment ${newComment._id}`);
              // Sắp xếp comments theo thời gian tạo (mới nhất lên đầu)
              return [newComment, ...prev].sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
              );
            }
            return prev;
          });
          
          setNewComment("");
          setReplyingTo(null);
          if (onUpdate) onUpdate();
        }
      }
    } catch (error) {
      console.error(`TaskInteractions [${instanceIdRef.current}] error adding comment:`, error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    try {
      // Set loading state
      setUploading(true);
      setUploadError(null);
      
      // Check for files
      if (!event.target.files || event.target.files.length === 0) {
        setUploading(false);
        setUploadError("Không có file nào được chọn");
        return;
      }
      
      // LẤY SPRINT ID & PROJECT ID TỪ TASK OBJECT NẾU KHÔNG CÓ TRONG THAM SỐ
      const taskSprintId = sprint?._id || task?.sprint || task?.sprintId;
      const taskProjectId = project?._id || task?.project || task?.projectId;
      const taskId = task?._id;
      
      // Check for required IDs
      if (!taskProjectId || !taskId) {
        setUploading(false);
        setUploadError("Thiếu thông tin task hoặc project");
        console.error("Missing required IDs", { projectId: taskProjectId, taskId: taskId });
        return;
      }
      
      console.log("Task data for upload:", {
        taskId,
        projectId: taskProjectId,
        sprintId: taskSprintId,
        hasTaskSprintField: !!task?.sprint,
        hasTaskSprintIdField: !!task?.sprintId
      });
      
      // Kiểm tra quyền upload file
      if (!isAdminOrManager() && !isTaskAssignee()) {
        setUploading(false);
        setUploadError("Bạn không có quyền upload file");
        toast.error("Bạn không có quyền upload file");
        return;
      }
      
      // Lấy danh sách các files được chọn
      const selectedFiles = Array.from(event.target.files);
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      
      // Kiểm tra kích thước file
      const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map(f => f.name).join(', ');
        toast.warning(`Các file sau vượt quá 10MB và sẽ không được tải lên: ${fileNames}`);
      }
      
      // Lọc các file có kích thước hợp lệ
      const validFiles = selectedFiles.filter(file => file.size <= maxFileSize);
      if (validFiles.length === 0) {
        setUploading(false);
        setUploadError("Không có file nào hợp lệ để tải lên");
        return;
      }
      
      console.log(`Chuẩn bị tải lên ${validFiles.length} file`);
      
      // Create FormData
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('attachments', file);
        console.log(`Đã thêm file: ${file.name} (${(file.size/1024).toFixed(2)}KB)`);
      });
      
      // Xác định endpoint 
      let endpoint;
      if (taskSprintId) {
        // Nếu có sprint ID, sử dụng endpoint đầy đủ
        endpoint = `/projects/${taskProjectId}/sprints/${taskSprintId}/tasks/${taskId}/attachments`;
      } else {
        // Nếu không có sprint ID, sử dụng endpoint không có sprint
        endpoint = `/projects/${taskProjectId}/tasks/${taskId}/attachments`;
      }
      
      console.log(`Đang gửi request đến: ${endpoint}`);
      
      // Send the request
      const response = await api.post(
        endpoint,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          },
        }
      );
      
      // Handle response
      console.log("Upload response:", response.data);
      
      if (response.data.success) {
        // Lấy danh sách các file đã tải lên thành công
        const uploadedAttachments = response.data.data.attachments || [];
        const failedUploads = response.data.data.failedUploads || [];
        
        if (uploadedAttachments.length > 0) {
          // Thêm vào danh sách hiện có
          setAttachments(prev => {
            // Đảm bảo prev là một mảng
            const prevArray = Array.isArray(prev) ? prev : [];
            return [...uploadedAttachments, ...prevArray];
          });
          
          // Thông báo thành công
          toast.success(`Đã tải lên ${uploadedAttachments.length} file thành công`);
        }
        
        // Thông báo nếu có upload thất bại
        if (failedUploads.length > 0) {
          const failedNames = failedUploads.map(f => f.name).join(', ');
          toast.error(`${failedUploads.length} file không thể tải lên: ${failedNames}`);
        }
        
        // Cập nhật task nếu có thay đổi
        if (response.data.data.task) {
          onUpdate && onUpdate(response.data.data.task);
        }
        
        // Reset file input
        event.target.value = "";
      } else {
        setUploadError(response.data.message || "Tải lên thất bại");
        toast.error(response.data.message || "Tải lên thất bại");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      const errorMessage = error.response?.data?.message || error.message || "Không thể tải lên file";
      setUploadError(errorMessage);
      toast.error("Lỗi khi tải lên file: " + errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Handle delete attachment
  const handleDeleteAttachment = async (attachment) => {
    if (!attachment || !attachment._id) {
      console.error("Invalid attachment", attachment);
      return;
    }
    
    try {
      // Lấy ID từ task nếu không có từ tham số
      const taskId = task?._id;
      const taskSprintId = sprint?._id || task?.sprint || task?.sprintId;
      const taskProjectId = project?._id || task?.project || task?.projectId;
      
      if (!taskId || !taskProjectId) {
        console.error("Missing task or project ID", { taskId, taskProjectId });
        return;
      }
      
      console.log(`Deleting attachment ${attachment._id} for task ${taskId}`);
      
      // Xác định endpoint
      let endpoint = `/projects/${taskProjectId}/`;
      if (taskSprintId) {
        endpoint += `sprints/${taskSprintId}/`;
      }
      endpoint += `tasks/${taskId}/attachments/${attachment._id}`;
      
      const response = await api.delete(endpoint);
      
      if (response.data?.success || response.status === 200) {
        // Cập nhật UI
        setAttachments(prev => prev.filter(a => a._id !== attachment._id));
        toast.success("Đã xóa tệp đính kèm thành công");
        
        // Cập nhật task nếu cần
        if (onUpdate) {
          onUpdate();
        }
      } else {
        toast.error("Không thể xóa tệp đính kèm");
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Lỗi khi xóa tệp đính kèm");
    }
  };

  return (
    <Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 3,
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            minHeight: '48px',
            fontSize: '0.95rem',
            '&.Mui-selected': {
              color: 'primary.main',
              fontWeight: 600
            }
          },
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0'
          }
        }}
      >
        <Tab icon={<CommentIcon sx={{ mr: 1 }} />} label="Bình luận" iconPosition="start" />
        <Tab icon={<AttachFileIcon sx={{ mr: 1 }} />} label="Tệp đính kèm" iconPosition="start" />
        <Tab icon={<HistoryIcon sx={{ mr: 1 }} />} label="Lịch sử" iconPosition="start" />
      </Tabs>

      {/* Comments Tab */}
      {activeTab === 0 && (
        <Box>
          {/* Comment Form */}
          <Box mb={3}>
            {replyingTo && (
              <Box 
                sx={{ 
                  mb: 2,
                  p: 1.5,
                  borderRadius: '8px',
                  backgroundColor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  Đang trả lời bình luận của {replyingTo.user?.name || 'Người dùng'}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setReplyingTo(null)}
                  sx={{ color: 'text.secondary' }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            <CommentForm
              id="comment-form"
              projectId={project?._id}
              sprintId={sprint?._id}
              taskId={task._id}
              onSubmit={handleAddComment}
              userRole={user?.role}
              userId={user?._id}
              placeholder={replyingTo ? `Trả lời ${replyingTo.user?.name || 'Người dùng'}...` : "Thêm bình luận..."}
            />
          </Box>

          {/* Comments List */}
          {loadingComments ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress size={24} />
            </Box>
          ) : comments.length > 0 ? (
            <Stack spacing={2}>
              {(() => {
                // Chỉ hiển thị mỗi comment một lần bằng cách sử dụng Set để theo dõi comment ID
                const commentIds = new Set();
                return comments
                  .filter(comment => {
                    // Nếu comment ID đã tồn tại trong set, loại bỏ (trả về false)
                    // Nếu chưa, thêm vào set và giữ lại (trả về true)
                    if (!comment._id || commentIds.has(comment._id)) {
                      return false;
                    }
                    commentIds.add(comment._id);
                    return true;
                  })
                  .map((comment) => (
                    <CommentItem 
                      key={comment._id} 
                      comment={comment}
                      projectId={project?._id}
                      sprintId={sprint?._id}
                      taskId={task._id}
                      currentUserId={user?._id}
                      onReply={handleReply}
                    />
                  ));
              })()}
            </Stack>
          ) : (
            <Box 
              display="flex" 
              flexDirection="column" 
              alignItems="center" 
              justifyContent="center" 
              p={4}
              sx={{ 
                backgroundColor: 'background.paper',
                borderRadius: '12px',
                border: '1px dashed',
                borderColor: 'divider'
              }}
            >
              <CommentIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary" align="center">
                Chưa có bình luận nào
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Attachments Tab */}
      {activeTab === 1 && (
        <Box>
          {loadingAttachments ? (
            <Box display="flex" justifyContent="center" my={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Stack spacing={3}>
              {canUploadFile() && (
                <FileUploader
                  onUpload={handleFileUpload}
                  isLoading={uploading}
                  error={uploadError}
                  accept="*/*"
                  multiple={false}
                />
              )}
              {Array.isArray(attachments) && attachments.length > 0 ? (
                <AttachmentsList
                  attachments={attachments.filter(att => att !== null && att !== undefined)}
                  onDelete={handleDeleteAttachment}
                  canEdit={true}
                  currentUser={user}
                  taskAssignees={task?.assignees || []}
                  projectRole={isAdminOrManager() ? 'admin' : 'member'}
                />
              ) : (
                <Box 
                  display="flex" 
                  flexDirection="column" 
                  alignItems="center" 
                  justifyContent="center" 
                  p={4}
                  sx={{ 
                    backgroundColor: 'background.paper',
                    borderRadius: '12px',
                    border: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <AttachFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" align="center">
                    Chưa có tệp đính kèm nào
                  </Typography>
                  {!canUploadFile() && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      Bạn không có quyền tải lên tệp đính kèm
                    </Typography>
                  )}
                </Box>
              )}
            </Stack>
          )}
        </Box>
      )}

      {/* History Tab */}
      {activeTab === 2 && (
        <Box>
          {loadingHistory ? (
            <Box display="flex" justifyContent="center" my={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <TaskAuditLog
              taskId={task._id}
              projectId={project._id}
              sprintId={sprint._id}
              task={task}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default React.memo(TaskInteractions, (prevProps, nextProps) => {
  // Only re-render if task, project or sprint IDs change
  return prevProps.task?._id === nextProps.task?._id &&
         prevProps.project?._id === nextProps.project?._id &&
         prevProps.sprint?._id === nextProps.sprint?._id;
}); 