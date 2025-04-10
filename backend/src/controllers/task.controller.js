import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Sprint from "../models/sprint.model.js";
import Comment from "../models/comment.model.js";
import Timelog from "../models/timelog.model.js";
import User from "../models/user.model.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { calendar } from "../config/google.config.js";
import { ROLES } from "../config/constants.js";
import mongoose from "mongoose";
import { TASK_STATUSES, PRIORITY_LEVELS } from "../config/constants.js";
import asyncHandler from "express-async-handler";
import Upload from "../models/upload.model.js";
import uploadService from "../services/upload.services.js";
import auditLogService from "../services/auditlog.service.js";
import { addAttachment, getTaskAttachments, deleteAttachment, checkAttachmentAccess, checkDeletePermission } from "./task.attachment.controller.js";
import path from "path";
import fs from "fs";

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

  if (data.priority && !["low", "medium", "high"].includes(data.priority)) {
    errors.push("Độ ưu tiên không hợp lệ");
  }

  if (
    data.status &&
    !["todo", "inProgress", "done"].includes(data.status)
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
  const task = await Task.findById(taskId)
    .populate({
      path: "project",
      populate: { path: "members" },
    })
    .populate("sprint", "name startDate endDate")
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
    console.log("=== DEBUG GET TASKS ===");
    console.log("Request params:", req.params);
    console.log("Request URL:", req.originalUrl);
    console.log("Request query:", req.query);
    
    const {
      projectId: queryProjectId,
      status,
      priority,
      assignee,
      search,
      startDate,
      endDate,
      milestone,
    } = req.query;
    
    // Ưu tiên sử dụng projectId và sprintId từ route params thay vì query
    const projectId = req.params.projectId || queryProjectId;
    const sprintId = req.params.sprintId;
    
    console.log("Using projectId:", projectId, "sprintId:", sprintId);
    
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
    
    let tasks = [];
    
    // Nếu có sprintId, kiểm tra xem task có thuộc về sprint này không
    if (sprintId && sprintId !== 'default') {
      console.log("Fetching tasks for specific sprint:", sprintId);
      
      // Lấy sprint để xem danh sách task của sprint
      const Sprint = mongoose.model('Sprint');
      const sprint = await Sprint.findById(sprintId);
      
      if (!sprint) {
        return res.status(404).json({
          success: false,
          message: "Sprint không tồn tại",
        });
      }
      
      console.log("Found sprint with", sprint.tasks?.length || 0, "tasks");
      
      // Chỉ lấy những task thuộc sprint này
      if (sprint.tasks && sprint.tasks.length > 0) {
        query._id = { $in: sprint.tasks };
      } else {
        // Nếu sprint không có task nào, trả về mảng rỗng
        return res.json({
          success: true,
          data: [],
          message: "Sprint này chưa có task nào"
        });
      }
    }
    
    console.log("Final query:", JSON.stringify(query));

    tasks = await Task.find(query)
      .populate("project", "name status")
      .populate("sprint", "name startDate endDate")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("parent", "title status")
      .populate("subtasks", "title status progress")
      .populate("milestone", "name dueDate")
      .populate("watchers", "name email avatar")
      .sort({ createdAt: -1 });
      
    console.log("Found", tasks.length, "tasks");

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
    const { projectId, sprintId, taskId } = req.params;
    console.log("=== DEBUG getTaskById ===");
    console.log("Request params:", req.params);
    console.log("Looking for task:", { projectId, sprintId, taskId });
    
    // Kiểm tra quyền truy cập task
    const { task, error } = await checkTaskPermission(
      taskId,
      req.user.id
    );
    
    if (error) {
      return res.status(404).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra nếu sprint null hoặc undefined
    if (!task.sprint) {
      console.log("Warning: Task has no sprint, trying to find sprint from params");
      
      if (sprintId) {
        // Tìm sprint từ sprintId trong params
        const sprint = await Sprint.findById(sprintId);
        if (sprint) {
          console.log("Found sprint from params:", sprint.name);
          task.sprint = sprint;
          // Lưu lại liên kết này
          await Task.updateOne({ _id: taskId }, { sprint: sprintId });
        }
      }
    }

    // Task đã được populate sprint trong checkTaskPermission
    // Ghi log để kiểm tra sprint đã được populate chưa
    console.log("Task found successfully with sprint:", task.sprint ? {
      id: task.sprint._id,
      name: task.sprint.name,
      startDate: task.sprint.startDate,
      endDate: task.sprint.endDate
    } : "No sprint");

    // Thêm thống kê
    const stats = {
      totalComments: await Comment.countDocuments({ task: task._id }),
      totalAttachments: task.attachments.length,
      totalTimelogs: await Timelog.countDocuments({ task: task._id }),
      totalTimeSpent: (
        await Timelog.aggregate([
          { $match: { task: task._id } },
          { $group: { _id: null, total: { $sum: "$duration" } } },
        ])
      )[0]?.total || 0,
    };

    console.log("=== END DEBUG getTaskById ===");
    
    res.json({
      success: true,
      data: { ...task.toObject(), stats },
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
    const projectId = req.params.projectId;
    const sprintId = req.params.sprintId;

    if (!projectId || !sprintId) {
      return res.status(400).json({
        success: false,
        message: "ProjectId và SprintId là bắt buộc",
      });
    }

    // Validate data đầu vào
    const errors = validateTaskData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Kiểm tra quyền
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền với dự án
    if (!project.members.some((m) => m.user.toString() === req.user.id)) {
      const hasManagementRole = req.user.roles.some((role) =>
        ["Admin", "Project Manager"].includes(role)
      );
      if (!hasManagementRole) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền tạo công việc trong dự án này",
        });
      }
    }

    // Kiểm tra sprint
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra sprint thuộc dự án
    if (sprint.project.toString() !== projectId) {
      return res.status(400).json({
        success: false,
        message: "Sprint không thuộc dự án",
      });
    }

    // Tìm position mới nhất cho task trong cùng cột
    const maxPositionTask = await Task.findOne({ status: req.body.status || 'todo' })
      .sort({ position: -1 })
      .limit(1);
    
    const newPosition = maxPositionTask ? maxPositionTask.position + 1 : 0;
    
    // Create task
    const task = new Task({
      ...req.body,
      project: projectId,
      sprint: sprintId,
      createdBy: req.user.id,
      position: newPosition,  // Thêm position cho task mới
    });

    await task.save();
    
    // Thêm task vào mảng tasks của sprint
    sprint.tasks.push(task._id);
    await sprint.save();
    
    console.log(`New task created with position ${newPosition} in column ${task.status}`);
    console.log(`Task ${task._id} added to sprint ${sprintId}, sprint now has ${sprint.tasks.length} tasks`);

    res.json({
      success: true,
      message: "Tạo công việc thành công",
      data: task,
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
    console.log("=== DEBUG UPDATE TASK ===");
    console.log("Request params:", req.params);
    console.log("Request user:", req.user);
    console.log("Request body:", req.body);

    // Lấy taskId từ params
    const taskId = req.params.taskId;
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu task ID trong request",
      });
    }

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    console.log("Found task:", task);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập
    const project = await Project.findById(task.project).populate("members");
    console.log("Found project:", {
      id: project?._id,
      owner: project?.owner,
      membersCount: project?.members?.length,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền
    const isOwner = project.owner.toString() === req.user._id.toString();
    const isMember = project.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    const isAssignee = task.assignees.some(
      (a) => a.toString() === req.user._id.toString()
    );

    console.log("Permission check:", {
      userId: req.user._id,
      isOwner,
      isMember,
      isAssignee,
    });

    if (!isOwner && !isMember && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật công việc này",
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

    // Lưu các giá trị cũ trước khi cập nhật
    const oldValues = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate,
      dueDate: task.dueDate,
      estimatedTime: task.estimatedTime,
      assignees: [...task.assignees],
      tags: [...task.tags]
    };
    
    console.log("Old values before update:", oldValues);

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

    // Nếu thay đổi trạng thái thành Hoàn thành, cập nhật completedAt
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
        id: req.user._id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật công việc thành công",
      data: populatedTask,
      oldValues // Trả về giá trị cũ để middleware có thể sử dụng cho auditing
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
    const { taskId } = req.params;
    const { status, position } = req.body;

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    // Lưu trạng thái cũ
    const oldStatus = task.status;
    
    console.log(`[updateStatus] Updating task ${taskId} status from '${oldStatus}' to '${status}'`);

    // Cập nhật trạng thái mới
    task.status = status;
    if (position !== undefined) {
      task.position = position;
    }

    // Nếu thay đổi trạng thái thành Hoàn thành, cập nhật completedAt
    if (status === "done" && !task.completedAt) {
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
        id: req.user._id,
        name: req.user.name,
      },
    });

    // Đặt oldStatus như một trường riêng biệt, không phải nested object để dễ truy cập
    return res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      oldStatus: oldStatus, // Thêm trạng thái cũ vào response ở level cao nhất
      data: populatedTask
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
    else task.status = "inProgress";

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
    const { taskId } = req.params;

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập
    const { error, task: taskDetail } = await checkTaskPermission(
      taskId,
      req.user._id,
      [ROLES.ADMIN, ROLES.PROJECT_MANAGER]
    );

    const isTaskCreator = task.createdBy.toString() === req.user._id.toString();
    const isUnassigned = task.assignees.length === 0;

    if (error && !(isTaskCreator && isUnassigned)) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Xóa task ID khỏi mảng tasks của sprint nếu có sprint
    if (task.sprint) {
      const sprint = await Sprint.findById(task.sprint);
      if (sprint) {
        sprint.tasks = sprint.tasks.filter(t => t.toString() !== taskId.toString());
        await sprint.save();
        console.log(`Task ${taskId} removed from sprint ${task.sprint}, sprint now has ${sprint.tasks.length} tasks`);
      }
    }

    // Xóa các dữ liệu liên quan
    await Comment.deleteMany({ task: taskId });
    await Timelog.deleteMany({ task: taskId });

    // Xóa tất cả file đính kèm
    for (const attachment of task.attachments || []) {
      if (attachment.path) {
        // Xóa file từ hệ thống
        try {
          const fullPath = path.join(process.cwd(), attachment.path);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Deleted file: ${fullPath}`);
          }
        } catch (err) {
          console.error(`Error deleting file: ${err.message}`);
        }
      }

      // Xóa upload record nếu có
      if (attachment.uploadId) {
        await Upload.findByIdAndDelete(attachment.uploadId);
      }
    }

    // Xóa task
    await Task.findByIdAndDelete(taskId);

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

export const getUpcomingTasks = async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    // Tìm các task có dueDate trong vòng 7 ngày tới và chưa hoàn thành
    const tasks = await Task.find({
      assignees: req.user.id,
      dueDate: {
        $gte: today,
        $lte: nextWeek,
      },
      status: { $ne: "done" },
    })
      .populate("project", "name status")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ dueDate: 1 });

    // Thêm thống kê cho mỗi task
    const tasksWithStats = await Promise.all(
      tasks.map(async (task) => {
        const stats = {
          totalComments: await Comment.countDocuments({ task: task.id }),
          totalAttachments: task.attachments.length,
          totalTimelogs: await Timelog.countDocuments({ task: task.id }),
          timeRemaining: task.dueDate
            ? Math.ceil((task.dueDate - today) / (1000 * 60 * 60 * 24))
            : null,
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
    console.error("Lỗi khi lấy danh sách công việc sắp đến hạn:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách công việc sắp đến hạn",
      error: error.message,
    });
  }
};

// Lấy lịch sử thay đổi của task
export const getTaskHistory = async (req, res) => {
  try {
    const { projectId, sprintId, taskId } = req.params;
    console.log(`Getting history for task: ${taskId} in sprint: ${sprintId}, project: ${projectId}`);

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    try {
      // Sử dụng auditLogService
      const history = await auditLogService.getTaskLogs(taskId);
      
      // Nếu không có lịch sử hoặc history là mảng rỗng
      if (!history || history.length === 0) {
        // Tạo một sự kiện tạo task nếu chưa có lịch sử
        // để người dùng không thấy trống
        const creationLog = {
          _id: `history_${Date.now()}_1`,
          entityId: taskId,
          entityType: 'Task',
          action: 'create',
          user: await User.findById(task.createdBy).select('name email avatar'),
          details: { 
            title: task.title, 
            status: task.status,
            description: task.description 
          },
          createdAt: task.createdAt,
        };
        
        // Trả về mảng với phần tử duy nhất là sự kiện tạo task
        return res.status(200).json({
          success: true,
          message: "Lấy lịch sử thay đổi thành công",
          data: [creationLog],
        });
      }
      
      // Trả về lịch sử từ AuditLog
      res.status(200).json({
        success: true,
        message: "Lấy lịch sử thay đổi thành công",
        data: history,
      });
    } catch (error) {
      console.error("Lỗi khi truy vấn AuditLog:", error);
      
      // Tạo lịch sử giả khi có lỗi
      const fallbackHistory = [{
        _id: `history_${Date.now()}_fallback`,
        entityId: taskId,
        entityType: 'Task',
        action: 'create',
        user: await User.findById(task.createdBy).select('name email avatar'),
        details: { title: task.title, status: task.status },
        createdAt: task.createdAt,
      }];
      
      res.status(200).json({
        success: true,
        message: "Sử dụng dữ liệu dự phòng do gặp lỗi khi truy vấn lịch sử",
        data: fallbackHistory,
      });
    }
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử thay đổi:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử thay đổi",
      error: error.message,
    });
  }
};

// Cập nhật thời gian task
export const updateTime = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { time } = req.body;

  if (!time || typeof time !== 'number' || time < 0) {
    return res.status(400).json({
      success: false,
      message: "Thời gian không hợp lệ"
    });
  }

  const task = await Task.findById(taskId);
  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy công việc"
    });
  }

  task.time = time;
  await task.save();

  res.status(200).json({
    success: true,
    data: task
  });
});

// Cập nhật người thực hiện task
export const updateAssignees = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { assigneeId, action } = req.body;

  // Kiểm tra quyền truy cập
  const { task, error } = await checkTaskPermission(taskId, req.user.id);
  if (error) {
    return res.status(403).json({
      success: false,
      message: error
    });
  }

  // Kiểm tra người dùng có tồn tại không
  const user = await User.findById(assigneeId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Người dùng không tồn tại"
    });
  }

  let updatedTask;
  if (action === 'assign') {
    // Thêm người thực hiện
    if (!task.assignees.includes(assigneeId)) {
      updatedTask = await Task.findByIdAndUpdate(
        taskId,
        { $addToSet: { assignees: assigneeId } },
        { new: true }
      ).populate('project', 'name')
        .populate('sprint', 'name')
        .populate('assignees', 'name email avatar');
    } else {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã được gán cho task này"
      });
    }
  } else if (action === 'unassign') {
    // Xóa người thực hiện
    updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $pull: { assignees: assigneeId } },
      { new: true }
    ).populate('project', 'name')
      .populate('sprint', 'name')
      .populate('assignees', 'name email avatar');
  } else {
    return res.status(400).json({
      success: false,
      message: "Hành động không hợp lệ"
    });
  }

  if (!updatedTask) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy task"
    });
  }

  res.json({
    success: true,
    data: updatedTask,
    message: action === 'assign' ? "Gán người thực hiện thành công" : "Hủy gán người thực hiện thành công"
  });
});
