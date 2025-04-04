import API from "./api";

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
export const updateTaskStatus = async (projectId, sprintId, taskId, status) => {
  try {
    console.log(`Updating task status to: ${status} for task ${taskId}`);
    
    // Kiểm tra các tham số
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết cho việc cập nhật trạng thái",
      };
    }
    
    // Đảm bảo status hợp lệ
    if (!["todo", "inProgress", "review", "done"].includes(status)) {
      console.error("Invalid status value:", status);
      return {
        success: false,
        message: "Giá trị trạng thái không hợp lệ",
      };
    }
    
    // Đảm bảo taskId là chuỗi
    const taskIdStr = String(taskId).trim();
    
    // Sử dụng API endpoint chính xác để cập nhật trạng thái
    console.log("Using dedicated status update endpoint");
    
    // Gọi API để cập nhật status, sử dụng PUT method như định nghĩa ở backend
    const response = await API.put(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskIdStr}/status`, 
      { status }
    );
    
    console.log('Status update response:', response.data);
    return response.data;
  } catch (error) {
    console.error("Error updating task status:", error);
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

// Tải lên tệp đính kèm
export const uploadTaskAttachment = async (projectId, sprintId, taskId, file) => {
  try {
    if (!projectId || !sprintId || !taskId || !file) {
      console.error("Missing required parameters for uploadTaskAttachment:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết để tải lên tệp đính kèm" 
      };
    }
    
  const formData = new FormData();
  formData.append("file", file);
    
    // Đặt timeout dài hơn cho upload file
    const response = await API.post(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`,
      formData,
      {
    headers: {
      "Content-Type": "multipart/form-data",
    },
        timeout: 60000 // 60 giây cho upload file
      }
    );
    
  return response.data;
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể tải lên tệp đính kèm. Vui lòng thử lại sau.",
      isNetworkError: !error.response
    };
  }
};

// Lấy danh sách tệp đính kèm
export const getTaskAttachments = async (projectId, sprintId, taskId) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters for getTaskAttachments:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết để lấy danh sách tệp đính kèm" 
      };
    }

    console.log(`Fetching attachments for task: ${taskId} in project: ${projectId}, sprint: ${sprintId}`);
    
  const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`);
    console.log("Attachment API raw response:", response);
    
    // Kiểm tra và chuẩn hóa dữ liệu
    if (response.data) {
      // Nếu có dữ liệu nhưng không có thuộc tính success
      if (response.data.success === undefined) {
        console.log("Converting attachment data to standard format");
        return {
          success: true,
          message: "Dữ liệu tệp đính kèm nhận được",
          data: Array.isArray(response.data) ? response.data : [response.data]
        };
      } 
      
      // Nếu dữ liệu đã ở định dạng standard (có success)
  return response.data;
    }
    
    // Trường hợp response rỗng hoặc không hợp lệ
    console.warn("Empty or invalid attachment response", response);
    return {
      success: true,
      message: "Không có tệp đính kèm",
      data: []
    };
  } catch (error) {
    console.error("[API Error] GET attachments:", error);
    
    // Log thêm thông tin chi tiết về lỗi
    if (error.response) {
      console.error("Error details:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    // Nếu API trả về 404, trả về mảng rỗng thay vì báo lỗi
    if (error.response && error.response.status === 404) {
      return {
        success: true,
        message: "Không có tệp đính kèm",
        data: []
      };
    }
    
    // Trả về thông báo lỗi cụ thể hơn
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể lấy danh sách tệp đính kèm. Vui lòng thử lại sau.",
      error: error.message,
      isNetworkError: !error.response,
      status: error.response?.status
    };
  }
};

// Xóa tệp đính kèm
export const deleteTaskAttachment = async (projectId, sprintId, taskId, attachmentId) => {
  try {
  const response = await API.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments/${attachmentId}`);
  return response.data;
  } catch (error) {
    console.error("[API Error] DELETE attachment:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể xóa tệp đính kèm. Vui lòng thử lại sau.",
      isNetworkError: !error.response
    };
  }
};

// Lấy danh sách bình luận
export const getTaskComments = async (projectId, sprintId, taskId) => {
  try {
    if (!taskId) {
      console.error("Missing taskId for getTaskComments");
      return { 
        success: false, 
        message: "Thiếu ID của task để lấy bình luận"
      };
    }
    
    console.log("Fetching comments for taskId:", taskId);
    
    // Sử dụng route /api/comments thay vì route trong task
    const response = await API.get(`/comments`, {
      params: {
        taskId: taskId
      }
    });
    
    console.log("Comments API response:", response.data);
    
    // Chuẩn hóa dữ liệu trả về
    if (response.data && Array.isArray(response.data.data)) {
      return {
        success: true,
        data: response.data.data,
        message: "Lấy danh sách bình luận thành công"
      };
    } else if (response.data && response.data.success) {
      // Nếu đã có format standard với success = true
  return response.data;
    } else {
      // Nếu có dữ liệu nhưng không theo format mong đợi
      console.warn("Comment data format unexpected:", response.data);
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data : (response.data.data || []),
        message: "Dữ liệu bình luận đã được chuyển đổi"
      };
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Không thể tải bình luận. Vui lòng thử lại sau.',
      isNetworkError: !error.response
    };
  }
};

// Thêm bình luận
export const addTaskComment = async (projectId, sprintId, taskId, content) => {
  let retryCount = 0;
  const maxRetries = 3;
  
  const attemptAddComment = async () => {
    try {
      if (!projectId || !sprintId || !taskId || !content) {
        console.error("Missing required parameters for addTaskComment:", { projectId, sprintId, taskId, content });
        return { 
          success: false, 
          message: "Thiếu thông tin cần thiết để thêm bình luận" 
        };
      }
  
      console.log(`Thêm bình luận cho task ${taskId}, lần thử ${retryCount + 1}/${maxRetries}`);
      
      // Tạo bản sao của dữ liệu comment để có thể sử dụng ngay lập tức trên UI
      const optimisticComment = {
        _id: `temp_${Date.now()}`,
        content: content,
        taskId: taskId,
        createdAt: new Date().toISOString(),
        user: JSON.parse(localStorage.getItem('user') || '{}')
      };
      
      // Lưu thông tin backup cho comment
      const backupKey = `comment_backup_${taskId}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify({
        projectId,
        sprintId,
        taskId,
        content,
        timestamp: Date.now()
      }));
  
      // Gửi yêu cầu API với timeout 10 giây
      const response = await API.post(
        `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`, 
        { content },
        { timeout: 10000 }
      );
      
      // Xóa backup sau khi gửi thành công
      localStorage.removeItem(backupKey);
      
      return {
        success: true,
        message: "Thêm bình luận thành công",
        data: response.data?.data || optimisticComment,
        isOptimistic: !response.data?.data
      };
    } catch (error) {
      console.error(`[API Error] POST comment (attempt ${retryCount + 1}/${maxRetries}):`, error);
      
      // Nếu là lỗi mạng hoặc lỗi 500 và chưa retry đủ số lần, thử lại
      if ((error.message === 'Network Error' || (error.response && error.response.status >= 500)) 
          && retryCount < maxRetries - 1) {
        retryCount++;
        console.log(`Thử lại lần ${retryCount}/${maxRetries} sau ${retryCount * 2} giây...`);
        
        // Đợi mỗi lần retry dài hơn (2s, 4s, 6s)
        await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
        return attemptAddComment();
      }
      
      return {
        success: false,
        message: error.response?.data?.message || "Không thể thêm bình luận. Vui lòng thử lại sau.",
        isNetworkError: !error.response,
        hasBackup: true
      };
    }
  };
  
  return attemptAddComment();
};

// Cập nhật bình luận
export const updateTaskComment = async (projectId, sprintId, taskId, commentId, content) => {
  const response = await API.put(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments/${commentId}`, { content });
  return response.data;
};

// Xóa bình luận
export const deleteTaskComment = async (projectId, sprintId, taskId, commentId) => {
  const response = await API.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments/${commentId}`);
  return response.data;
};

// Lấy lịch sử thay đổi
export const getTaskAuditLogs = async (projectId, sprintId, taskId) => {
  try {
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters for getTaskAuditLogs:", { projectId, sprintId, taskId });
      return { 
        success: false, 
        message: "Thiếu thông tin cần thiết để lấy lịch sử thay đổi" 
      };
    }

    console.log(`Fetching history for task: ${taskId} in project: ${projectId}, sprint: ${sprintId}`);
    
    // Kiểm tra backend xem route này đã được triển khai chưa
    console.log("Testing history API endpoint");
    const url = `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/history`;
    
    const response = await API.get(url);
    console.log("History API raw response:", response);
    
    // Kiểm tra và chuẩn hóa dữ liệu
    if (response.data) {
      // Nếu có dữ liệu nhưng không có thuộc tính success
      if (response.data.success === undefined) {
        console.log("Converting history data to standard format");
        return {
          success: true,
          message: "Dữ liệu lịch sử nhận được",
          data: Array.isArray(response.data) ? response.data : [response.data]
        };
      } 
      
      // Nếu dữ liệu đã ở định dạng standard (có success)
  return response.data;
    }
    
    // Trường hợp response rỗng hoặc không hợp lệ
    console.warn("Empty or invalid history response", response);
    return {
      success: true,
      message: "Không có lịch sử thay đổi",
      data: []
    };
  } catch (error) {
    console.error("[API Error] GET history:", error);
    
    // Log thêm thông tin chi tiết về lỗi
    if (error.response) {
      console.error("Error details:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    // Nếu API trả về 404 hoặc 501 (Not Implemented), trả về mảng rỗng thay vì báo lỗi
    if (error.response && (error.response.status === 404 || error.response.status === 501)) {
      return {
        success: true,
        message: error.response.status === 501 ? 
                "Tính năng lịch sử thay đổi chưa được triển khai" : 
                "Không có lịch sử thay đổi",
        data: []
      };
    }
    
    // Trả về thông báo lỗi cụ thể hơn
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể lấy lịch sử thay đổi. Vui lòng thử lại sau.",
      error: error.message,
      isNetworkError: !error.response,
      status: error.response?.status
    };
  }
};

// Đồng bộ với lịch
export const syncWithCalendar = async (projectId, sprintId, taskId, calendarType) => {
  const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/sync-calendar`, { calendarType });
  return response.data;
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
