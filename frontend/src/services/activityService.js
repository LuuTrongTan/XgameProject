import api from "../api/api";

class ActivityService {
  static async createActivity(type, action, title, description) {
    try {
      const response = await api.post("/api/activities", {
        type,
        action,
        title,
        description,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating activity:", error);
      throw error;
    }
  }

  // Project activities
  static async logProjectCreated(projectName) {
    return this.createActivity(
      "project",
      "created",
      "Tạo dự án mới",
      `Đã tạo dự án "${projectName}"`
    );
  }

  static async logProjectUpdated(projectName) {
    return this.createActivity(
      "project",
      "updated",
      "Cập nhật dự án",
      `Đã cập nhật thông tin dự án "${projectName}"`
    );
  }

  static async logProjectDeleted(projectName) {
    return this.createActivity(
      "project",
      "deleted",
      "Xóa dự án",
      `Đã xóa dự án "${projectName}"`
    );
  }

  // Task activities
  static async logTaskCreated(taskName, projectName) {
    return this.createActivity(
      "task",
      "created",
      "Tạo công việc mới",
      `Đã tạo công việc "${taskName}" trong dự án "${projectName}"`
    );
  }

  static async logTaskUpdated(taskName) {
    return this.createActivity(
      "task",
      "updated",
      "Cập nhật công việc",
      `Đã cập nhật thông tin công việc "${taskName}"`
    );
  }

  static async logTaskCompleted(taskName) {
    return this.createActivity(
      "task",
      "completed",
      "Hoàn thành công việc",
      `Đã hoàn thành công việc "${taskName}"`
    );
  }

  static async logTaskDeleted(taskName) {
    return this.createActivity(
      "task",
      "deleted",
      "Xóa công việc",
      `Đã xóa công việc "${taskName}"`
    );
  }

  // Comment activities
  static async logCommentCreated(taskName) {
    return this.createActivity(
      "comment",
      "created",
      "Thêm bình luận",
      `Đã thêm bình luận vào công việc "${taskName}"`
    );
  }

  static async logCommentUpdated(taskName) {
    return this.createActivity(
      "comment",
      "updated",
      "Cập nhật bình luận",
      `Đã cập nhật bình luận trong công việc "${taskName}"`
    );
  }

  static async logCommentDeleted(taskName) {
    return this.createActivity(
      "comment",
      "deleted",
      "Xóa bình luận",
      `Đã xóa bình luận từ công việc "${taskName}"`
    );
  }
}

export default ActivityService;
