import axios from "./axiosClient";
import API from "./api";

// Get tasks for a specific project
export const getProjectTasks = async (projectId) => {
  try {
    console.log("Fetching tasks for project ID:", projectId);

    // Sử dụng API client đã cấu hình đúng
    const response = await API.get(`/tasks`, {
      params: { project: projectId },
    });

    console.log("Raw API Response:", response.data);

    // Kiểm tra cấu trúc response và trả về dữ liệu phù hợp
    let tasks = [];

    if (response.data) {
      if (Array.isArray(response.data)) {
        tasks = response.data;
      } else if (response.data.tasks && Array.isArray(response.data.tasks)) {
        tasks = response.data.tasks;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        tasks = response.data.data;
      }
    }

    console.log("Processed Tasks:", tasks);

    // Đảm bảo mỗi task có đầy đủ các trường cần thiết
    tasks = tasks.map((task) => ({
      ...task,
      status: task.status || "todo",
      priority: task.priority || "medium",
      assignees: task.assignees || [],
      tags: task.tags || [],
      comments: task.comments || [],
      attachments: task.attachments || [],
    }));

    return {
      success: true,
      data: tasks,
      message: "Lấy danh sách công việc thành công",
    };
  } catch (error) {
    console.error("Error fetching tasks:", error);
    if (error.isNetworkError) {
      return {
        success: false,
        data: [],
        message:
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.",
        isNetworkError: true,
      };
    }
    return {
      success: false,
      data: [],
      message: error.message || "Không thể lấy danh sách công việc",
      isNetworkError: false,
    };
  }
};

// Create a new task for a project
export const createTask = async (projectId, taskData) => {
  try {
    const response = await API.post(`/tasks`, {
      ...taskData,
      project: projectId,
    });
    return {
      success: true,
      data: response.data.task || response.data,
      message: "Tạo công việc thành công",
    };
  } catch (error) {
    console.error("Error creating task:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo công việc",
    };
  }
};

// Cập nhật thông tin của task
export const updateTask = async (taskId, taskData) => {
  try {
    const response = await API.put(`/tasks/${taskId}`, taskData);
    return {
      success: true,
      data: response.data.task || response.data,
      message: "Cập nhật công việc thành công",
    };
  } catch (error) {
    console.error("Error updating task:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể cập nhật công việc",
    };
  }
};

// Xóa task
export const deleteTask = async (taskId) => {
  try {
    const response = await API.delete(`/tasks/${taskId}`);
    return {
      success: true,
      data: response.data,
      message: "Xóa công việc thành công",
    };
  } catch (error) {
    console.error("Error deleting task:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể xóa công việc",
    };
  }
};

// Cập nhật trạng thái của task (di chuyển giữa các cột)
export const updateTaskStatus = async (taskId, status) => {
  try {
    const response = await API.put(`/tasks/${taskId}/status`, { status });
    return {
      success: true,
      data: response.data.task || response.data,
      message: "Cập nhật trạng thái thành công",
    };
  } catch (error) {
    console.error("Error updating task status:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể cập nhật trạng thái",
    };
  }
};

export const addTaskComment = async (taskId, comment) => {
  try {
    const response = await API.post(`/tasks/${taskId}/comments`, {
      content: comment,
    });
    return {
      success: true,
      data: response.data.comment || response.data,
      message: "Thêm bình luận thành công",
    };
  } catch (error) {
    console.error("Error adding comment:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể thêm bình luận",
    };
  }
};

export const addTaskAttachment = async (taskId, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await API.post(`/tasks/${taskId}/attachments`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return {
      success: true,
      data: response.data.attachment || response.data,
      message: "Đính kèm tệp thành công",
    };
  } catch (error) {
    console.error("Error adding attachment:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể đính kèm tệp",
    };
  }
};

export const getTaskComments = async (taskId) => {
  try {
    const response = await API.get(`/tasks/${taskId}/comments`);
    return {
      success: true,
      data: response.data.comments || response.data || [],
      message: "Lấy danh sách bình luận thành công",
    };
  } catch (error) {
    console.error("Error fetching comments:", error);
    return {
      success: false,
      data: [],
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể lấy danh sách bình luận",
    };
  }
};

export const getTaskAttachments = async (taskId) => {
  try {
    const response = await API.get(`/tasks/${taskId}/attachments`);
    return {
      success: true,
      data: response.data.attachments || response.data || [],
      message: "Lấy danh sách tệp đính kèm thành công",
    };
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return {
      success: false,
      data: [],
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể lấy danh sách tệp đính kèm",
    };
  }
};

export const deleteTaskAttachment = async (taskId, attachmentId) => {
  try {
    const response = await API.delete(
      `/tasks/${taskId}/attachments/${attachmentId}`
    );
    return {
      success: true,
      data: response.data,
      message: "Xóa tệp đính kèm thành công",
    };
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể xóa tệp đính kèm",
    };
  }
};

export const syncWithCalendar = async (taskId, calendarType) => {
  try {
    const response = await API.post(`/tasks/${taskId}/sync-calendar`, {
      calendarType,
    });
    return {
      success: true,
      data: response.data,
      message: "Đồng bộ với lịch thành công",
    };
  } catch (error) {
    console.error("Error syncing with calendar:", error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        error.message ||
        "Không thể đồng bộ với lịch",
    };
  }
};
