import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Grid,
  Chip,
  Box,
  OutlinedInput,
  FormHelperText,
  Paper,
  Stack,
  IconButton,
  Autocomplete,
  Tooltip,
  CircularProgress,
  Divider,
  LinearProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import CalendarIcon from "@mui/icons-material/CalendarToday";
import API from "../../api/api";
import ActivityService from "../../services/activityService";
import { useNavigate, useParams } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { useAuth } from "../../contexts/AuthContext";
import { useSnackbar } from "notistack";
import { ROLES } from "../../config/constants";
import { usePermissions } from "../../hooks/usePermissions";
import {
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  RemoveCircle as RemoveCircleIcon,
  Today as TodayIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import BackButton from "../common/BackButton";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { Link as RouterLink } from "react-router-dom";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const TaskForm = ({ open, onClose, onSave, task, project, projectId, sprintId }) => {
  console.log('[DEBUG] TaskForm rendered with props:', { 
    open, 
    taskId: task?._id,
    taskTitle: task?.title,
    projectId: projectId || project?._id,
    sprintId: sprintId || project?.currentSprint?._id
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { socket } = useWebSocket();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    startDate: new Date(), // Today
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    assignees: [],
    estimatedTime: 0,
    actualTime: 0,
    project: projectId || project?._id,
    sprint: sprintId || project?.currentSprint?._id,
    tags: [],
    syncWithCalendar: false,
    calendarType: "google",
  });
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [tempActualTime, setTempActualTime] = useState(0);

  const { canDeleteTask } = usePermissions();

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        status: task.status || "todo",
        startDate: task.startDate 
          ? new Date(task.startDate) 
          : new Date(),
        dueDate: task.dueDate
          ? new Date(task.dueDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignees: task.assignees?.map((a) => a._id) || [],
        estimatedTime: task.estimatedTime || 0,
        actualTime: task.actualTime || 0,
        project: typeof task.project === 'object' ? task.project._id : task.project || projectId || (project?._id ? project._id : project),
        sprint: typeof task.sprint === 'object' ? task.sprint._id : task.sprint || sprintId || (project?.currentSprint?._id ? project.currentSprint._id : project?.currentSprint),
        tags: task.tags || [],
        syncWithCalendar: task.syncWithCalendar || false,
        calendarType: task.calendarType || "google",
      });
    } else {
      // Reset form when creating new task
      const projectIdValue = typeof project === 'object' ? project._id : projectId || project;
      const sprintIdValue = typeof project?.currentSprint === 'object' ? project.currentSprint._id : sprintId || project?.currentSprint;
      
      // Kiểm tra và log thông tin
      console.log('[DEBUG] Reset form with values:', { 
        projectIdValue,
        sprintIdValue,
        rawProjectId: projectId,
        rawProject: project,
        projectType: typeof project
      });
      
      if (!projectIdValue) {
        console.error('[ERROR] No project ID available when resetting form');
      }
      
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        startDate: new Date(), // Today
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignees: [],
        estimatedTime: 0,
        actualTime: 0,
        project: projectIdValue,
        sprint: sprintIdValue,
        tags: [],
        syncWithCalendar: false,
        calendarType: "google",
      });
    }
  }, [task, project, projectId, sprintId]);

  // Thêm hàm để theo dõi tất cả các HTTP requests
  useEffect(() => {
    // Theo dõi tất cả network requests trong browser
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      return originalFetch(...args);
    };
    
    // Theo dõi Axios requests
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      return originalOpen.apply(this, args);
    };
    
    return () => {
      // Clean up
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
    };
  }, []);

  useEffect(() => {
    console.log('[DEBUG] Initial Load - fetchUsers called with sprint:', formData.sprint);
    // Chỉ lấy users khi mở form
    if (open) {
      fetchUsers();
      fetchAvailableTags();
    }
  }, [open, formData.project, formData.sprint]);

  const fetchUsers = async () => {
    try {
      console.log('[DEBUG] Form data:', formData);
      
      // Improved extraction to ensure we always get string IDs, not objects
      const projectId = formData.project?._id 
        ? formData.project._id 
        : (typeof formData.project === 'string' ? formData.project : null);
      
      const sprintId = formData.sprint?._id 
        ? formData.sprint._id 
        : (typeof formData.sprint === 'string' ? formData.sprint : null);
      
      // Log để debug
      console.log('[DEBUG] Extracted IDs:', { projectId, sprintId });
      
      if (!projectId) {
        console.error('[ERROR] Missing project ID');
        return;
      }
      
      // Nếu không có sprint, lấy danh sách thành viên project thay vì sprint
      let response;
      if (!sprintId) {
        console.log(`[DEBUG] No sprint ID, fetching project members: /projects/${projectId}/members`);
        response = await API.get(`/projects/${projectId}/members`);
      } else {
        // Gọi API Sprint Members 
        console.log(`[DEBUG] Fetching sprint members: /projects/${projectId}/sprints/${sprintId}/members`);
        response = await API.get(`/projects/${projectId}/sprints/${sprintId}/members`);
      }
      
      if (!response.data || !response.data.data) {
        console.error('[ERROR] Invalid response format:', response.data);
        return;
      }
      
      // Trích xuất thông tin thành viên từ cấu trúc dữ liệu API
      // Cấu trúc mong đợi: response.data.data là mảng các thành viên, mỗi thành viên có user property
      const members = response.data.data;
      
      // Chuyển đổi thành định dạng phù hợp cho dropdown
      const processedMembers = members
        .filter(member => member && member.user)
        .map(member => ({
          _id: member.user._id || member.user.id,
          name: member.user.name || member.user.email || 'Unknown User',
          email: member.user.email,
          role: member.role || 'member',
          avatar: member.user.avatar
        }));
      
      console.log('[DEBUG] Processed members:', processedMembers);
      console.log('[DEBUG] Member count:', processedMembers.length);
      
      // Cập nhật state
      setUsers(processedMembers);
      
    } catch (error) {
      console.error('[ERROR] Error fetching members:', error);
      
      // Dùng dữ liệu giả để kiểm tra UI
      console.log('[FALLBACK] Using test data for debugging');
      const testMembers = [
        { _id: 'test1', name: 'Thành viên 1', email: 'member1@test.com' },
        { _id: 'test2', name: 'Thành viên 2', email: 'member2@test.com' }
      ];
      setUsers(testMembers);
    }
  };

  const fetchAvailableTags = async () => {
    // Sử dụng danh sách tags mặc định thay vì gọi API không tồn tại
    console.log("[INFO] Sử dụng danh sách tags mặc định");
    const defaultTags = [
      "Urgent",
      "Bug",
      "Feature",
      "Documentation",
      "Testing",
      "UI/UX",
      "Backend",
      "Frontend",
      "Database",
      "API",
      "Refactor",
    ];
    setAvailableTags(defaultTags);
    
    /* Đoạn code gọi API bị lỗi - tạm thời bỏ đi
    try {
      // Giả sử API trả về danh sách các tag phổ biến
      const response = await API.get("/tags");
      setAvailableTags(response.data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setAvailableTags([
        "Urgent",
        "Bug",
        "Feature",
        "Documentation",
        "Testing",
      ]);
    }
    */
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Nếu trường thay đổi là status và giá trị mới là "done"
    if (name === "status" && value === "done" && formData.status !== "done") {
      // Mở dialog nhập thời gian khi chuyển sang trạng thái hoàn thành
      setTempActualTime(formData.actualTime);
      setTimeDialogOpen(true);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when field is changed
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleAssigneesChange = (event) => {
    const {
      target: { value },
    } = event;
    setFormData((prev) => ({
      ...prev,
      assignees: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const handleStartDateChange = (date) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        startDate: date,
      }));
    }
  };

  const handleDateChange = (date) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        dueDate: date,
      }));
    }
  };

  const handleTagsChange = (event, newValue) => {
    // Make sure we filter out any empty strings
    const cleanedTags = newValue.filter(tag => tag && tag.trim() !== '');
    
    // Kiểm tra xem có tag mới nào được thêm vào không
    const newTags = cleanedTags.filter(tag => !formData.tags.includes(tag));
    if (newTags.length > 0) {
      // Hiển thị thông báo khi thêm tag mới
      console.log("Đã thêm tag mới:", newTags);
      enqueueSnackbar(`Đã thêm tag: ${newTags.join(', ')}`, { 
        variant: 'success',
        autoHideDuration: 2000
      });
    }
    
    // Log để debug
    console.log("handleTagsChange được gọi:", cleanedTags);
    
    setFormData((prev) => ({
      ...prev,
      tags: cleanedTags,
    }));
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-zip-compressed'
    ];
    
    // Kiểm tra và lọc files
    const validFiles = [];
    const errors = [];
    
    selectedFiles.forEach(file => {
      // Kiểm tra kích thước
      if (file.size > maxSize) {
        errors.push(`File "${file.name}" quá lớn. Kích thước tối đa là 10MB.`);
        return;
      }
      
      // Kiểm tra loại file (tùy chọn)
      if (!allowedTypes.includes(file.type) && file.type !== '') {
        errors.push(`File "${file.name}" không được hỗ trợ. Các định dạng hỗ trợ: ảnh, PDF, Word, Excel, và văn bản.`);
        return;
      }
      
      validFiles.push(file);
    });
    
    // Cập nhật state
    setFiles(prevFiles => [...prevFiles, ...validFiles]);
    setFileErrors(errors);
    
    // Hiển thị thông báo lỗi nếu có
    if (errors.length > 0) {
      errors.forEach(error => {
        enqueueSnackbar(error, { variant: 'warning', autoHideDuration: 5000 });
      });
    }
    
    // Reset input file để có thể chọn lại cùng một file nếu muốn
    event.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  const uploadTaskFiles = async (taskId, projectId, sprintId) => {
    if (files.length === 0) return null;
    
    try {
      setIsUploading(true);
      const fileFormData = new FormData();
      
      // Thêm tất cả files vào formData
      files.forEach(file => {
        fileFormData.append("attachments", file);
      });
      
      // Xác định endpoint đúng
      let attachmentEndpoint;
      if (sprintId) {
        attachmentEndpoint = `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`;
      } else {
        attachmentEndpoint = `/projects/${projectId}/tasks/${taskId}/attachments`;
      }
      
      console.log(`[DEBUG] Uploading files to: ${attachmentEndpoint}`);
      console.log(`[DEBUG] Number of files: ${files.length}`);
      
      // Thực hiện request tải lên với progress tracking
      const response = await API.post(
        attachmentEndpoint,
        fileFormData,
        {
          headers: {
            "Content-Type": "multipart/form-data"
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề công việc không được để trống";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Mô tả không được để trống";
    }
    if (formData.estimatedTime < 0) {
      newErrors.estimatedTime = "Thời gian ước tính không hợp lệ";
    }
    if (!formData.project) {
      newErrors.project = "Công việc phải thuộc về một dự án";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Format thời gian để hiển thị
  const formatDateTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    
    // Lấy giá trị từ trường input tag nếu đang được focus
    const tagInput = document.querySelector('input[id^="tags-"]');
    if (tagInput && tagInput.value.trim()) {
      const newTagValue = tagInput.value.trim();
      if (!formData.tags.includes(newTagValue)) {
        console.log("Thêm tag từ input khi lưu:", newTagValue);
        // Thêm tag mới vào formData trước khi lưu
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTagValue]
        }));
        // Chúng ta cần đảm bảo tag mới được thêm vào trước khi gọi API
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    setErrors({});

    // Validate form data
    const validationErrors = {};
    if (!formData.title || formData.title.trim().length < 3) {
      validationErrors.title = 'Tiêu đề phải có ít nhất 3 ký tự';
    }
    if (!formData.description || formData.description.trim().length < 10) {
      validationErrors.description = 'Mô tả phải có ít nhất 10 ký tự';
    }
    if (formData.estimatedTime < 0) {
      validationErrors.estimatedTime = "Thời gian ước tính không hợp lệ";
    }
    if (!formData.project) {
      validationErrors.project = "Công việc phải thuộc về một dự án";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      console.log("[Task Debug] Saving task with form data:", formData);
      console.log("[Task Debug] Tags to save:", formData.tags);
      console.log("[Task Debug] Files to upload:", files.length > 0 ? files.map(f => f.name) : "No files");
      
      // Trích xuất ID để đảm bảo sử dụng đúng trong URL
      const projectId = typeof formData.project === 'object' ? formData.project._id : formData.project;
      const sprintId = typeof formData.sprint === 'object' ? formData.sprint._id : formData.sprint;
      
      console.log("[Task Debug] Extracted IDs for API calls:", { projectId, sprintId });
      
      // Chuẩn bị payload cho task
      const taskPayload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        assignees: formData.assignees,
        estimatedTime: formData.estimatedTime,
        actualTime: formData.actualTime,
        tags: formData.tags.filter(tag => tag && tag.trim() !== ''), // Đảm bảo lọc bỏ tag rỗng
        project: projectId, // Đảm bảo sử dụng ID
        sprint: sprintId // Đảm bảo sử dụng ID
      };
      
      let response;
      
      // CHỈNH SỬA: Kiểm tra cẩn thận nếu task tồn tại
      if (task && task._id) {
        console.log("[Task Debug] Updating existing task:", task._id);
        
        // Tạo endpoint đúng cho việc cập nhật task
        let updateEndpoint;
        if (sprintId) {
          updateEndpoint = `/projects/${projectId}/sprints/${sprintId}/tasks/${task._id}`;
        } else {
          updateEndpoint = `/projects/${projectId}/tasks/${task._id}`;
        }
        
        console.log("[Task Debug] Using update endpoint:", updateEndpoint);
        
        response = await API.put(updateEndpoint, taskPayload, {
          headers: {
            "Content-Type": "application/json"
          },
        });
        
        // Nếu có file, upload riêng và theo dõi tiến trình
        if (files.length > 0) {
          try {
            console.log("[Task Debug] Uploading files for existing task");
            await uploadTaskFiles(task._id, projectId, sprintId);
            enqueueSnackbar("Tệp đính kèm đã được tải lên thành công", { variant: "success" });
          } catch (fileError) {
            console.error("[Task Debug] Error uploading attachments:", fileError);
            enqueueSnackbar("Có lỗi khi tải lên tệp đính kèm", { variant: "error" });
          }
        }
        
        // Nếu có yêu cầu đồng bộ lịch cho task đã tồn tại
        if (formData.syncWithCalendar) {
          try {
            let syncEndpoint;
            if (sprintId) {
              syncEndpoint = `/projects/${projectId}/sprints/${sprintId}/tasks/${task._id}/sync-calendar`;
            } else {
              syncEndpoint = `/projects/${projectId}/tasks/${task._id}/sync-calendar`;
            }
            
            console.log("[Task Debug] Syncing calendar for existing task:", syncEndpoint);
            
            const syncResponse = await API.post(syncEndpoint, {
              calendarType: formData.calendarType,
            });
            
            if (syncResponse.data.success) {
              enqueueSnackbar("Đã đồng bộ task với " + (formData.calendarType === "google" ? "Google Calendar" : "Microsoft Outlook"), { 
                variant: "success",
                autoHideDuration: 3000
              });
            }
          } catch (syncError) {
            console.error("[Task Debug] Calendar sync error:", syncError);
            enqueueSnackbar(
              "Không thể đồng bộ với lịch. " + (syncError.response?.data?.message || "Vui lòng kiểm tra kết nối với lịch trong cài đặt."),
              { variant: "warning" }
            );
          }
        }
        
        await ActivityService.logTaskUpdated(formData.title);
      } else {
        // Tạo task mới
        let endpoint;
        if (sprintId) {
          endpoint = `/projects/${projectId}/sprints/${sprintId}/tasks`;
        } else {
          endpoint = `/projects/${projectId}/tasks`;
        }
        
        console.log(`[DEBUG] Creating task with endpoint: ${endpoint}`);
        
        response = await API.post(
          endpoint, 
          taskPayload, 
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        );
        
        console.log("[Task Debug] Task created successfully:", response.data);
        console.log("[Task Debug] Full response structure:", JSON.stringify(response));

        // CHỈNH SỬA: Trích xuất ID task đúng cách từ phản hồi API
        // Phân tích cấu trúc phản hồi chi tiết, đảm bảo chắc chắn lấy được ID
        let newTaskId = null;
        let extractedTask = null;

        if (response?.data?.success === true && response?.data?.data) {
          // Cấu trúc phản hồi API chuẩn: {success: true, message: "...", data: {...}}
          extractedTask = response.data.data;
          newTaskId = extractedTask._id;
        } else if (response?.data?._id) {
          // Cấu trúc phản hồi trực tiếp: task object
          extractedTask = response.data;
          newTaskId = response.data._id;
        } else {
          // Tìm kiếm đệ quy trong đối tượng phản hồi
          console.log("[Task Debug] Using recursive search for task ID");
          const findTaskId = (obj, depth = 0) => {
            if (!obj || typeof obj !== 'object' || depth > 5) return null;
            
            // Kiểm tra nếu đối tượng hiện tại có _id và các trường cơ bản của task
            if (obj._id && (obj.title || obj.description)) {
              return obj;
            }
            
            // Duyệt qua tất cả các thuộc tính
            for (const key in obj) {
              if (typeof obj[key] === 'object') {
                const result = findTaskId(obj[key], depth + 1);
                if (result) return result;
              }
            }
            
            return null;
          };
          
          extractedTask = findTaskId(response.data);
          if (extractedTask) {
            newTaskId = extractedTask._id;
          }
        }

        if (!newTaskId) {
          console.error("[Task Debug] Could not extract task ID from response:", response.data);
          throw new Error("Không thể lấy ID task từ phản hồi API. Task có thể chưa được tạo thành công.");
        } else {
          console.log("[Task Debug] Successfully extracted task ID:", newTaskId);
          // Cập nhật trong phần tìm kiếm task để sử dụng đúng extractedTask
          if (extractedTask) {
            console.log("[Task Debug] Using extracted task for further processing");
            response.data = extractedTask; // Đảm bảo response.data chứa task đúng
          }
        }

        // Kiểm tra nếu có file và task ID
        if (files.length > 0) {
          if (newTaskId) {
            console.log("[Task Debug] Will start file upload for task ID:", newTaskId);
            
            try {
              const fileFormData = new FormData();
              files.forEach(file => {
                fileFormData.append("attachments", file);
                console.log("[Task Debug] Added file to upload:", file.name);
              });
              
              // Tạo endpoint tải lên tệp đính kèm
              let attachmentEndpoint;
              if (sprintId) {
                attachmentEndpoint = `/projects/${projectId}/sprints/${sprintId}/tasks/${newTaskId}/attachments`;
              } else {
                attachmentEndpoint = `/projects/${projectId}/tasks/${newTaskId}/attachments`;
              }
              
              console.log("[Task Debug] Uploading files to endpoint:", attachmentEndpoint);
              
              // Log toàn bộ FormData trước khi gửi
              console.log("[Task Debug] FormData entries:");
              for (let pair of fileFormData.entries()) {
                console.log(pair[0], pair[1] instanceof File ? 
                  `File: ${pair[1].name}, size: ${pair[1].size}, type: ${pair[1].type}` : pair[1]);
              }
              
              // Thực hiện request tải lên tệp đính kèm
              const uploadResponse = await API.post(
                attachmentEndpoint,
                fileFormData,
                {
                  headers: {
                    "Content-Type": "multipart/form-data"
                  },
                  onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`[Task Debug] Upload progress: ${progress}%`);
                  }
                }
              );
              
              console.log("[Task Debug] File upload response:", uploadResponse.data);
              
              if (uploadResponse.data.success) {
                enqueueSnackbar("Tệp đính kèm đã được tải lên thành công", { variant: "success" });
              } else {
                console.error("[Task Debug] Upload failed:", uploadResponse.data.message);
                enqueueSnackbar("Có lỗi khi tải lên tệp đính kèm", { variant: "error" });
              }
            } catch (fileError) {
              console.error("[Task Debug] Error uploading attachments:", fileError);
              console.error("[Task Debug] Error details:", fileError.response?.data || fileError.message);
              enqueueSnackbar("Có lỗi khi tải lên tệp đính kèm: " + (fileError.response?.data?.message || fileError.message), { variant: "error" });
            }
          } else {
            console.warn("[Task Debug] Cannot upload files - no task ID returned:", response.data);
            enqueueSnackbar("Không thể tải lên tệp đính kèm do không có ID task", { variant: "warning" });
          }
        }
        
        // Trích xuất tên dự án từ phản hồi API hoặc từ dữ liệu dự án đã có
        let projectName = "unknown";
        
        // Ưu tiên 1: Lấy từ response nếu có
        if (response.data?.data?.project?.name) {
          projectName = response.data.data.project.name;
          console.log("[Task Debug] Using project name from response:", projectName);
        } 
        // Ưu tiên 2: Lấy từ dự án đã được truyền vào component
        else if (project?.name) {
          projectName = project.name;
          console.log("[Task Debug] Using project name from props:", projectName);
        } 
        // Ưu tiên 3: Gọi API để lấy thông tin dự án nếu có projectId
        else if (projectId) {
          try {
            console.log("[Task Debug] Fetching project details for activities log");
            const projectResponse = await API.get(`/projects/${projectId}`);
            if (projectResponse.data?.data?.name) {
              projectName = projectResponse.data.data.name;
              console.log("[Task Debug] Got project name from API:", projectName);
            }
          } catch (projectError) {
            console.error("[Task Debug] Error fetching project details:", projectError);
          }
        }
        
        console.log("[Task Debug] Logging task creation with project name:", projectName);
        await ActivityService.logTaskCreated(formData.title, projectName);

        // Nếu có yêu cầu đồng bộ lịch
        if (formData.syncWithCalendar && newTaskId) {
          try {
            let syncEndpoint;
            if (sprintId) {
              syncEndpoint = `/projects/${projectId}/sprints/${sprintId}/tasks/${newTaskId}/sync-calendar`;
            } else {
              syncEndpoint = `/projects/${projectId}/tasks/${newTaskId}/sync-calendar`;
            }
            
            console.log("[Task Debug] Syncing calendar with endpoint:", syncEndpoint);
            
            const syncResponse = await API.post(syncEndpoint, {
              calendarType: formData.calendarType,
            });
            
            if (syncResponse.data.success) {
              enqueueSnackbar("Đã đồng bộ task với " + (formData.calendarType === "google" ? "Google Calendar" : "Microsoft Outlook"), { 
                variant: "success",
                autoHideDuration: 3000
              });
            }
          } catch (syncError) {
            console.error("[Task Debug] Calendar sync error:", syncError);
            enqueueSnackbar(
              "Không thể đồng bộ với lịch. " + (syncError.response?.data?.message || "Vui lòng kiểm tra kết nối với lịch trong cài đặt."),
              { variant: "warning" }
            );
          }
        }
      }
      
      // Gọi callback onSave với dữ liệu task
      // CHỈNH SỬA: Xử lý dữ liệu trả về từ API một cách đúng đắn
      console.log("[Task Debug] Response structure before extracting data:", response);
      let taskData;
      if (response.data && response.data.success && response.data.data) {
        taskData = response.data.data;
      } else if (response.data) {
        taskData = response.data;
      } else {
        console.error("[Task Debug] Invalid response format, cannot extract task data");
        throw new Error("Không thể trích xuất dữ liệu task từ phản hồi API");
      }
      
      if (!taskData._id) {
        console.error("[Task Debug] Task data does not contain _id:", taskData);
        enqueueSnackbar("Task không có ID hợp lệ, vui lòng thử lại", { variant: "error" });
        return; // Ngăn chặn việc gọi onSave với dữ liệu không hợp lệ
      }
      
      // Sau khi xác nhận có ID hợp lệ, mới gọi onSave
      console.log("[Task Debug] Calling onSave with valid task data:", taskData);
      enqueueSnackbar("Task đã được lưu thành công", { variant: "success" });
      onSave(taskData);
      
    } catch (error) {
      console.error("[Task Debug] Error saving task:", error);
      // Hiển thị lỗi chi tiết từ server nếu có
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        console.error("[Task Debug] Validation errors:", error.response.data.errors);
        setErrors({ 
          submit: `Lỗi: ${error.response.data.message}. ${error.response.data.errors.join(", ")}` 
        });
      } else {
        setErrors({ submit: error.response?.data?.message || "Có lỗi xảy ra" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    console.log("TaskForm - Delete attempt");
    console.log("- Task:", task);
    console.log("- Project:", project);

    if (!canDeleteTask(task, project)) {
      console.log("- Permission check failed: User cannot delete this task");
      enqueueSnackbar(
        "Bạn không có quyền xóa công việc này. Chỉ Admin, Project Manager hoặc người tạo task (khi chưa được gán) mới có thể xóa.",
        { variant: "error", autoHideDuration: 5000 }
      );
      return;
    }

    console.log("- Permission check passed: User can delete this task");

    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác và sẽ xóa tất cả bình luận, tệp đính kèm liên quan.")) {
      setLoading(true);
      try {
        // Xác định endpoint đúng cho việc xóa task
        let deleteEndpoint;
        if (task.sprint) {
          deleteEndpoint = `/projects/${task.project}/sprints/${task.sprint}/tasks/${task._id}`;
        } else {
          deleteEndpoint = `/tasks/${task._id}`;
        }
        
        console.log(`Deleting task using endpoint: ${deleteEndpoint}`);
        
        await API.delete(deleteEndpoint);
        await ActivityService.logTaskDeleted(task.title);
        
        enqueueSnackbar("Công việc đã được xóa thành công", {
          variant: "success",
          autoHideDuration: 3000,
        });
        
        // Đóng form ngay lập tức
        if (onClose) {
          onClose();
        }
        
        // Emit socket event để thông báo cho người dùng khác
        if (socket) {
          const notification = {
            type: 'task_deleted',
            task: {
              id: task._id,
              title: task.title
            },
            deletedBy: {
              id: user._id,
              name: user.name
            }
          };
          
          // Emit cho các user liên quan
          socket.emit('notification', notification);
          
          console.log("Sent task_deleted notification via socket");
        }
      } catch (error) {
        console.error("Error deleting task:", error);
        console.error("Error details:", error.response?.data);
        
        enqueueSnackbar(
          error.response?.data?.message || "Không thể xóa công việc. Vui lòng thử lại.",
          { variant: "error", autoHideDuration: 5000 }
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleComplete = async () => {
    // Kiểm tra nếu task không tồn tại hoặc không có ID
    if (!task || !task._id) {
      console.error("[Task Debug] Cannot complete task: No task ID found");
      enqueueSnackbar("Không thể hoàn thành task: ID task không xác định", { variant: "error" });
      return;
    }
    
    setLoading(true);
    try {
      // Tạo endpoint đúng cho việc cập nhật trạng thái task
      let updateEndpoint;
      if (task.sprint) {
        updateEndpoint = `/projects/${task.project}/sprints/${task.sprint}/tasks/${task._id}`;
      } else {
        updateEndpoint = `/projects/${task.project}/tasks/${task._id}`;
      }
      
      console.log("[Task Debug] Completing task with endpoint:", updateEndpoint);
      
      await API.put(updateEndpoint, {
        ...formData,
        status: "done",
      });
      await ActivityService.logTaskCompleted(task.title);
      // Remove navigation from here - let parent component handle it
      // navigate(`/projects/${project?._id}`);
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setLoading(false);
    }
  };

  const openTagsDialog = () => {
    setTagsDialogOpen(true);
  };

  const closeTagsDialog = () => {
    setTagsDialogOpen(false);
    setNewTag("");
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const closeTimeDialog = () => {
    setTimeDialogOpen(false);
  };

  const saveActualTime = () => {
    setFormData(prev => ({
      ...prev,
      actualTime: tempActualTime
    }));
    setTimeDialogOpen(false);
  };

  // Thêm xử lý socket.io cho sự kiện task_deleted
  useEffect(() => {
    // Nếu không có socket hoặc không có task ID, không làm gì cả
    if (!task?._id || !socket) return;
    
    // Hàm xử lý khi nhận được thông báo task đã bị xóa
    const handleTaskDeleted = (data) => {
      // Kiểm tra xem task bị xóa có phải là task hiện tại không
      if (data && data.task && data.task.id === task._id) {
        // Hiển thị thông báo
        enqueueSnackbar(`Công việc "${data.task.title}" đã bị xóa bởi ${data.deletedBy?.name || 'người khác'}`, { 
          variant: 'warning',
          autoHideDuration: 5000
        });
        
        // Đóng form
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    };
    
    // Đăng ký lắng nghe sự kiện task_deleted
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('notification', (notification) => {
      if (notification.type === 'task_deleted' && notification.task.id === task._id) {
        handleTaskDeleted(notification);
      }
    });
    
    // Cleanup khi component unmount
    return () => {
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('notification');
    };
  }, [task?._id, socket, enqueueSnackbar, onClose]);

  return (
    <>
      <Dialog
        open={open}
        onClose={() => {
          if (!loading) onClose();
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <DialogContent>
          <Paper sx={{ p: 4, maxWidth: 800, mx: "auto" }}>
            <Typography variant="h5" gutterBottom>
              {task?._id ? "Chỉnh sửa công việc" : "Tạo công việc mới"}
            </Typography>

            <Box component="form" onSubmit={(e) => e.preventDefault()} sx={{ mt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    name="title"
                    label="Tiêu đề"
                    value={formData.title}
                    onChange={handleChange}
                    error={!!errors.title}
                    helperText={errors.title}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    multiline
                    rows={4}
                    name="description"
                    label="Mô tả"
                    value={formData.description}
                    onChange={handleChange}
                    error={!!errors.description}
                    helperText={errors.description}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="priority-label">Độ ưu tiên</InputLabel>
                    <Select
                      labelId="priority-label"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      label="Độ ưu tiên"
                    >
                      <MenuItem value="low">Thấp</MenuItem>
                      <MenuItem value="medium">Trung bình</MenuItem>
                      <MenuItem value="high">Cao</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="status-label">Trạng thái</InputLabel>
                    <Select
                      labelId="status-label"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      label="Trạng thái"
                    >
                      <MenuItem value="todo">Chưa bắt đầu</MenuItem>
                      <MenuItem value="inProgress">Đang thực hiện</MenuItem>
                      <MenuItem value="done">Hoàn thành</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel id="assignee-label">Người thực hiện</InputLabel>
                    <Select
                      labelId="assignee-label"
                      multiple
                      name="assignees"
                      value={formData.assignees}
                      onChange={handleAssigneesChange}
                      input={<OutlinedInput label="Người thực hiện" />}
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {selected.map((value) => {
                            const user = users.find((u) => u._id === value);
                            return (
                              <Chip
                                key={value}
                                label={user ? user.name : "Unknown User"}
                                size="small"
                              />
                            );
                          })}
                        </Box>
                      )}
                      MenuProps={MenuProps}
                    >
                      {users.length === 0 ? (
                        <MenuItem disabled>Không có người dùng trong sprint này</MenuItem>
                      ) : (
                        users.map((user) => (
                          <MenuItem key={user._id} value={user._id}>
                            {user.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    freeSolo
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    id="tags"
                    options={availableTags.filter(tag => !formData.tags.includes(tag))}
                    value={formData.tags}
                    onChange={handleTagsChange}
                    onBlur={(e) => {
                      // Khi người dùng rời khỏi ô input, kiểm tra xem có giá trị nào đang được nhập không
                      const inputValue = e.target.value?.trim();
                      if (inputValue && !formData.tags.includes(inputValue)) {
                        // Thêm tag mới khi blur nếu có giá trị đang nhập
                        console.log("Thêm tag mới khi blur:", inputValue);
                        setFormData((prev) => ({
                          ...prev,
                          tags: [...prev.tags, inputValue]
                        }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value?.trim() !== '') {
                        // Prevent default to avoid form submission
                        e.preventDefault();
                        
                        // Get the input value
                        const newValue = e.target.value.trim();
                        
                        // Only add if not already in the list
                        if (!formData.tags.includes(newValue)) {
                          console.log("Thêm tag mới khi nhấn Enter:", newValue);
                          setFormData((prev) => ({
                            ...prev,
                            tags: [...prev.tags, newValue]
                          }));
                          
                          // Clear the input field after adding
                          e.target.value = '';
                        }
                      }
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          label={option}
                          size="small"
                          {...getTagProps({ index })}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField 
                        {...params} 
                        label="Tags" 
                        placeholder="Nhập tag mới và nhấn Enter" 
                        helperText="Nhập tag mới từ bàn phím và nhấn Enter (hoặc Tab) để thêm"
                      />
                    )}
                  />
                </Grid>

                {/* Thêm trường Ngày bắt đầu */}
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Ngày bắt đầu"
                      value={formData.startDate}
                      onChange={handleStartDateChange}
                      sx={{ width: "100%" }}
                      ampm={false}
                      format="dd/MM/yyyy HH:mm"
                      slotProps={{
                        textField: {
                          helperText: 'Ngày và giờ bắt đầu công việc',
                          InputProps: {
                            startAdornment: <TodayIcon color="primary" sx={{ mr: 1, opacity: 0.7 }} />,
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Ngày hết hạn"
                      value={formData.dueDate}
                      onChange={handleDateChange}
                      sx={{ width: "100%" }}
                      ampm={false}
                      format="dd/MM/yyyy HH:mm"
                      slotProps={{
                        textField: {
                          helperText: 'Ngày và giờ hạn chót hoàn thành',
                          InputProps: {
                            startAdornment: <CalendarIcon color="error" sx={{ mr: 1, opacity: 0.7 }} />,
                          },
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    name="estimatedTime"
                    label="Thời gian ước tính (giờ)"
                    value={formData.estimatedTime}
                    onChange={handleChange}
                    error={!!errors.estimatedTime}
                    helperText={errors.estimatedTime || "Thời gian dự kiến để hoàn thành"}
                    InputProps={{ 
                      inputProps: { min: 0 },
                      startAdornment: <ScheduleIcon color="info" sx={{ mr: 1, opacity: 0.7 }} />,
                    }}
                  />
                </Grid>

                {/* Thêm trường Thời gian đã làm */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    name="actualTime"
                    label="Thời gian đã làm (giờ)"
                    value={formData.actualTime}
                    onChange={handleChange}
                    error={!!errors.actualTime}
                    helperText={errors.actualTime || "Số giờ đã làm thực tế"}
                    disabled={formData.status !== "done"}
                    InputProps={{ 
                      inputProps: { min: 0, step: 0.5 },
                      startAdornment: <ScheduleIcon color="success" sx={{ mr: 1, opacity: 0.7 }} />,
                    }}
                  />
                  {formData.status !== "done" && (
                    <FormHelperText>
                      Trường này chỉ được chỉnh sửa khi task hoàn thành
                    </FormHelperText>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Tệp đính kèm
                  </Typography>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUploadIcon />}
                    sx={{ mb: 2, mr: 2 }}
                  >
                    Tải lên tệp
                    <VisuallyHiddenInput
                      type="file"
                      multiple
                      onChange={handleFileChange}
                    />
                  </Button>
                  
                  {fileErrors.length > 0 && (
                    <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>
                      Có {fileErrors.length} lỗi khi chọn file. Vui lòng kiểm tra lại.
                    </Typography>
                  )}

                  {isUploading && (
                    <Box sx={{ width: '100%', mb: 2 }}>
                      <LinearProgress variant="determinate" value={uploadProgress} />
                      <Typography variant="caption" sx={{ mt: 1 }}>
                        Đang tải lên: {uploadProgress}%
                      </Typography>
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    {files.map((file, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1,
                          mb: 1,
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                          backgroundColor: 'background.paper',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <AttachFileIcon sx={{ mr: 1 }} />
                        <Typography variant="body2" sx={{ flexGrow: 1 }}>
                          {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </Typography>
                        <Chip 
                          size="small" 
                          label={file.type.split('/')[1] || 'file'} 
                          variant="outlined" 
                          sx={{ mr: 1 }} 
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <FormControl
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <InputLabel id="calendar-sync-label" sx={{ ml: 1 }}>
                        Đồng bộ với lịch
                      </InputLabel>
                      <Select
                        labelId="calendar-sync-label"
                        name="calendarType"
                        value={formData.calendarType}
                        onChange={handleChange}
                        disabled={!formData.syncWithCalendar}
                        sx={{ ml: 2, minWidth: 150 }}
                      >
                        <MenuItem value="google">Google Calendar</MenuItem>
                        <MenuItem value="outlook">Microsoft Outlook</MenuItem>
                      </Select>
                      <Tooltip title="Bạn cần kết nối với Google Calendar trong phần cài đặt trước khi có thể đồng bộ">
                        <Chip
                          label={formData.syncWithCalendar ? "Bật" : "Tắt"}
                          color={formData.syncWithCalendar ? "primary" : "default"}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              syncWithCalendar: !prev.syncWithCalendar,
                            }))
                          }
                          icon={<CalendarIcon />}
                          clickable
                          sx={{ ml: 2 }}
                        />
                      </Tooltip>
                    </FormControl>
                  </Box>
                  {formData.syncWithCalendar && (
                    <Box sx={{ ml: 2, mb: 1 }}>
                      <Typography 
                        variant="caption" 
                        color="info.main" 
                        sx={{ display: 'block' }}
                      >
                        <b>Lưu ý:</b> Bạn cần kết nối với {formData.calendarType === 'google' ? 'Google Calendar' : 'Outlook'} trong phần cài đặt trước khi có thể đồng bộ task.
                      </Typography>
                      <Button
                        variant="text"
                        color="primary"
                        size="small"
                        component={RouterLink}
                        to="/settings/calendar"
                        target="_blank"
                        sx={{ mt: 0.5, textTransform: 'none', p: 0 }}
                      >
                        Đi đến cài đặt lịch
                      </Button>
                    </Box>
                  )}
                </Grid>

                {errors.submit && (
                  <Grid item xs={12}>
                    <FormHelperText error>{errors.submit}</FormHelperText>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mt: 2,
                    }}
                  >
                    <BackButton
                      label="Hủy"
                      onClick={() => (onClose ? onClose() : navigate(-1))}
                    />
                    <Box>
                      {task?._id && (
                        <Tooltip
                          title={
                            !canDeleteTask(task, project)
                              ? "Chỉ Admin, Project Manager hoặc người tạo task (khi chưa được gán) mới có thể xóa"
                              : "Xóa công việc"
                          }
                        >
                          <span>
                            <Button
                              type="button"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={handleDelete}
                              sx={{ mr: 1 }}
                              disabled={loading || !canDeleteTask(task, project)}
                            >
                              Xóa
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {task?._id && task?.status !== "done" && (
                        <Button
                          type="button"
                          color="success"
                          variant="outlined"
                          startIcon={<CheckCircleIcon />}
                          onClick={handleComplete}
                          sx={{ mr: 1 }}
                          disabled={loading}
                        >
                          Hoàn thành
                        </Button>
                      )}
                      <Button 
                        type="button" 
                        variant="contained" 
                        disabled={loading}
                        onClick={handleSave}
                      >
                        {loading ? (
                          <CircularProgress size={24} />
                        ) : task?._id ? (
                          "Cập nhật"
                        ) : (
                          "Tạo mới"
                        )}
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </DialogContent>
      </Dialog>

      {/* Dialog cho nhập thời gian khi hoàn thành task */}
      <Dialog open={timeDialogOpen} onClose={closeTimeDialog}>
        <DialogTitle>Nhập thời gian đã làm</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Vui lòng nhập thời gian bạn đã dành để hoàn thành công việc này.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            type="number"
            label="Thời gian đã làm (giờ)"
            value={tempActualTime}
            onChange={(e) => setTempActualTime(Number(e.target.value))}
            InputProps={{ 
              inputProps: { min: 0, step: 0.5 },
              startAdornment: <ScheduleIcon color="success" sx={{ mr: 1, opacity: 0.7 }} />,
            }}
            helperText="Nhập số giờ thực tế đã làm"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTimeDialog}>Bỏ qua</Button>
          <Button onClick={saveActualTime} variant="contained" color="primary">
            Lưu thời gian
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tagsDialogOpen} onClose={closeTagsDialog}>
        <DialogTitle>Thêm tag mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tên tag"
            fullWidth
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTagsDialog}>Hủy</Button>
          <Button onClick={addTag} variant="contained">
            Thêm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskForm;
