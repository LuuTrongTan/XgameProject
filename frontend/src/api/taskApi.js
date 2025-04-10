import API from "./api";
import axios from "axios";

// Lấy danh sách công việc trong sprint
export const getSprintTasks = async (projectId, sprintId) => {
  try {
    if (!projectId) {
      console.error('Error: Project ID is missing');
      return { success: false, message: 'ID dự án không hợp lệ hoặc bị thiếu' };
    }

    // Xử lý trường hợp sprintId
    let processedSprintId;
    if (typeof sprintId === 'object' && sprintId !== null) {
      processedSprintId = sprintId._id || sprintId.id;
      if (!processedSprintId) {
        console.error('Invalid sprint object:', sprintId);
        return { success: false, message: 'Đối tượng sprint không chứa ID hợp lệ' };
      }
    } else {
      processedSprintId = sprintId;
    }

    // Nếu có sprint ID, gọi API với sprint ID
    let url;
    if (processedSprintId && processedSprintId !== 'default') {
      console.log(`Fetching tasks for project ${projectId} and sprint ${processedSprintId}`);
      url = `/projects/${projectId}/sprints/${processedSprintId}/tasks`;
    } else {
      // Nếu không có sprint ID hoặc là 'default', lấy tất cả task của project
      console.log(`Fetching all tasks for project ${projectId}`);
      url = `/projects/${projectId}/tasks`;
    }

    const response = await API.get(url);
    
    // Log để kiểm tra dữ liệu sprint trong tasks
    if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
      const firstTask = response.data.data[0];
      console.log("Sample task received:", {
        taskId: firstTask._id,
        taskTitle: firstTask.title,
        sprintData: firstTask.sprint,
        hasSprintField: !!firstTask.sprint,
        hasSprintName: firstTask.sprint?.name ? true : false
      });
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Không thể tải danh sách công việc. Vui lòng thử lại sau.',
      isNetworkError: !error.response
    };
  }
};

// Lấy chi tiết công việc
export const getTaskById = async (projectId, sprintId, taskId) => {
  const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`);
  return response.data;
};

// Tạo công việc mới
export const createTask = async (projectId, sprintId, taskData) => {
  try {
    // Kiểm tra projectId
    if (!projectId) {
      console.error("createTask: Missing projectId");
      throw new Error("Missing projectId");
    }

    // Kiểm tra sprintId
    if (!sprintId) {
      console.error("createTask: Missing sprintId");
      throw new Error("Missing sprintId");
    }

    // Kiểm tra và chuẩn hóa dữ liệu task - Sử dụng các trường từ frontend
    // Sử dụng tên trường mà frontend đang gửi
    const validatedData = {
      title: taskData.title || "Untitled Task",
      description: taskData.description || "",
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      startDate: taskData.startDate || new Date().toISOString(),
      dueDate: taskData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedTime: taskData.estimatedTime || 0,
      assignees: taskData.assignees || [],
      tags: taskData.tags || [],
    };

    // Log thông tin request
    console.log(`Creating task for project ${projectId}, sprint ${sprintId}:`, validatedData);

    // Gọi API với timeout
    const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks`, validatedData, {
      timeout: 15000  // 15 second timeout
    });

    console.log("Task created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating task:", error);

    // Check for specific error types
    if (!error.response) {
      console.error("Network error when creating task");
      throw {
        message: "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.",
        isNetworkError: true,
        originalError: error
      };
    }

    // Check response status
    switch (error.response?.status) {
      case 400:
        console.error("Bad request when creating task:", error.response.data);
        throw {
          message: error.response.data.message || "Dữ liệu task không hợp lệ.",
          status: 400,
          originalError: error
        };
      case 401:
        console.error("Unauthorized when creating task");
        throw {
          message: "Bạn cần đăng nhập lại để tạo task.",
          status: 401,
          originalError: error
        };
      case 403:
        console.error("Forbidden when creating task");
        throw {
          message: "Bạn không có quyền tạo task trong sprint này.",
          status: 403,
          originalError: error
        };
      case 404:
        console.error("Project or sprint not found when creating task");
        throw {
          message: "Không tìm thấy dự án hoặc sprint được chỉ định.",
          status: 404,
          originalError: error
        };
      case 500:
      case 502:
      case 503:
      case 504:
        console.error("Server error when creating task:", error.response.data);
        throw {
          message: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
          status: error.response.status,
          isServerError: true,
          originalError: error
        };
      default:
        throw {
          message: error.response.data.message || "Đã xảy ra lỗi khi tạo task.",
          status: error.response.status,
          originalError: error
        };
    }
  }
};

// Cập nhật công việc
export const updateTask = async (projectId, sprintId, taskId, taskData) => {
  try {
    // Validate input parameters
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết cho việc cập nhật task" 
      };
    }
    
    console.log("taskApi.js - Updating task:", { 
      projectId, 
      sprintId, 
      taskId, 
      taskData 
    });
    
    // Đảm bảo task ID là hợp lệ
    const taskIdStr = String(taskId).trim();
    if (!taskIdStr) {
      return { 
        success: false, 
        message: "Task ID không hợp lệ" 
      };
    }
    
    // Đơn giản hóa payload để đảm bảo tránh lỗi dữ liệu không hợp lệ
    // Chỉ bao gồm các trường bắt buộc và trường cần cập nhật
    const payload = {
      title: taskData.title || taskData.name || "Untitled Task", // Đảm bảo có trường title
      description: taskData.description || "", // Đảm bảo có trường description
    };
    
    // Chỉ thêm các trường khác nếu chúng được định nghĩa trong taskData
    if (taskData.status !== undefined) payload.status = taskData.status;
    if (taskData.priority !== undefined) payload.priority = taskData.priority;
    if (taskData.dueDate !== undefined) payload.dueDate = taskData.dueDate;
    if (taskData.startDate !== undefined) payload.startDate = taskData.startDate;
    if (taskData.estimatedTime !== undefined) payload.estimatedTime = taskData.estimatedTime;
    if (taskData.assignees !== undefined) payload.assignees = taskData.assignees;
    if (taskData.tags !== undefined) payload.tags = taskData.tags;
    
    console.log("Simplified payload for update:", payload);
    
    const url = `/projects/${projectId}/sprints/${sprintId}/tasks/${taskIdStr}`;
    console.log("Making PUT request to:", url);
    
    // Sử dụng đúng URL pattern dựa trên backend API
    const response = await API.put(url, payload);
    console.log("Response from server:", response.data);
    
    return response.data;
  } catch (error) {
    console.error("Error updating task:", error);
    
    // Log thêm thông tin lỗi chi tiết nếu có
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Error data:", error.response.data);
      
      // Log lỗi validation nếu có
      if (error.response.data && error.response.data.errors) {
        console.error("Validation errors:", error.response.data.errors);
      }
    }
    
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể cập nhật công việc",
      errors: error.response?.data?.errors || [],
      errorDetails: {
        status: error.response?.status,
        data: error.response?.data
      }
    };
  }
};

// Xóa công việc
export const deleteTask = async (projectId, sprintId, taskId) => {
  const response = await API.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`);
  return response.data;
};

// Cập nhật trạng thái công việc
export const updateTaskStatus = async ({ taskId, status, position, projectId, sprintId }) => {
  try {
    console.log(`[TaskApi] ===== UPDATING TASK STATUS =====`);
    console.log(`[TaskApi] Task ID: ${taskId}`);
    console.log(`[TaskApi] Project ID: ${projectId}`);
    console.log(`[TaskApi] Sprint ID: ${sprintId}`);
    console.log(`[TaskApi] New status: ${status}`);
    console.log(`[TaskApi] New position: ${position}`);
    
    // Kiểm tra các tham số
    if (!taskId) {
      console.error("[TaskApi] Missing required parameter: taskId");
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết cho việc cập nhật trạng thái",
      };
    }
    
    if (!projectId) {
      console.error("[TaskApi] Missing required parameter: projectId");
      return { 
        success: false, 
        message: "Thiếu thông tin dự án",
      };
    }
    
    if (!sprintId) {
      console.error("[TaskApi] Missing required parameter: sprintId");
      return { 
        success: false, 
        message: "Thiếu thông tin sprint",
      };
    }
    
    // Đảm bảo status hợp lệ
    if (!["todo", "inProgress", "review", "done"].includes(status)) {
      console.error("[TaskApi] Invalid status value:", status);
      return {
        success: false,
        message: "Giá trị trạng thái không hợp lệ",
      };
    }
    
    // Đảm bảo taskId là chuỗi
    const taskIdStr = String(taskId).trim();
    
    // Chuẩn bị dữ liệu cần gửi
    const data = { status };
    
    // Thêm position nếu được cung cấp và không phải -1
    if (position !== undefined && position !== -1) {
      data.position = position;
    }
    
    // Xác định đường dẫn API
    let apiPath = `/projects/${projectId}/sprints/${sprintId}/tasks/${taskIdStr}/status`;
    console.log(`[TaskApi] API Path: ${apiPath}`);
    console.log(`[TaskApi] Request payload:`, data);
    
    // Gọi API để cập nhật status, sử dụng PUT method
    console.log(`[TaskApi] Sending PUT request...`);
    const response = await API.put(apiPath, data);
    
    console.log(`[TaskApi] Status update response:`, response.data);
    console.log(`[TaskApi] Response status: ${response.status}`);
    console.log(`[TaskApi] Response success: ${response.data.success}`);
    
    if (response.data.oldStatus) {
      console.log(`[TaskApi] Old status: ${response.data.oldStatus}`);
    }
    
    return response.data;
  } catch (error) {
    console.error("[TaskApi] Error updating task status:", error);
    
    if (error.response) {
      console.error(`[TaskApi] Response status: ${error.response.status}`);
      console.error(`[TaskApi] Response data:`, error.response.data);
    } else if (error.request) {
      console.error(`[TaskApi] Request was made but no response received:`, error.request);
    } else {
      console.error(`[TaskApi] Error setting up request:`, error.message);
    }
    
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể cập nhật trạng thái công việc",
      error: error
    };
  }
};

// Gán công việc
export const assignTask = async (projectId, sprintId, taskId, assigneeId) => {
  const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/assign`, { assigneeId });
  return response.data;
};

// Tải lên tệp đính kèm
export const addTaskAttachment = async (projectId, sprintId, taskId, fileOrFormData) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters for addTaskAttachment:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết để tải lên tệp đính kèm" 
      };
    }

    if (!fileOrFormData) {
      console.error("No file or FormData provided for upload");
      return {
        success: false,
        message: "Không có tệp để tải lên"
      };
    }

    // Chuẩn bị FormData nếu tham số là File thay vì FormData
    let formData;
    if (fileOrFormData instanceof FormData) {
      console.log("Using provided FormData for upload");
      formData = fileOrFormData;
    } else {
      console.log("Creating new FormData with provided file:", fileOrFormData.name);
      formData = new FormData();
      formData.append("file", fileOrFormData);
    }

    console.log(`Uploading attachment for task: ${taskId} in project: ${projectId}, sprint: ${sprintId}`);
    
    // Thiết lập timeout dài hơn cho upload file
    const response = await API.post(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000 // 30 giây cho upload file
      }
    );
    
    console.log("Upload response:", response);
    
    // Xử lý phản hồi
    if (response.data) {
      if (response.data.success === undefined) {
        // Chuẩn hóa phản hồi nếu không có trường success
        return {
          success: true,
          message: "Tải lên tệp đính kèm thành công",
          data: response.data
        };
      }
      // Nếu phản hồi đã có định dạng chuẩn
      return response.data;
    }
    
    // Trường hợp phản hồi rỗng
    return {
      success: false,
      message: "Không có phản hồi từ máy chủ khi tải lên tệp đính kèm"
    };
  } catch (error) {
    console.error("Error uploading attachment:", error);
    
    // Log thêm thông tin chi tiết về lỗi
    if (error.response) {
      console.error("Upload error details:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể tải lên tệp đính kèm. Vui lòng thử lại sau.",
      error: error.message,
      isNetworkError: !error.response,
      status: error.response?.status
    };
  }
};

// Upload file đính kèm
export const uploadTaskAttachment = async (projectId, sprintId, taskId, file) => {
  try {
    if (!projectId || !sprintId || !taskId || !file) {
      throw new Error("Missing required parameters");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await API.post(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    throw error;
  }
};

// Lấy danh sách file đính kèm
export const getTaskAttachments = async (projectId, sprintId, taskId) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      throw new Error("Missing required parameters");
    }

    const response = await API.get(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching attachments:", error);
    throw error;
  }
};

// Xóa file đính kèm
export const deleteTaskAttachment = async (projectId, sprintId, taskId, attachmentId) => {
  try {
    if (!projectId || !sprintId || !taskId || !attachmentId) {
      throw new Error("Missing required parameters");
    }

    const response = await API.delete(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments/${attachmentId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting attachment:", error);
    throw error;
  }
};

// Lấy lịch sử thay đổi của task
export const getTaskHistory = async (projectId, sprintId, taskId) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      throw new Error("Missing required parameters");
    }

    const response = await API.get(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/history`
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to get task history");
    }

    return response.data.data;
  } catch (error) {
    console.error("Error getting task history:", error);
    throw error;
  }
};

// Lấy danh sách bình luận
export const getTaskComments = async (projectId, sprintId, taskId) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      throw new Error("Missing required parameters");
    }
    const response = await API.get(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

// Thêm bình luận
export const addTaskComment = async (projectId, sprintId, taskId, comment) => {
  try {
    if (!projectId || !sprintId || !taskId || !comment) {
      throw new Error("Missing required parameters");
    }
    const response = await API.post(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`,
      comment
    );
    return response.data;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

// Cập nhật bình luận
export const updateTaskComment = async (projectId, sprintId, taskId, commentId, comment) => {
  try {
    if (!projectId || !sprintId || !taskId || !commentId || !comment) {
      throw new Error("Missing required parameters");
    }
    const response = await API.put(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments/${commentId}`,
      comment
    );
    return response.data;
  } catch (error) {
    console.error("Error updating comment:", error);
    throw error;
  }
};

// Xóa bình luận
export const deleteTaskComment = async (projectId, sprintId, taskId, commentId) => {
  try {
    if (!projectId || !sprintId || !taskId || !commentId) {
      throw new Error("Missing required parameters");
    }
    const response = await API.delete(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments/${commentId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
};

// Đồng bộ với lịch
export const syncWithCalendar = async (projectId, sprintId, taskId, calendarType) => {
  try {
    const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/sync-calendar`, { calendarType });
    return response.data;
  } catch (error) {
    console.error("Error syncing with calendar:", error);
    return {
      success: false,
      message: error.response?.data?.message || "Không thể đồng bộ với lịch",
      error: error
    };
  }
};

// Lấy danh sách công việc chưa phân công
export const getUnassignedTasks = async (projectId, sprintId) => {
  const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks`, {
    params: {
      unassigned: true,
    },
  });
  return response.data;
};

// Lấy thông tin chi tiết của sprint
export const getSprintDetails = async (projectId, sprintId) => {
  try {
    if (!projectId || !sprintId) {
      console.error("Missing required parameters for getSprintDetails:", { projectId, sprintId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết để lấy chi tiết sprint" 
      };
    }
    
    const response = await API.get(`/projects/${projectId}/sprints/${sprintId}`);
    return response.data;
  } catch (error) {
    console.error("[API Error] GET sprint details:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể lấy thông tin chi tiết của sprint. Vui lòng thử lại sau.",
      isNetworkError: !error.response
    };
  }
};

// Cập nhật tiến độ công việc
export const updateTaskProgress = async (projectId, sprintId, taskId, progress) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters for updateTaskProgress:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết để cập nhật tiến độ" 
      };
    }
    
    // Kiểm tra giá trị progress là hợp lệ
    const progressValue = Number(progress);
    if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
      return {
        success: false,
        message: "Giá trị tiến độ phải là số từ 0-100"
      };
    }
    
    // Sử dụng updateTask API để cập nhật trường progress
    const response = await API.put(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`, { 
      progress: progressValue 
    });
    
    return response.data;
  } catch (error) {
    console.error("Error updating task progress:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể cập nhật tiến độ công việc",
      error: error
    };
  }
};
