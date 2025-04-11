import api from './api';
import { getProjectById } from "./projectApi";

const DEBUG = true;

export { getProjectById };

// Lấy danh sách sprint của dự án
export const getSprints = async (projectId) => {
  if (DEBUG) {
    console.log('=== DEBUG getSprints API Call ===');
    console.log(`Calling GET /projects/${projectId}/sprints`);
  }

  try {
    const response = await api.get(`/projects/${projectId}/sprints`);
    if (DEBUG) {
      console.log('Response data:', response.data);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getSprints:', error);
    console.error('Error response:', error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || 'Không thể lấy danh sách sprints',
      error: error.message
    };
  }
};

// Lấy chi tiết sprint
export const getSprintById = async (projectId, sprintId) => {
  if (DEBUG) {
    console.log('=== DEBUG getSprintById API Call ===');
    console.log(`Calling GET /projects/${projectId}/sprints/${sprintId}`);
  }

  try {
    const response = await api.get(`/projects/${projectId}/sprints/${sprintId}`);
    
    if (DEBUG) {
      console.log('Response data:', response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in getSprintById:', error);
    console.error('Error response:', error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || 'Không thể lấy thông tin sprint',
      error: error.message
    };
  }
};

// Tạo sprint mới
export const createSprint = async (projectId, sprintData) => {
  try {
    console.log("Tạo sprint với dữ liệu:", {
      projectId,
      ...sprintData,
      membersCount: sprintData.members?.length || 0
    });
    
    const response = await api.post(`/projects/${projectId}/sprints`, sprintData);
    return response.data;
  } catch (error) {
    console.error('Error in createSprint:', error);
    throw error;
  }
};

// Cập nhật sprint
export const updateSprint = async (projectId, sprintId, sprintData) => {
  try {
    const response = await api.put(`/projects/${projectId}/sprints/${sprintId}`, sprintData);
    return response.data;
  } catch (error) {
    console.error('Error in updateSprint:', error);
    throw error;
  }
};

// Xóa sprint
export const deleteSprint = async (projectId, sprintId) => {
  try {
    const response = await api.delete(`/projects/${projectId}/sprints/${sprintId}`);
    return response.data;
  } catch (error) {
    console.error('Error in deleteSprint:', error);
    throw error;
  }
};

// Thêm task vào sprint
export const addTaskToSprint = async (projectId, sprintId, taskId) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`
    );

    return {
      success: true,
      message: response.data.message || "Thêm task vào sprint thành công",
    };
  } catch (error) {
    console.error("Error adding task to sprint:", error);

    return {
      success: false,
      message:
        error.response?.data?.message || "Không thể thêm task vào sprint",
    };
  }
};

// Gỡ task khỏi sprint
export const removeTaskFromSprint = async (projectId, sprintId, taskId) => {
  try {
    const response = await api.delete(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`
    );

    return {
      success: true,
      message: response.data.message || "Gỡ task khỏi sprint thành công",
    };
  } catch (error) {
    console.error("Error removing task from sprint:", error);

    return {
      success: false,
      message: error.response?.data?.message || "Không thể gỡ task khỏi sprint",
    };
  }
};

// Lấy danh sách thành viên của sprint
export const getSprintMembers = async (projectId, sprintId) => {
  try {
    const response = await api.get(`/projects/${projectId}/sprints/${sprintId}/members`);
    return {
      success: true,
      data: response.data.data || [],
      message: response.data.message || "Lấy danh sách thành viên thành công"
    };
  } catch (error) {
    console.error('Error in getSprintMembers:', error);
    return {
      success: false,
      data: [],
      message: error.response?.data?.message || "Không thể lấy danh sách thành viên"
    };
  }
};

// Thêm thành viên vào sprint
export const addMemberToSprint = async (projectId, sprintId, memberData) => {
  try {
    console.log("API call - Adding member to sprint:", { projectId, sprintId, memberData });
    const response = await api.post(`/projects/${projectId}/sprints/${sprintId}/members`, memberData);
    console.log("API response - Add member:", response.data);
    
    return {
      success: true,
      data: response.data.data || { userId: memberData.userId, sprintId },
      message: response.data.message || "Thêm thành viên vào sprint thành công"
    };
  } catch (error) {
    console.error('Error in addMemberToSprint:', error);
    return {
      success: false,
      data: null,
      message: error.response?.data?.message || "Không thể thêm thành viên vào sprint"
    };
  }
};

// Xóa thành viên khỏi sprint
export const removeMemberFromSprint = async (projectId, sprintId, memberId) => {
  try {
    const response = await api.delete(`/projects/${projectId}/sprints/${sprintId}/members/${memberId}`);
    return response.data;
  } catch (error) {
    console.error('Error in removeMemberFromSprint:', error);
    throw error;
  }
};

// Lấy danh sách người dùng có thể thêm vào sprint
export const getAvailableUsersForSprint = async (projectId, sprintId) => {
  try {
    const response = await api.get(
      `/sprints/${sprintId}/project/${projectId}/available-users`
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || "Lấy danh sách người dùng thành công",
    };
  } catch (error) {
    console.error("Error fetching available users:", error);

    return {
      success: false,
      data: null,
      message:
        error.response?.data?.message || "Không thể lấy danh sách người dùng",
    };
  }
};

// Lấy tất cả sprint của người dùng hiện tại
export const getUserSprints = async () => {
  if (DEBUG) {
    console.log('=== DEBUG getUserSprints API Call ===');
    console.log(`Calling GET /me/sprints`);
  }
  
  try {
    const response = await api.get(`/me/sprints`);
    
    if (DEBUG) {
      console.log('Response success:', response.data.success);
      console.log('Response data count:', response.data.data?.length || 0);
      console.log('First sprint task count:', response.data.data?.[0]?.taskCount);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error in getUserSprints:', error);
    console.error('Error response:', error.response?.data);
    return {
      success: false,
      message: error.response?.data?.message || 'Không thể lấy danh sách sprint',
      error: error.message
    };
  }
};
