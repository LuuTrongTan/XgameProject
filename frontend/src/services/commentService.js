export const addTaskComment = async (projectId, sprintId, taskId, commentData) => {
  try {
    const response = await api.post(
      `/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}/comments`,
      commentData
    );
    return response.data;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}; 