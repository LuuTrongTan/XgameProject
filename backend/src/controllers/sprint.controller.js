import Sprint from "../models/sprint.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import { ROLES } from "../config/constants.js";

// Validate dữ liệu đầu vào
const validateSprintData = (data) => {
  const errors = [];

  if (!data.name || data.name.length < 3 || data.name.length > 100) {
    errors.push("Tên sprint phải từ 3-100 ký tự");
  }

  if (
    !data.description ||
    data.description.length < 5 ||
    data.description.length > 1000
  ) {
    errors.push("Mô tả sprint phải từ 5-1000 ký tự");
  }

  if (!data.startDate || !Date.parse(data.startDate)) {
    errors.push("Ngày bắt đầu không hợp lệ");
  }

  if (!data.endDate || !Date.parse(data.endDate)) {
    errors.push("Ngày kết thúc không hợp lệ");
  }

  if (Date.parse(data.startDate) > Date.parse(data.endDate)) {
    errors.push("Ngày kết thúc phải sau ngày bắt đầu");
  }

  if (
    data.status &&
    !["planning", "active", "completed"].includes(data.status)
  ) {
    errors.push("Trạng thái sprint không hợp lệ");
  }

  if (data.goal && data.goal.length > 500) {
    errors.push("Mục tiêu sprint không được vượt quá 500 ký tự");
  }

  return errors;
};

// Kiểm tra quyền truy cập dự án
const checkProjectPermission = async (
  projectId,
  userId,
  requiredRoles = []
) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: "Dự án không tồn tại" };

  // Kiểm tra quyền trong dự án
  if (project.owner.toString() === userId.toString()) return { project };

  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (!member) return { error: "Bạn không phải thành viên của dự án" };

  if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
    return { error: "Bạn không có quyền thực hiện hành động này" };
  }

  return { project };
};

// Lấy danh sách sprint của dự án
export const getSprints = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID dự án",
      });
    }

    const { project, error } = await checkProjectPermission(
      projectId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const sprints = await Sprint.find({ project: projectId })
      .populate("createdBy", "name email avatar")
      .sort({ startDate: 1 });

    // Thêm số lượng task cho mỗi sprint
    const sprintsWithTaskCount = await Promise.all(
      sprints.map(async (sprint) => {
        const taskCount = await Task.countDocuments({ sprint: sprint._id });
        const completedTaskCount = await Task.countDocuments({
          sprint: sprint._id,
          status: "done",
        });
        return {
          ...sprint.toObject(),
          taskCount: {
            total: taskCount,
            completed: completedTaskCount,
          },
        };
      })
    );

    res.json({
      success: true,
      data: sprintsWithTaskCount,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách sprint",
      error: error.message,
    });
  }
};

// Lấy chi tiết sprint
export const getSprintById = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId })
      .populate("project", "name")
      .populate("createdBy", "name email avatar");

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id);
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Lấy danh sách task của sprint
    const tasks = await Task.find({ sprint: sprint._id })
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...sprint.toObject(),
        tasks,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin sprint",
      error: error.message,
    });
  }
};

// Tạo sprint mới
export const createSprint = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID dự án",
      });
    }

    const errors = validateSprintData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Kiểm tra quyền trong dự án
    const { project, error } = await checkProjectPermission(
      projectId,
      req.user.id,
      [ROLES.ADMIN, ROLES.PROJECT_MANAGER]
    );

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const sprint = new Sprint({
      name: req.body.name,
      description: req.body.description,
      project: projectId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || "planning",
      goal: req.body.goal || "",
      createdBy: req.user.id,
    });

    await sprint.save();

    console.log("Sprint created:", sprint);

    res.status(201).json({
      success: true,
      data: sprint,
      message: "Sprint đã được tạo thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo sprint",
      error: error.message,
    });
  }
};

// Cập nhật sprint
export const updateSprint = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id, [
      ROLES.ADMIN,
      ROLES.PROJECT_MANAGER,
    ]);

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    if (req.body.name) sprint.name = req.body.name;
    if (req.body.description) sprint.description = req.body.description;
    if (req.body.startDate) sprint.startDate = req.body.startDate;
    if (req.body.endDate) sprint.endDate = req.body.endDate;
    if (req.body.status) sprint.status = req.body.status;
    if (req.body.goal !== undefined) sprint.goal = req.body.goal;

    // Validate trước khi lưu
    const errors = validateSprintData(sprint);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    await sprint.save();

    res.json({
      success: true,
      data: sprint,
      message: "Sprint đã được cập nhật thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật sprint",
      error: error.message,
    });
  }
};

// Xóa sprint
export const deleteSprint = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id, [
      ROLES.ADMIN,
      ROLES.PROJECT_MANAGER,
    ]);

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra các task đang dùng sprint
    const tasksInSprint = await Task.find({ sprint: sprintId });
    if (tasksInSprint.length > 0) {
      // Gỡ liên kết sprint khỏi tất cả task
      await Task.updateMany({ sprint: sprintId }, { $unset: { sprint: "" } });
    }

    await Sprint.findByIdAndDelete(sprintId);

    res.json({
      success: true,
      message: "Sprint đã được xóa thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa sprint",
      error: error.message,
    });
  }
};

// Thêm task vào sprint
export const addTaskToSprint = async (req, res) => {
  try {
    const { projectId, sprintId, taskId } = req.params;

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id, [
      ROLES.ADMIN,
      ROLES.PROJECT_MANAGER,
    ]);

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra sprint tồn tại
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra task tồn tại
    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại",
      });
    }

    // Thêm task vào sprint
    task.sprint = sprintId;
    await task.save();

    res.json({
      success: true,
      message: "Task đã được thêm vào sprint",
    });
  } catch (error) {
    console.error("Lỗi khi thêm task vào sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm task vào sprint",
      error: error.message,
    });
  }
};

// Gỡ task khỏi sprint
export const removeTaskFromSprint = async (req, res) => {
  try {
    const { projectId, sprintId, taskId } = req.params;

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id, [
      ROLES.ADMIN,
      ROLES.PROJECT_MANAGER,
    ]);

    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra sprint tồn tại
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra task tồn tại và thuộc sprint
    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      sprint: sprintId,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại hoặc không thuộc sprint này",
      });
    }

    // Gỡ task khỏi sprint
    task.sprint = undefined;
    await task.save();

    res.json({
      success: true,
      message: "Task đã được gỡ khỏi sprint",
    });
  } catch (error) {
    console.error("Lỗi khi gỡ task khỏi sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gỡ task khỏi sprint",
      error: error.message,
    });
  }
};
