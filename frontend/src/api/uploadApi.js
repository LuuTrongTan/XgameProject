import api from "./api";

// Upload single file
export const uploadFile = async (file, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  // Append additional data if provided
  if (options.taskId) formData.append("taskId", options.taskId);
  if (options.projectId) formData.append("projectId", options.projectId);
  if (options.commentId) formData.append("commentId", options.commentId);
  if (options.permissions) formData.append("permissions", options.permissions);
  if (options.allowedUsers)
    formData.append("allowedUsers", JSON.stringify(options.allowedUsers));
  if (options.allowedRoles)
    formData.append("allowedRoles", JSON.stringify(options.allowedRoles));

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Get files by task ID
export const getFilesByTask = async (taskId) => {
  const response = await api.get(`/upload/task/${taskId}`);
  return response.data;
};

// Delete file
export const deleteFile = async (fileId) => {
  const response = await api.delete(`/upload/${fileId}`);
  return response.data;
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
