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
    
    if (task?._id && project?._id && sprint?._id) {
      console.log(`TaskInteractions [${instanceIdRef.current}] task changed, fetching data`);
      if (activeTab === 0) {
        fetchComments();
      } else if (activeTab === 1) {
        fetchAttachments();
      } else if (activeTab === 2) {
        fetchHistory();
      }
    }
  }, [task?._id, project?._id, sprint?._id]);

  // Handle tab changes
  useEffect(() => {
    if (!task?._id || !project?._id || !sprint?._id) return;

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
  }, [activeTab, task?._id, project?._id, sprint?._id]);

  // Fetch comments
  const fetchComments = async () => {
    // Không fetch lại nếu đang loading hoặc thiếu thông tin cần thiết
    if (!task?._id || !project?._id || !sprint?._id || loadingComments) return;
    
    // Luôn reset commentsLoadedRef khi gọi fetchComments
    commentsLoadedRef.current = false;
    
    setLoadingComments(true);
    try {
      console.log(`TaskInteractions [${instanceIdRef.current}] fetching comments for task ${task._id}`);
      
      const response = await api.get(
        `/projects/${project._id}/sprints/${sprint._id}/tasks/${task._id}/comments`
      );
      
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
      
      // Lọc duplicate comments trước khi lưu vào state
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
    if (!task?._id || !project?._id || !sprint?._id) return;
    
    setLoadingAttachments(true);
    try {
      const response = await api.get(
        `/projects/${project._id}/sprints/${sprint._id}/tasks/${task._id}/attachments`
      );
      
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
    if (!task?._id || !project?._id || !sprint?._id) return;
    
    setLoadingHistory(true);
    try {
      const response = await api.get(
        `/projects/${project._id}/sprints/${sprint._id}/tasks/${task._id}/history`
      );
      
      if (response.data?.data?.history) {
        setHistory(response.data.data.history);
      } else if (Array.isArray(response.data?.data)) {
        setHistory(response.data.data);
      } else if (Array.isArray(response.data)) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
      console.log(`TaskInteractions [${instanceIdRef.current}] adding comment for task ${task._id}`);
      
      const response = await api.post(
        `/projects/${project._id}/sprints/${sprint._id}/tasks/${task._id}/comments`,
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
          // Kiểm tra xem comment mới đã tồn tại trong danh sách chưa
          setComments(prev => {
            // Kiểm tra xem comment đã tồn tại chưa
            const exists = prev.some(comment => comment._id === newComment._id);
            if (!exists) {
              console.log(`TaskInteractions [${instanceIdRef.current}] added new comment ${newComment._id}`);
              return [newComment, ...prev];
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
        setUploadError("No file selected");
        return;
      }
      
      // Check for required IDs
      if (!project?._id || !sprint?._id || !task?._id) {
        setUploading(false);
        setUploadError("Missing required task information");
        console.error("Missing required IDs", { projectId: project?._id, sprintId: sprint?._id, taskId: task?._id });
        return;
      }
      
      const file = event.target.files[0];
      console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Debug FormData contents
      console.log("FormData created with key 'file'");
      
      // Send the request
      const response = await api.post(
        `/projects/${project?._id}/sprints/${sprint?._id}/tasks/${task?._id}/attachments`,
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
      
      // Handle successful response
      console.log("Upload response:", response.data);
      
      if (response.data.success) {
        // Add the new attachment to the list
        const newAttachment = response.data.data.file;
        if (newAttachment) {
          setAttachments(prev => {
            // Ensure prev is an array
            const prevArray = Array.isArray(prev) ? prev : [];
            return [newAttachment, ...prevArray];
          });
        }
        
        // Update task if data is returned
        if (response.data.data.task) {
          onUpdate && onUpdate(response.data.data.task);
        }
        
        // Show success message
        toast.success("File uploaded successfully");
        
        // Reset file input
        event.target.value = "";
      } else {
        setUploadError(response.data.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error.response?.data?.message || error.message || "Failed to upload file");
      toast.error("Failed to upload file: " + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  // Handle file delete
  const handleDeleteAttachment = async (attachment) => {
    try {
      const attachmentId = attachment.id || attachment._id;
      if (!attachmentId) {
        console.error('Không thể xác định ID của tệp đính kèm:', attachment);
        return;
      }
      
      console.log(`Deleting attachment ${attachmentId}:`, attachment);
      
      // Use the uploadApi utility to handle file deletion
      await uploadApi.deleteFile(attachmentId, {
        taskId: task._id,
        projectId: project._id,
        sprintId: sprint._id
      });
      
      // Xóa tệp khỏi state
      setAttachments(prev => {
        // Make sure prev is an array
        if (!Array.isArray(prev)) return [];
        
        return prev.filter(att => {
          // Check if attachment exists
          if (!att) return false;
          
          const attId = att.id || att._id;
          // Make sure attachment ID and the ID we're comparing with both exist
          return attId && attachmentId && attId !== attachmentId;
        });
      });
      
      // Cập nhật component cha nếu cần
      if (onUpdate) onUpdate();
      
      console.log('Attachment deleted successfully');
    } catch (error) {
      console.error('Error deleting attachment:', error.response?.data || error.message || error);
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
              <FileUploader
                onUpload={handleFileUpload}
                isLoading={uploading}
                error={uploadError}
                accept="*/*"
                multiple={false}
              />
              {Array.isArray(attachments) && attachments.length > 0 ? (
                <AttachmentsList
                  attachments={attachments.filter(att => att !== null && att !== undefined)}
                  onDelete={handleDeleteAttachment}
                  canEdit={true}
                  currentUser={user}
                  taskAssignees={task?.assignees || []}
                  projectRole={(() => {
                    console.log('Determining project role:', {
                      user: user?._id,
                      project: project?._id,
                      members: project?.members?.length || 0
                    });
                    
                    // Kiểm tra nếu người dùng là admin hệ thống
                    if (user?.roles?.includes('Admin')) {
                      console.log('User is system admin');
                      return 'admin';
                    }
                    
                    // Nếu không có project hoặc members, mặc định là member
                    if (!project?.members || !Array.isArray(project.members)) {
                      console.log('No project members found, defaulting to member');
                      return 'member';
                    }
                    
                    // Tìm thành viên trong dự án
                    const member = project.members.find(m => {
                      // Kiểm tra xem user có đúng với thành viên không
                      if (!m.user) return false;
                      
                      const memberId = m.user._id || m.user;
                      const userId = user?._id || user?.id;
                      
                      return memberId?.toString() === userId?.toString() || memberId === userId;
                    });
                    
                    if (member) {
                      console.log(`Found member role: ${member.role || 'member'}`);
                      return member.role || 'member';
                    }
                    
                    console.log('User not found in project members, defaulting to member');
                    return 'member';
                  })()}
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