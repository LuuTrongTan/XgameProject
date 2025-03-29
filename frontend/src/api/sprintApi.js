import API from "./api";
import { getProjectById } from "./projectApi";

export { getProjectById };

// Lấy danh sách sprint của dự án
export const getSprints = async (projectId) => {
  try {
    console.log("=== DEBUG getSprints API Call ===");
    console.log("Calling GET /projects/" + projectId + "/sprints");
    const response = await API.get(`/projects/${projectId}/sprints`);
    console.log("API Response:", response.data);
    console.log("Sprints data:", response.data.data);
    console.log("Number of sprints:", response.data.data?.length);
    console.log("Sprint details:", JSON.stringify(response.data.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("Error in getSprints:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    throw error;
  }
};

// Lấy chi tiết sprint
export const getSprintById = async (projectId, sprintId) => {
  try {
    const response = await API.get(
      `/projects/${projectId}/sprints/${sprintId}`
    );

    return {
      success: true,
      data: response.data.data,
      message: "Lấy thông tin sprint thành công",
    };
  } catch (error) {
    console.error("Error fetching sprint:", error);

    return {
      success: false,
      data: null,
      message:
        error.response?.data?.message || "Không thể lấy thông tin sprint",
    };
  }
};

// Tạo sprint mới
export const createSprint = async (projectId, sprintData) => {
  try {
    console.log("=== DEBUG createSprint API Call ===");
    console.log("Calling POST /projects/" + projectId + "/sprints");
    console.log("Sprint data:", sprintData);
    const response = await API.post(
      `/projects/${projectId}/sprints`,
      sprintData
    );
    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in createSprint:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    throw error;
  }
};

// Cập nhật sprint
export const updateSprint = async (projectId, sprintId, sprintData) => {
  try {
    console.log("=== DEBUG updateSprint API Call ===");
    console.log("Calling PUT /projects/" + projectId + "/sprints/" + sprintId);
    console.log("Sprint data:", sprintData);
    const response = await API.put(
      `/projects/${projectId}/sprints/${sprintId}`,
      sprintData
    );
    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in updateSprint:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    throw error;
  }
};

// Xóa sprint
export const deleteSprint = async (projectId, sprintId) => {
  try {
    console.log("=== DEBUG deleteSprint API Call ===");
    console.log(
      "Calling DELETE /projects/" + projectId + "/sprints/" + sprintId
    );
    const response = await API.delete(
      `/projects/${projectId}/sprints/${sprintId}`
    );
    console.log("API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error in deleteSprint:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    throw error;
  }
};

// Thêm task vào sprint
export const addTaskToSprint = async (projectId, sprintId, taskId) => {
  try {
    const response = await API.post(
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
    const response = await API.delete(
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
    const response = await API.get(
      `/projects/${projectId}/sprints/${sprintId}/members`
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || "Lấy danh sách thành viên thành công",
    };
  } catch (error) {
    console.error("Error fetching sprint members:", error);

    return {
      success: false,
      data: null,
      message:
        error.response?.data?.message || "Không thể lấy danh sách thành viên",
    };
  }
};

// Thêm thành viên vào sprint
export const addMemberToSprint = async (projectId, sprintId, userId) => {
  try {
    const response = await API.post(
      `/projects/${projectId}/sprints/${sprintId}/members`,
      { userId }
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || "Thêm thành viên vào sprint thành công",
    };
  } catch (error) {
    console.error("Error adding member to sprint:", error);

    return {
      success: false,
      message:
        error.response?.data?.message || "Không thể thêm thành viên vào sprint",
    };
  }
};

// Xóa thành viên khỏi sprint
export const removeMemberFromSprint = async (projectId, sprintId, userId) => {
  try {
    const response = await API.delete(
      `/projects/${projectId}/sprints/${sprintId}/members/${userId}`
    );

    return {
      success: true,
      message: response.data.message || "Xóa thành viên khỏi sprint thành công",
    };
  } catch (error) {
    console.error("Error removing member from sprint:", error);

    return {
      success: false,
      message:
        error.response?.data?.message || "Không thể xóa thành viên khỏi sprint",
    };
  }
};

// Lấy danh sách người dùng có thể thêm vào sprint
export const getAvailableUsersForSprint = async (projectId, sprintId) => {
  try {
    const response = await API.get(
      `/projects/${projectId}/sprints/${sprintId}/available-users`
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
