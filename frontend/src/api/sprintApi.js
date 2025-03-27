import API from "./api";

// Lấy danh sách sprint của dự án
export const getSprints = async (projectId) => {
  try {
    const response = await API.get(`/projects/${projectId}/sprints`);

    return {
      success: true,
      data: response.data.data,
      message: "Lấy danh sách sprint thành công",
    };
  } catch (error) {
    console.error("Error fetching sprints:", error);

    return {
      success: false,
      data: null,
      message:
        error.response?.data?.message || "Không thể lấy danh sách sprint",
    };
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
    // Làm sạch dữ liệu trước khi gửi
    const cleanedData = {
      name: sprintData.name.trim(),
      description: sprintData.description.trim(),
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
      status: sprintData.status || "planning",
      goal: sprintData.goal?.trim() || "",
    };

    const response = await API.post(
      `/projects/${projectId}/sprints`,
      cleanedData
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || "Tạo sprint thành công",
    };
  } catch (error) {
    console.error("Error creating sprint:", error);

    return {
      success: false,
      message: error.response?.data?.message || "Không thể tạo sprint",
    };
  }
};

// Cập nhật sprint
export const updateSprint = async (projectId, sprintId, sprintData) => {
  try {
    // Làm sạch dữ liệu trước khi gửi
    const cleanedData = {
      name: sprintData.name.trim(),
      description: sprintData.description.trim(),
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
      status: sprintData.status,
      goal: sprintData.goal?.trim() || "",
    };

    const response = await API.put(
      `/projects/${projectId}/sprints/${sprintId}`,
      cleanedData
    );

    return {
      success: true,
      data: response.data.data,
      message: response.data.message || "Cập nhật sprint thành công",
    };
  } catch (error) {
    console.error("Error updating sprint:", error);

    return {
      success: false,
      message: error.response?.data?.message || "Không thể cập nhật sprint",
    };
  }
};

// Xóa sprint
export const deleteSprint = async (projectId, sprintId) => {
  try {
    const response = await API.delete(
      `/projects/${projectId}/sprints/${sprintId}`
    );

    return {
      success: true,
      message: response.data.message || "Xóa sprint thành công",
    };
  } catch (error) {
    console.error("Error deleting sprint:", error);

    return {
      success: false,
      message: error.response?.data?.message || "Không thể xóa sprint",
    };
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
