import TaskModel from "../models/task.model.js";

class TaskService {
  async createTask(title, description, priority, assignedTo) {
    return await TaskModel.create({ title, description, priority, assignedTo });
  }

  async getTasks() {
    return await TaskModel.find().populate("assignedTo", "username email");
  }
}

export default new TaskService();
