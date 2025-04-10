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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    startDate: new Date(), // Today
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    assignees: [],
    estimatedHours: 0,
    actualHours: 0, // Thêm trường thời gian đã làm
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
  const [tempActualHours, setTempActualHours] = useState(0);

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
        estimatedHours: task.estimatedHours || 0,
        actualHours: task.actualHours || 0, // Lấy giá trị đã có hoặc mặc định là 0
        project: task.project || projectId || project?._id,
        sprint: task.sprint || sprintId || project?.currentSprint?._id,
        tags: task.tags || [],
        syncWithCalendar: task.syncWithCalendar || false,
        calendarType: task.calendarType || "google",
      });
    } else {
      // Reset form when creating new task
      const projectIdValue = projectId || project?._id;
      
      // Kiểm tra và log thông tin
      console.log('[DEBUG] Reset form with project:', projectIdValue);
      console.log('[DEBUG] Sprint information:', { 
        providedSprintId: sprintId, 
        currentProjectSprint: project?.currentSprint?._id 
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
        estimatedHours: 0,
        actualHours: 0, // Mặc định là 0
        project: projectIdValue, // Đảm bảo có project ID
        sprint: sprintId || project?.currentSprint?._id, // Sprint có thể null
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
    console.log('[DEBUG] fetchUsers CALLED', { sprintId: formData.sprint, projectId: formData.project });
    
    // Reset users - để tránh hiển thị dữ liệu cũ
    setUsers([]);
    
    try {
      // Kiểm tra project ID
      if (!formData.project) {
        console.error('[ERROR] Missing project ID', { project: formData.project });
        return; // Thoát sớm nếu thiếu thông tin
      }
      
      // Nếu không có sprint, lấy danh sách thành viên project thay vì sprint
      let response;
      if (!formData.sprint) {
        console.log(`[DEBUG] No sprint ID, fetching project members: /projects/${formData.project}/members`);
        response = await API.get(`/projects/${formData.project}/members`);
      } else {
        // Gọi API Sprint Members 
        console.log(`[DEBUG] Fetching sprint members: /projects/${formData.project}/sprints/${formData.sprint}/members`);
        response = await API.get(`/projects/${formData.project}/sprints/${formData.sprint}/members`);
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
      setTempActualHours(formData.actualHours);
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
    setFormData((prev) => ({
      ...prev,
      tags: newValue,
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
    if (formData.estimatedHours < 0) {
      newErrors.estimatedHours = "Thời gian ước tính không hợp lệ";
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
    setErrors({});

    // Validate form data
    const validationErrors = {};
    if (!formData.title || formData.title.trim().length < 3) {
      validationErrors.title = 'Tiêu đề phải có ít nhất 3 ký tự';
    }
    if (!formData.description || formData.description.trim().length < 10) {
      validationErrors.description = 'Mô tả phải có ít nhất 10 ký tự';
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      console.log("[Task Debug] Saving task with form data:", formData);
      console.log("[Task Debug] Files to upload:", files.length > 0 ? files.map(f => f.name) : "No files");
      
      // Chuẩn bị payload cho task
      const taskPayload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        assignees: formData.assignees,
        estimatedHours: formData.estimatedHours,
        actualHours: formData.actualHours,
        tags: formData.tags
      };
      
      let response;
      
      // CHỈNH SỬA: Kiểm tra cẩn thận nếu task tồn tại
      if (task && task._id) {
        console.log("[Task Debug] Updating existing task:", task._id);
        
        // Tạo endpoint đúng cho việc cập nhật task
        let updateEndpoint;
        if (formData.sprint) {
          updateEndpoint = `/projects/${formData.project}/sprints/${formData.sprint}/tasks/${task._id}`;
        } else {
          updateEndpoint = `/projects/${formData.project}/tasks/${task._id}`;
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
            await uploadTaskFiles(task._id, formData.project, formData.sprint);
            enqueueSnackbar("Tệp đính kèm đã được tải lên thành công", { variant: "success" });
          } catch (fileError) {
            console.error("[Task Debug] Error uploading attachments:", fileError);
            enqueueSnackbar("Có lỗi khi tải lên tệp đính kèm", { variant: "error" });
          }
        }
        
        await ActivityService.logTaskUpdated(formData.title);
      } else {
        // Tạo task mới
        let endpoint;
        if (formData.sprint) {
          endpoint = `/projects/${formData.project}/sprints/${formData.sprint}/tasks`;
        } else {
          endpoint = `/projects/${formData.project}/tasks`;
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
              if (formData.sprint) {
                attachmentEndpoint = `/projects/${formData.project}/sprints/${formData.sprint}/tasks/${newTaskId}/attachments`;
              } else {
                attachmentEndpoint = `/projects/${formData.project}/tasks/${newTaskId}/attachments`;
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
        
        await ActivityService.logTaskCreated(formData.title, project?.name);

        // Nếu có yêu cầu đồng bộ lịch
        if (formData.syncWithCalendar && newTaskId) {
          let syncEndpoint;
          if (formData.sprint) {
            syncEndpoint = `/projects/${formData.project}/sprints/${formData.sprint}/tasks/${newTaskId}/sync-calendar`;
          } else {
            syncEndpoint = `/projects/${formData.project}/tasks/${newTaskId}/sync-calendar`;
          }
          
          console.log("[Task Debug] Syncing calendar with endpoint:", syncEndpoint);
          
          await API.post(syncEndpoint, {
            calendarType: formData.calendarType,
          });
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

    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      setLoading(true);
      try {
        await API.delete(`/tasks/${task._id}`);
        await ActivityService.logTaskDeleted(task.title);
        enqueueSnackbar("Công việc đã được xóa thành công", {
          variant: "success",
          autoHideDuration: 5000,
        });
        // Remove navigation from here - let parent component handle it
        // navigate(`/projects/${project?._id}`);
      } catch (error) {
        console.error("Error deleting task:", error);
        enqueueSnackbar(
          error.response?.data?.message || "Không thể xóa công việc",
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
      actualHours: tempActualHours
    }));
    setTimeDialogOpen(false);
  };

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
                      <MenuItem value="review">Đang kiểm tra</MenuItem>
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
                    id="tags"
                    options={availableTags}
                    value={formData.tags}
                    onChange={handleTagsChange}
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
                      <TextField {...params} label="Tags" placeholder="Thêm tag" />
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
                    name="estimatedHours"
                    label="Thời gian ước tính (giờ)"
                    value={formData.estimatedHours}
                    onChange={handleChange}
                    error={!!errors.estimatedHours}
                    helperText={errors.estimatedHours || "Thời gian dự kiến để hoàn thành"}
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
                    name="actualHours"
                    label="Thời gian đã làm (giờ)"
                    value={formData.actualHours}
                    onChange={handleChange}
                    error={!!errors.actualHours}
                    helperText={errors.actualHours || "Số giờ đã làm thực tế"}
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
                    </FormControl>
                  </Box>
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
            value={tempActualHours}
            onChange={(e) => setTempActualHours(Number(e.target.value))}
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
