import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Timelog from "../models/timelogs.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import { google } from "googleapis";
import { calendar } from "../config/google.config.js";
import fs from "fs";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ROLES } from "../config/constants.js";

// Validate dữ liệu đầu vào
const validateTaskData = (data) => {
  const errors = [];

  if (!data.title || data.title.length < 3 || data.title.length > 200) {
    errors.push("Tiêu đề công việc phải từ 3-200 ký tự");
  }

  if (
    !data.description ||
    data.description.length < 10 ||
    data.description.length > 2000
  ) {
    errors.push("Mô tả công việc phải từ 10-2000 ký tự");
  }

  if (
    data.priority &&
    !["low", "medium", "high", "critical"].includes(data.priority)
  ) {
    errors.push("Độ ưu tiên không hợp lệ");
  }

  if (
    data.status &&
    !["todo", "in_progress", "review", "done"].includes(data.status)
  ) {
    errors.push("Trạng thái không hợp lệ");
  }

  if (data.estimatedTime && data.estimatedTime < 0) {
    errors.push("Thời gian dự kiến không được âm");
  }

  if (
    data.startDate &&
    data.dueDate &&
    new Date(data.startDate) > new Date(data.dueDate)
  ) {
    errors.push("Ngày bắt đầu phải trước ngày kết thúc");
  }

  return errors;
};

// Kiểm tra quyền truy cập task
const checkTaskPermission = async (taskId, userId, requiredRoles = []) => {
  const task = await Task.findById(taskId).populate({
    path: "project",
    populate: { path: "members" },
  });

  if (!task) return { error: "Công việc không tồn tại" };

  const project = task.project;
  if (!project) return { error: "Dự án không tồn tại" };

  // Kiểm tra quyền trong dự án
  if (project.owner.toString() === userId.toString()) return { task };

  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (!member) return { error: "Bạn không phải thành viên của dự án" };

  if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
    return { error: "Bạn không có quyền thực hiện hành động này" };
  }

  return { task };
};

// Lấy danh sách công việc
export const getTasks = async (req, res) => {
  try {
    const {
      projectId,
      status,
      priority,
      assignee,
      search,
      startDate,
      endDate,
      milestone,
    } = req.query;
    const query = {};

    // Lọc theo dự án
    if (projectId) query.project = projectId;

    // Lọc theo trạng thái
    if (status) query.status = status;

    // Lọc theo độ ưu tiên
    if (priority) query.priority = priority;

    // Lọc theo người được giao
    if (assignee) query.assignees = assignee;

    // Lọc theo milestone
    if (milestone) query.milestone = milestone;

    // Tìm kiếm theo tiêu đề hoặc mô tả
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo khoảng thời gian
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    const tasks = await Task.find(query)
      .populate("project", "name status")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("parent", "title status")
      .populate("subtasks", "title status progress")
      .populate("milestone", "name dueDate")
      .populate("watchers", "name email avatar")
      .sort({ createdAt: -1 });

    // Thêm thống kê cho mỗi task
    const tasksWithStats = await Promise.all(
      tasks.map(async (task) => {
        const stats = {
          totalComments: await Comment.countDocuments({ task: task._id }),
          totalAttachments: task.attachments.length,
          totalTimelogs: await Timelog.countDocuments({ task: task._id }),
          totalTimeSpent:
            (
              await Timelog.aggregate([
                { $match: { task: task._id } },
                { $group: { _id: null, total: { $sum: "$duration" } } },
              ])
            )[0]?.total || 0,
        };
        return {
          ...task.toObject(),
          stats,
        };
      })
    );

    res.json({
      success: true,
      data: tasksWithStats,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách công việc",
      error: error.message,
    });
  }
};

// Lấy chi tiết công việc
export const getTaskById = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(404).json({
        success: false,
        message: error,
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name status")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("parent", "title status")
      .populate("subtasks", "title status progress")
      .populate("milestone", "name dueDate")
      .populate("watchers", "name email avatar")
      .populate({
        path: "dependencies.task",
        select: "title status",
      })
      .populate({
        path: "comments",
        populate: { path: "author", select: "name email avatar" },
      });

    // Thêm thống kê
    const stats = {
      totalComments: await Comment.countDocuments({ task: task._id }),
      totalAttachments: task.attachments.length,
      totalTimelogs: await Timelog.countDocuments({ task: task._id }),
      totalTimeSpent:
        (
          await Timelog.aggregate([
            { $match: { task: task._id } },
            { $group: { _id: null, total: { $sum: "$duration" } } },
          ])
        )[0]?.total || 0,
    };

    res.json({
      success: true,
      data: { ...populatedTask.toObject(), stats },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin công việc",
      error: error.message,
    });
  }
};

// Tạo công việc mới
export const createTask = async (req, res) => {
  try {
    const errors = validateTaskData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    const project = await Project.findById(req.body.projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền tạo task trong dự án
    const member = project.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );
    if (!member && project.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền tạo công việc trong dự án này",
      });
    }

    const task = new Task({
      ...req.body,
      project: req.body.projectId,
      createdBy: req.user.id,
    });

    // Nếu là subtask, cập nhật parent task
    if (req.body.parent) {
      const parentTask = await Task.findById(req.body.parent);
      if (!parentTask) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy công việc cha",
        });
      }
      parentTask.subtasks.push(task._id);
      await parentTask.save();
    }

    await task.save();

    // Thêm người tạo vào watchers
    task.watchers.push(req.user.id);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name status")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("parent", "title status")
      .populate("milestone", "name dueDate")
      .populate("watchers", "name email avatar");

    // Gửi thông báo tới các thành viên dự án
    global.io.emit("task_created", {
      task: populatedTask,
      creator: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Tạo công việc thành công",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Lỗi khi tạo công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo công việc",
      error: error.message,
    });
  }
};

// Cập nhật công việc
export const updateTask = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id,
      ["Admin", "Project Manager"]
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const errors = validateTaskData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Cập nhật thông tin task
    const updatedFields = [
      "title",
      "description",
      "status",
      "priority",
      "assignees",
      "startDate",
      "dueDate",
      "estimatedTime",
      "tags",
      "customFields",
      "milestone",
      "watchers",
    ];

    updatedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    // Nếu thay đổi trạng thái thành done, cập nhật completedAt
    if (req.body.status === "done" && !task.completedAt) {
      task.completedAt = new Date();
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name status")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("parent", "title status")
      .populate("subtasks", "title status progress")
      .populate("milestone", "name dueDate")
      .populate("watchers", "name email avatar");

    // Gửi thông báo cập nhật
    global.io.emit("task_updated", {
      task: populatedTask,
      updater: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật công việc thành công",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật công việc",
      error: error.message,
    });
  }
};

// Cập nhật trạng thái
export const updateStatus = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const { status } = req.body;
    if (
      !status ||
      !["todo", "in_progress", "review", "done"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    // Kiểm tra dependencies nếu chuyển sang in_progress
    if (status === "in_progress") {
      const { canStart, pendingBlockers } = await task.checkDependencies();
      if (!canStart) {
        return res.status(400).json({
          success: false,
          message: "Không thể bắt đầu do còn công việc chặn chưa hoàn thành",
          pendingBlockers,
        });
      }
    }

    task.status = status;
    if (status === "done") {
      task.completedAt = new Date();
      task.progress = 100;
    }
    await task.save();

    // Gửi thông báo cập nhật trạng thái
    global.io.emit("task_status_updated", {
      taskId: task._id,
      newStatus: status,
      updater: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: task,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật trạng thái",
      error: error.message,
    });
  }
};

// Thêm/xóa người theo dõi
export const toggleWatcher = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const isWatching = task.watchers.includes(req.user.id);
    if (isWatching) {
      task.watchers = task.watchers.filter(
        (w) => w.toString() !== req.user.id.toString()
      );
    } else {
      task.watchers.push(req.user.id);
    }

    await task.save();

    res.json({
      success: true,
      message: `Đã ${isWatching ? "bỏ theo dõi" : "theo dõi"} công việc`,
      data: task,
    });
  } catch (error) {
    console.error("Lỗi khi thay đổi trạng thái theo dõi:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thay đổi trạng thái theo dõi",
      error: error.message,
    });
  }
};

// Thêm/xóa phụ thuộc
export const toggleDependency = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id,
      ["Admin", "Project Manager"]
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const { dependencyId, type } = req.body;

    if (!["blocks", "is_blocked_by", "relates_to"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Loại phụ thuộc không hợp lệ",
      });
    }

    const dependencyTask = await Task.findById(dependencyId);
    if (!dependencyTask) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy công việc phụ thuộc",
      });
    }

    // Kiểm tra xem đã có phụ thuộc chưa
    const existingDependency = task.dependencies.find(
      (d) => d.task.toString() === dependencyId && d.type === type
    );

    if (existingDependency) {
      // Xóa phụ thuộc
      task.dependencies = task.dependencies.filter(
        (d) => !(d.task.toString() === dependencyId && d.type === type)
      );
    } else {
      // Thêm phụ thuộc mới
      task.dependencies.push({
        task: dependencyId,
        type,
      });
    }

    await task.save();

    res.json({
      success: true,
      message: `Đã ${existingDependency ? "xóa" : "thêm"} phụ thuộc`,
      data: task,
    });
  } catch (error) {
    console.error("Lỗi khi thay đổi phụ thuộc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thay đổi phụ thuộc",
      error: error.message,
    });
  }
};

// Đồng bộ với Google Calendar
export const syncWithGoogleCalendar = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const user = await User.findById(req.user.id).populate(
      "calendarIntegration.googleCalendar"
    );

    if (!user.calendarIntegration?.googleCalendar?.connected) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa kết nối Google Calendar",
      });
    }

    // Tạo sự kiện trong Google Calendar
    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.startDate || new Date(),
        timeZone: "Asia/Ho_Chi_Minh",
      },
      end: {
        dateTime: task.dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000),
        timeZone: "Asia/Ho_Chi_Minh",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    // Lưu ID sự kiện vào task
    task.googleCalendarEventId = response.data.id;
    await task.save();

    // Gửi thông báo realtime
    global.io.emit("task_calendar_synced", {
      taskId: task._id,
      calendarType: "google",
      eventId: response.data.id,
      syncedBy: req.user.name,
    });

    res.json({
      success: true,
      message: "Đã đồng bộ với Google Calendar",
      data: {
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
      },
    });
  } catch (error) {
    console.error("Lỗi khi đồng bộ với Google Calendar:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đồng bộ với Google Calendar",
      error: error.message,
    });
  }
};

// Cập nhật thời gian dự kiến
export const updateEstimatedTime = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id,
      ["Admin", "Project Manager"]
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const { estimatedTime } = req.body;
    if (estimatedTime === undefined || estimatedTime < 0) {
      return res.status(400).json({
        success: false,
        message: "Thời gian dự kiến không hợp lệ",
      });
    }

    task.estimatedTime = estimatedTime;
    await task.save();

    // Gửi thông báo cập nhật
    global.io.emit("task_time_updated", {
      taskId: task._id,
      estimatedTime,
      updater: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật thời gian dự kiến thành công",
      data: task,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thời gian dự kiến:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật thời gian dự kiến",
      error: error.message,
    });
  }
};

// Lấy thống kê thời gian của task
export const getTaskTimeStats = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Lấy tất cả timelogs của task
    const timelogs = await Timelog.find({ task: task._id })
      .populate("user", "name email avatar")
      .sort({ startTime: -1 });

    // Tính toán thống kê
    const stats = {
      estimated: task.estimatedTime || 0,
      actual: task.actualTime || 0,
      remaining: Math.max(
        0,
        (task.estimatedTime || 0) - (task.actualTime || 0)
      ),
      overdue: task.actualTime > task.estimatedTime,
      timelogs: timelogs.map((log) => ({
        id: log._id,
        user: log.user,
        duration: log.duration || 0,
        description: log.description,
        startTime: log.startTime,
        endTime: log.endTime,
        status: log.status,
      })),
      userBreakdown: {},
    };

    // Thống kê theo người dùng
    timelogs.forEach((log) => {
      const userId = log.user._id.toString();
      if (!stats.userBreakdown[userId]) {
        stats.userBreakdown[userId] = {
          user: log.user,
          totalTime: 0,
          logCount: 0,
        };
      }
      stats.userBreakdown[userId].totalTime += log.duration || 0;
      stats.userBreakdown[userId].logCount++;
    });

    // Chuyển userBreakdown từ object sang array
    stats.userBreakdown = Object.values(stats.userBreakdown);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê thời gian",
      error: error.message,
    });
  }
};

// Cập nhật tiến độ công việc
export const updateProgress = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const { progress } = req.body;
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: "Tiến độ không hợp lệ (0-100)",
      });
    }

    task.progress = progress;

    // Tự động cập nhật trạng thái dựa trên tiến độ
    if (progress === 0) task.status = "todo";
    else if (progress === 100) {
      task.status = "done";
      task.completedAt = new Date();
    } else if (progress >= 80) task.status = "review";
    else task.status = "in_progress";

    await task.save();

    // Gửi thông báo cập nhật
    global.io.emit("task_progress_updated", {
      taskId: task._id,
      progress,
      status: task.status,
      updater: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật tiến độ thành công",
      data: task,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật tiến độ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật tiến độ",
      error: error.message,
    });
  }
};

// Thêm tag cho công việc
export const addTag = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const { tag } = req.body;
    if (!tag || typeof tag !== "string" || tag.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tag không hợp lệ",
      });
    }

    // Kiểm tra tag đã tồn tại chưa
    if (task.tags.includes(tag)) {
      return res.status(400).json({
        success: false,
        message: "Tag đã tồn tại trong công việc",
      });
    }

    task.tags.push(tag);
    await task.save();

    // Gửi thông báo realtime
    global.io.emit("task_updated", {
      taskId: task._id,
      type: "tag_added",
      data: { tag },
      user: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Thêm tag thành công",
      data: task.tags,
    });
  } catch (error) {
    console.error("Lỗi khi thêm tag:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm tag",
      error: error.message,
    });
  }
};

// Xóa tag khỏi công việc
export const removeTag = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const tagToRemove = req.params.tag;
    if (!task.tags.includes(tagToRemove)) {
      return res.status(404).json({
        success: false,
        message: "Tag không tồn tại trong công việc",
      });
    }

    task.tags = task.tags.filter((tag) => tag !== tagToRemove);
    await task.save();

    // Gửi thông báo realtime
    global.io.emit("task_updated", {
      taskId: task._id,
      type: "tag_removed",
      data: { tag: tagToRemove },
      user: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Xóa tag thành công",
      data: task.tags,
    });
  } catch (error) {
    console.error("Lỗi khi xóa tag:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa tag",
      error: error.message,
    });
  }
};

// Gán công việc cho thành viên
export const assignTask = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id,
      ["Admin", "Project Manager"]
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const { assignees } = req.body;
    if (!Array.isArray(assignees)) {
      return res.status(400).json({
        success: false,
        message: "Danh sách người được gán phải là một mảng",
      });
    }

    // Kiểm tra xem tất cả người được gán có trong dự án không
    const project = await Project.findById(task.project).populate(
      "members.user"
    );
    const projectMembers = project.members.map((m) => m.user._id.toString());
    const invalidAssignees = assignees.filter(
      (id) => !projectMembers.includes(id)
    );

    if (invalidAssignees.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Một số thành viên không thuộc dự án",
        invalidAssignees,
      });
    }

    // Cập nhật danh sách người được gán
    task.assignees = assignees;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name email avatar")
      .populate("project", "name");

    // Gửi thông báo cho những người được gán mới
    const newAssignees = assignees.filter((id) => !task.assignees.includes(id));
    for (const assigneeId of newAssignees) {
      global.io.emit("task_assigned", {
        taskId: task._id,
        projectId: task.project,
        assigneeId: assigneeId,
        assigner: {
          id: req.user.id,
          name: req.user.name,
        },
      });
    }

    res.json({
      success: true,
      message: "Gán công việc thành công",
      data: populatedTask,
    });
  } catch (error) {
    console.error("Lỗi khi gán công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gán công việc",
      error: error.message,
    });
  }
};

// Xóa công việc
export const deleteTask = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id,
      ["Admin", "Project Manager"]
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra xem task có phải là parent của task khác không
    const hasSubtasks = await Task.exists({ parent: task._id });
    if (hasSubtasks) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa công việc vì còn công việc con",
      });
    }

    // Kiểm tra xem task có phải là dependency của task khác không
    const hasDependents = await Task.exists({ "dependencies.task": task._id });
    if (hasDependents) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa công việc vì có công việc khác phụ thuộc",
      });
    }

    // Xóa tất cả timelogs liên quan
    await Timelog.deleteMany({ task: task._id });

    // Xóa tất cả comments liên quan
    await Comment.deleteMany({ task: task._id });

    // Nếu là subtask, cập nhật parent task
    if (task.parent) {
      const parentTask = await Task.findById(task.parent);
      if (parentTask) {
        parentTask.subtasks = parentTask.subtasks.filter(
          (id) => id.toString() !== task._id.toString()
        );
        await parentTask.save();
      }
    }

    await task.deleteOne();

    // Gửi thông báo realtime
    global.io.emit("task_deleted", {
      taskId: task._id,
      projectId: task.project,
      deleter: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Xóa công việc thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa công việc",
      error: error.message,
    });
  }
};

// Upload file đính kèm
export const uploadAttachment = async (req, res) => {
  try {
    const { task, error } = await checkTaskPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file được upload",
      });
    }

    // Upload file lên Cloudinary
    const result = await uploadToCloudinary(req.file.path);

    // Xóa file tạm
    fs.unlinkSync(req.file.path);

    // Thêm thông tin file vào task
    const attachment = {
      url: result.secure_url,
      publicId: result.public_id,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    // Gửi thông báo realtime
    global.io.emit("task_attachment_added", {
      taskId: task._id,
      attachment,
      uploader: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Upload file thành công",
      data: attachment,
    });
  } catch (error) {
    console.error("Lỗi khi upload file:", error);
    // Xóa file tạm nếu có lỗi
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: "Lỗi khi upload file",
      error: error.message,
    });
  }
};

export default {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  uploadAttachment,
  updateStatus,
  addTag,
  removeTag,
  syncWithGoogleCalendar,
  updateEstimatedTime,
  getTaskTimeStats,
  updateProgress,
  toggleWatcher,
  toggleDependency,
};
