import API from "./api";
import axios from "axios";
import { getToken } from "../utils/auth";

// Lấy danh sách projects
export const getProjects = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append("status", params.status);
    if (params.search) queryParams.append("search", params.search);
    if (params.isArchived !== undefined)
      queryParams.append("isArchived", params.isArchived);

    const response = await API.get(`/projects?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Lấy chi tiết một project
export const getProjectById = async (projectId) => {
  try {
    const response = await API.get(`/projects/${projectId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Lấy chi tiết project (version cải tiến với error handling)
export const getProjectDetails = async (projectId) => {
  try {
    const response = await API.get(`/projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching project details:", error);
    
    // Check if it's a network error
    if (error.message === "Network Error") {
      return {
        success: false,
        message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.",
        isNetworkError: true
      };
    }
    
    // Return a structured error response
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Không thể tải thông tin dự án",
      status: error.response?.status
    };
  }
};

// Lấy danh sách sprint của project
export const getProjectSprints = async (projectId) => {
  try {
    const response = await API.get(`/projects/${projectId}/sprints`);
    return response.data;
  } catch (error) {
    console.error("Error fetching project sprints:", error);
    
    // Check if it's a network error
    if (error.message === "Network Error") {
      return {
        success: false,
        message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.",
        isNetworkError: true
      };
    }
    
    // Return a structured error response
    return {
      success: false,
      message: error.response?.data?.message || error.message || "Không thể tải danh sách sprint",
      status: error.response?.status
    };
  }
};

// Tạo project mới
export const createProject = async (projectData) => {
  try {
    const response = await API.post("/projects", projectData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cập nhật project
export const updateProject = async (projectId, projectData) => {
  try {
    const response = await API.put(`/projects/${projectId}`, projectData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Xóa project
export const deleteProject = async (projectId) => {
  try {
    const response = await API.delete(`/projects/${projectId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Mời thành viên vào dự án qua email
export const inviteMember = async (projectId, email, role) => {
  try {
    const response = await API.post(`/projects/${projectId}/invite`, {
      email,
      role,
    });
    return response.data;
  } catch (error) {
    console.error("Error inviting member:", error);
    throw error;
  }
};

// Thêm thành viên trực tiếp vào dự án
export const addMember = async (projectId, email, role) => {
  try {
    const response = await API.post(`/projects/${projectId}/members`, {
      email,
      role,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Xóa thành viên khỏi project
export const removeMember = async (projectId, memberId) => {
  try {
    const response = await API.delete(
      `/projects/${projectId}/members/${memberId}`
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cập nhật role của thành viên trong project
export const updateMemberRole = async (projectId, memberId, role) => {
  try {
    const response = await API.put(
      `/projects/${projectId}/members/${memberId}`,
      { role }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get tasks for a specific project (deprecated - use getSprintTasks from taskApi.js instead)
export const getProjectTasks = async (projectId, sprintId) => {
  try {
    if (!sprintId) {
      throw new Error("sprintId is required to fetch tasks");
    }
    
    const response = await API.get(`/projects/${projectId}/sprints/${sprintId}/tasks`);
    if (response && response.data && response.data.success) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    throw error;
  }
};

// Create a new task for a project (deprecated - use createTask from taskApi.js instead)
export const createProjectTask = async (projectId, sprintId, taskData) => {
  try {
    if (!sprintId) {
      throw new Error("sprintId is required to create a task");
    }
    
    const response = await API.post(`/projects/${projectId}/sprints/${sprintId}/tasks`, taskData);
    return response.data;
  } catch (error) {
    console.error("Error creating project task:", error);
    throw error;
  }
};

// Cập nhật task trong project (deprecated - use updateTask from taskApi.js instead)
export const updateProjectTask = async (projectId, sprintId, taskId, taskData) => {
  try {
    if (!sprintId) {
      throw new Error("sprintId is required to update a task");
    }
    
    const response = await API.put(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`, taskData);
    return response.data;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

// Xóa task trong project (deprecated - use deleteTask from taskApi.js instead)
export const deleteProjectTask = async (projectId, sprintId, taskId) => {
  try {
    if (!sprintId) {
      throw new Error("sprintId is required to delete a task");
    }
    
    const response = await API.delete(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Cập nhật trạng thái của task (deprecated - use updateTaskStatus from taskApi.js instead)
export const updateTaskStatus = async (projectId, sprintId, taskId, status) => {
  try {
    if (!sprintId) {
      throw new Error("sprintId is required to update task status");
    }
    
    const response = await API.patch(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/status`, { status });
    return response.data;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
};

// Lưu trữ dự án
export const archiveProject = async (projectId) => {
  try {
    const response = await API.post(`/projects/${projectId}/archive`);
    return response.data;
  } catch (error) {
    console.error("Error archiving project:", error);
    throw error;
  }
};

// Khôi phục dự án đã lưu trữ
export const restoreProject = async (projectId) => {
  try {
    const response = await API.post(`/projects/${projectId}/restore`);
    return response.data;
  } catch (error) {
    console.error("Error restoring project:", error);
    throw error;
  }
};

/**
 * Xóa thành viên khỏi dự án
 * @param {string} projectId - ID của dự án
 * @param {string} memberId - ID của thành viên cần xóa
 * @returns {Promise<Object>} - Kết quả từ API
 */
export const removeMemberFromProject = async (projectId, memberId) => {
  try {
    const response = await API.delete(`/projects/${projectId}/members/${memberId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing member from project:', error);
    throw error.response?.data || error;
  }
};

/**
 * Lấy danh sách thành viên của dự án
 * @param {string} projectId - ID của dự án
 * @returns {Promise<Object>} - Danh sách thành viên từ API
 */
export const getProjectMembers = async (projectId) => {
  try {
    // Thay vì gọi API endpoint không tồn tại, lấy dữ liệu từ project
    const response = await getProjectById(projectId);
    
    if (response && response.success && response.data && response.data.members) {
      return {
        success: true,
        data: response.data.members
      };
    }
    
    return {
      success: false,
      message: "Không thể lấy thành viên dự án",
      data: []
    };
  } catch (error) {
    console.error('Error fetching project members:', error);
    throw error;
  }
};

/**
 * Thêm nhiều thành viên vào dự án cùng một lúc
 * @param {string} projectId - ID của dự án
 * @param {Array} members - Mảng thành viên cần thêm [{email, role}]
 * @returns {Promise<Object>} - Kết quả từ API
 */
export const addMultipleMembers = async (projectId, members) => {
  try {
    const response = await API.post(`/projects/${projectId}/members/batch`, { members });
    return response.data;
  } catch (error) {
    console.error('Error adding multiple members:', error);
    
    // Nếu API không hỗ trợ batch, thực hiện từng thành viên một
    const results = [];
    for (const member of members) {
      try {
        if (member.status === 'pending') {
          // Gửi lời mời qua email
          const result = await inviteMember(projectId, member.email, member.role);
          results.push(result);
        } else {
          // Thêm trực tiếp
          const result = await addMember(projectId, member.email, member.role);
          results.push(result);
        }
      } catch (memberError) {
        console.error(`Error adding member ${member.email}:`, memberError);
      }
    }
    
    return {
      success: results.length > 0,
      message: `Đã thêm ${results.length}/${members.length} thành viên`,
      data: results
    };
  }
};
