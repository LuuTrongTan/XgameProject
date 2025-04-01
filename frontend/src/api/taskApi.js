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
    // Kiểm tra nếu projectId hoặc sprintId không tồn tại
    if (!projectId) {
      console.error('Error: Project ID is missing');
      return { success: false, message: 'ID dự án không hợp lệ hoặc bị thiếu' };
    }

    if (!sprintId || sprintId === 'default') {
      console.error('Error: Valid Sprint ID is required');
      return { success: false, message: 'Vui lòng tạo và chọn một sprint trước khi tạo công việc' };
    }

    // Kiểm tra nếu sprintId là một object thì lấy _id hoặc id
    let processedSprintId;
    if (typeof sprintId === 'object' && sprintId !== null) {
      processedSprintId = sprintId._id || sprintId.id;
      if (!processedSprintId || processedSprintId === 'default') {
        console.error('Invalid sprint object:', sprintId);
        return { success: false, message: 'Đối tượng sprint không chứa ID hợp lệ' };
      }
    } else {
      processedSprintId = sprintId;
    }

    console.log(`Creating task in project ${projectId} and sprint ${processedSprintId}`);
    console.log('Task data being sent to API:', JSON.stringify(taskData, null, 2));
    
    const response = await API.post(`/projects/${projectId}/sprints/${processedSprintId}/tasks`, taskData);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    console.error('Error response:', error.response?.data);
    
    // Log thêm thông tin chi tiết từ response lỗi
    if (error.response?.data?.errors) {
      console.error('Validation errors:', error.response.data.errors);
    }
    
    return { 
      success: false, 
      message: error.response?.data?.message || 'Không thể tạo công việc mới. Vui lòng thử lại sau.',
      errors: error.response?.data?.errors || []
    };
  }
};

// Cập nhật công việc
export const updateTask = async (projectId, sprintId, taskId, taskData) => {
  try {
    console.log(`Updating task ${taskId} with data:`, taskData);
    
    const response = await API.put(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`, taskData);
    return response.data;
  } catch (error) {
    console.error("Error updating task:", error);
    return { 
      success: false, 
      message: error.response?.data?.message || "Không thể cập nhật công việc",
      error: error
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
    
    // Sử dụng API endpoint dành riêng cho việc cập nhật trạng thái
    const response = await API.put(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/status`, { 
      status: status
    });
    
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
export const addTaskAttachment = async (projectId, sprintId, taskId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Lấy danh sách tệp đính kèm
export const getTaskAttachments = async (projectId, sprintId, taskId) => {
  const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`);
  return response.data;
};

// Xóa tệp đính kèm
export const deleteTaskAttachment = async (projectId, sprintId, taskId, attachmentId) => {
  const response = await API.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments/${attachmentId}`);
  return response.data;
};

// Lấy danh sách bình luận
export const getTaskComments = async (projectId, sprintId, taskId) => {
  const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`);
  return response.data;
};

// Thêm bình luận
export const addTaskComment = async (projectId, sprintId, taskId, content) => {
  const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`, { content });
  return response.data;
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
  const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/history`);
  return response.data;
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
