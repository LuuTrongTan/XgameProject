import api from "./api";

// Upload single file
export const uploadFile = async (file, options = {}) => {
  const formData = new FormData();
  
  try {
    console.log("Upload file được gọi với:", { 
      fileType: file?.constructor?.name, 
      isEvent: file instanceof Event,
      options 
    });
    
    // Handle different ways file might be passed
    if (file instanceof Event && file.target?.files?.length > 0) {
      console.log("File từ event, số lượng file:", file.target.files.length);
      console.log("File info:", {
        name: file.target.files[0].name,
        type: file.target.files[0].type,
        size: file.target.files[0].size
      });
      formData.append("file", file.target.files[0]);
    } else if (file instanceof FileList && file.length > 0) {
      console.log("File từ FileList, số lượng file:", file.length);
      console.log("File info:", {
        name: file[0].name,
        type: file[0].type,
        size: file[0].size
      });
      formData.append("file", file[0]);
    } else if (file instanceof File) {
      console.log("File trực tiếp:", {
        name: file.name,
        type: file.type,
        size: file.size
      });
      formData.append("file", file);
    } else {
      console.error("Không thể xác định loại file:", file);
      throw new Error("Định dạng file không hợp lệ");
    }
    
    // In ra form data để debug
    for (let pair of formData.entries()) {
      console.log("FormData content:", pair[0], pair[1] instanceof File ? 
        { name: pair[1].name, type: pair[1].type, size: pair[1].size } : pair[1]);
    }

    // Prioritize task-specific endpoints if task info is provided
    if (options.taskId && options.projectId && options.sprintId) {
      try {
        console.log("Đang tải lên file cho task với endpoint:", 
          `/projects/${options.projectId}/sprints/${options.sprintId}/tasks/${options.taskId}/attachments`
        );
        
        const response = await api.post(
          `/projects/${options.projectId}/sprints/${options.sprintId}/tasks/${options.taskId}/attachments`, 
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        
        console.log("Server response:", response.data);
        
        if (response.data) {
          return response.data;
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (error) {
        console.error("Error uploading file to task:", error);
        // Log more detailed information about the error
        if (error.response) {
          console.error("Server response:", {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data
          });
        }
        throw error;
      }
    }
    
    // Fall back to general upload endpoint if task specifics not provided
    // Tạo query string với các tham số
    let endpoint = "/upload";
    const queryParams = [];
    
    // Thêm các tham số vào query
    if (options.taskId) queryParams.push(`taskId=${options.taskId}`);
    if (options.projectId) queryParams.push(`projectId=${options.projectId}`);
    if (options.commentId) queryParams.push(`commentId=${options.commentId}`);
    if (options.permissions) queryParams.push(`permissions=${options.permissions}`);
    
    // Thêm query vào endpoint
    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join("&")}`;
    }

    console.log("Đang tải lên file với endpoint chung:", endpoint);
    
    const response = await api.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    console.log("Server response:", response.data);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || "Lỗi khi tải lên file");
    }
  } catch (error) {
    console.error("Lỗi khi tải lên file:", error);
    if (error.response) {
      console.error("Chi tiết lỗi từ server:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    throw error;
  }
};

// Get files by task ID
export const getFilesByTask = async (taskId, projectId, sprintId) => {
  try {
    // If all IDs are provided, use the task-specific endpoint
    if (taskId && projectId && sprintId) {
      const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`);
      return response.data;
    }
    
    // Fall back to general endpoint
    const response = await api.get(`/upload/task/${taskId}`);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || "Lỗi khi lấy danh sách file");
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách file theo task:", error);
    throw error;
  }
};

// Delete file
export const deleteFile = async (fileId, options = {}) => {
  try {
    // If task information is provided, use the task-specific endpoint
    if (options.taskId && options.projectId && options.sprintId) {
      const response = await api.delete(
        `/projects/${options.projectId}/sprints/${options.sprintId}/tasks/${options.taskId}/attachments/${fileId}`
      );
      return response.data;
    }
    
    // Fall back to general delete endpoint
    const response = await api.delete(`/upload/${fileId}`);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || "Lỗi khi xóa file");
    }
  } catch (error) {
    console.error("Lỗi khi xóa file:", error);
    throw error;
  }
};

// Get file details by ID
export const getFileById = async (fileId) => {
  try {
    const response = await api.get(`/upload/${fileId}`);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || "Lỗi khi lấy thông tin file");
    }
  } catch (error) {
    console.error("Lỗi khi lấy thông tin file:", error);
    throw error;
  }
};

// Get files from task attachments 
export const getTaskAttachments = async (projectId, sprintId, taskId) => {
  try {
    const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/attachments`);
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.message || "Lỗi khi lấy danh sách tệp đính kèm");
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tệp đính kèm:", error);
    throw error;
  }
};

// Get files with filters
export const getFiles = async (params = {}) => {
  const response = await api.get("/upload", { params });
  return response.data;
};

// Update file permissions
export const updateFilePermissions = async (fileId, updateData) => {
  const response = await api.patch(`/upload/${fileId}`, updateData);
  return response.data;
};
