import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Sprint from "../models/sprint.model.js";
import Comment from "../models/comment.model.js";
import Timelog from "../models/timelog.model.js";
import User from "../models/user.model.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { calendar } from "../config/google.config.js";
import fs from "fs";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ROLES } from "../config/constants.js";
import mongoose from "mongoose";
import { TASK_STATUSES, PRIORITY_LEVELS } from "../config/constants.js";
import path from "path";
import asyncHandler from "express-async-handler";
import Upload from "../models/upload.model.js";
import uploadService from "../services/upload.services.js";

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
    
    console.log(`New task created with position ${newPosition} in column ${task.status}`);

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
    console.log("=== DEBUG UPDATE STATUS ===");
    console.log("Request params:", req.params);
    console.log("Task ID from params:", req.params.taskId);
    console.log("Request user:", req.user?.id);
    console.log("Request body:", req.body);
    
    // Sử dụng taskId từ URL
    const taskId = req.params.taskId || req.params.id;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Task ID is required",
      });
    }
    
    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }
    
    const { status, position } = req.body;
    if (!status || !["todo", "inProgress", "done"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    // Đảm bảo các task trong cùng cột đều có position - Cần thiết cho các task được tạo trước khi thêm trường position
    const hasNoPositionTasks = await Task.exists({
      status: task.status,
      position: { $exists: false }
    });
    
    if (hasNoPositionTasks) {
      console.log(`Found tasks without position in column ${task.status}, migrating position data...`);
      
      // Lấy tất cả task trong cùng cột theo thời gian tạo
      const tasksInColumn = await Task.find({ status: task.status })
        .sort({ createdAt: 1 });
      
      // Cập nhật position cho từng task
      for (let i = 0; i < tasksInColumn.length; i++) {
        await Task.updateOne(
          { _id: tasksInColumn[i]._id },
          { $set: { position: i } }
        );
      }
      
      console.log(`Migrated position data for ${tasksInColumn.length} tasks in column ${task.status}`);
    }
    
    // Migration cho cột đích nếu khác với cột hiện tại
    if (status !== task.status) {
      const hasNoPositionTasksInTarget = await Task.exists({
        status: status,
        position: { $exists: false }
      });
      
      if (hasNoPositionTasksInTarget) {
        console.log(`Found tasks without position in target column ${status}, migrating position data...`);
        
        // Lấy tất cả task trong cột đích theo thời gian tạo
        const tasksInTargetColumn = await Task.find({ status })
          .sort({ createdAt: 1 });
        
        // Cập nhật position cho từng task
        for (let i = 0; i < tasksInTargetColumn.length; i++) {
          await Task.updateOne(
            { _id: tasksInTargetColumn[i]._id },
            { $set: { position: i } }
          );
        }
        
        console.log(`Migrated position data for ${tasksInTargetColumn.length} tasks in column ${status}`);
      }
    }

    // Reload task để đảm bảo có trường position sau khi migration
    const updatedTask = await Task.findById(taskId);
    const oldStatus = updatedTask.status;
    const oldPosition = updatedTask.position || 0;

    // Kiểm tra dependencies nếu chuyển sang đang thực hiện
    if (status === "inProgress" && typeof updatedTask.checkDependencies === 'function') {
      const { canStart, pendingBlockers } = await updatedTask.checkDependencies();
      if (!canStart) {
        return res.status(400).json({
          success: false,
          message:
            "Không thể bắt đầu công việc do còn phụ thuộc vào các công việc chưa hoàn thành",
          pendingBlockers,
        });
      }
    }
    
    // Xử lý position nếu có cung cấp
    if (position !== undefined) {
      console.log(`Updating position from ${oldPosition} to ${position} for task ${taskId}`);
      
      // Nếu thay đổi cột (status)
      if (oldStatus !== status) {
        console.log(`Status changed from ${oldStatus} to ${status}`);
        
        // Giảm position cho tất cả task có position > oldPosition trong cột cũ
        await Task.updateMany(
          { status: oldStatus, position: { $gt: oldPosition } },
          { $inc: { position: -1 } }
        );
        
        // Xử lý trong cột mới dựa vào position
        if (position === 0) {
          // Đặt task ở đầu cột, tăng position của tất cả task trong cột mới lên 1
          console.log(`Placing task at position 0 (beginning of column), incrementing all tasks in ${status} column`);
          await Task.updateMany(
            { status },
            { $inc: { position: 1 } }
          );
        } else {
          // Tăng position cho tất cả task có position >= position trong cột mới
          console.log(`Placing task at position ${position}, incrementing positions >= ${position} in ${status} column`);
          await Task.updateMany(
            { status, position: { $gte: position } },
            { $inc: { position: 1 } }
          );
        }
      } 
      // Nếu chỉ thay đổi position trong cùng cột
      else if (oldPosition !== position) {
        console.log(`Position changed in the same column from ${oldPosition} to ${position}`);
        
        if (position === 0) {
          // Đặt task ở đầu cột, tăng position của tất cả task khác (trừ task hiện tại)
          console.log(`Moving task to position 0 (beginning of column)`);
          await Task.updateMany(
            { status, _id: { $ne: taskId } },
            { $inc: { position: 1 } }
          );
        } else if (oldPosition < position) {
          // Di chuyển xuống: Giảm position cho các task nằm giữa oldPosition và position
          await Task.updateMany(
            { status: status, position: { $gt: oldPosition, $lte: position } },
            { $inc: { position: -1 } }
          );
        } else {
          // Di chuyển lên: Tăng position cho các task nằm giữa position và oldPosition
          await Task.updateMany(
            { status: status, position: { $gte: position, $lt: oldPosition } },
            { $inc: { position: 1 } }
          );
        }
      }
    } else {
      // Nếu không cung cấp position, tìm position cao nhất trong column đích + 1
      const maxPositionTask = await Task.findOne({ status })
        .sort({ position: -1 })
        .limit(1);
      
      const newPosition = maxPositionTask ? maxPositionTask.position + 1 : 0;
      console.log(`No position provided, using ${newPosition} (end of column)`);
      req.body.position = newPosition;
    }

    updatedTask.status = status;
    updatedTask.position = req.body.position;
    
    if (status === "done") {
      updatedTask.completedAt = new Date();
      updatedTask.progress = 100;
    }
    await updatedTask.save();

    // Gửi thông báo cập nhật trạng thái
    if (global.io) {
      global.io.emit("task_status_updated", {
        taskId: updatedTask._id,
        newStatus: status,
        newPosition: updatedTask.position,
        updater: {
          id: req.user?.id,
          name: req.user?.name,
        },
      });
    }

    res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      data: updatedTask,
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
    console.log("=== DEBUG DELETE TASK ===");
    console.log("Request params:", req.params);
    console.log("Request URL:", req.originalUrl);
    console.log("Request path:", req.path);
    
    // Lấy ID từ params
    const taskId = req.params.taskId || req.params.id;
    const projectId = req.params.projectId;
    const sprintId = req.params.sprintId;
    
    console.log("Extracted IDs:", { taskId, projectId, sprintId });
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID công việc",
      });
    }
    
    const userId = req.user.id;

    // Lấy thông tin task
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "members" },
    });

    if (!task) {
      console.log("Task not found with ID:", taskId);
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }
    
    console.log("Found task:", {
      id: task._id,
      title: task.title,
      project: task.project?._id,
      assignees: task.assignees?.length || 0
    });

    const project = task.project;

    // Kiểm tra quyền xóa task
    // 1. Admin và Project Manager có thể xóa mọi task
    // 2. Member chỉ có thể xóa task mà họ tạo và chưa được gán cho người khác
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isProjectManager = project.members.some(
      (m) =>
        m.user.toString() === userId.toString() &&
        m.role === ROLES.PROJECT_MANAGER
    );
    const isProjectOwner = project.owner.toString() === userId.toString();
    const isTaskCreator = task.createdBy.toString() === userId.toString();
    const hasAssignees = task.assignees && task.assignees.length > 0;

    // Nếu là admin, project manager hoặc owner - cho phép xóa
    const canDelete =
      isAdmin ||
      isProjectManager ||
      isProjectOwner ||
      // Hoặc là người tạo task và task chưa được gán
      (isTaskCreator && !hasAssignees);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa công việc này",
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
    
    // Cập nhật các sprint chứa task này
    const Sprint = mongoose.model('Sprint');
    const sprints = await Sprint.find({ tasks: task._id });
    
    console.log(`Found ${sprints.length} sprints containing this task`);
    
    for (const sprint of sprints) {
      console.log(`Removing task from sprint ${sprint._id}`);
      sprint.tasks = sprint.tasks.filter(
        (id) => id.toString() !== task._id.toString()
      );
      await sprint.save();
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

// Upload attachment for a task
const addAttachment = async (req, res) => {
  try {
    console.log("\n=== DEBUG addAttachment ===");
    console.log("Request params:", req.params);
    console.log("Request headers:", {
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
    });
    console.log("Request user:", req.user ? { id: req.user.id, name: req.user.name } : 'No user');
    console.log("Request file:", req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    
    const { projectId, sprintId, taskId } = req.params;
    
    // Validate required parameters
    if (!projectId || !sprintId || !taskId) {
      console.error("Missing required parameters:", { projectId, sprintId, taskId });
      return res.status(400).json({ 
        success: false,
        message: "Missing required parameters: projectId, sprintId, taskId" 
      });
    }

    // Check authenticated user
    if (!req.user) {
      console.error("User not authenticated");
      return res.status(401).json({ 
        success: false,
        message: "User not authenticated" 
      });
    }
    
    const userId = req.user.id || req.user._id;
    if (!userId) {
      console.error("User ID not found in request");
      return res.status(401).json({ 
        success: false,
        message: "User ID not found" 
      });
    }

    // Check if the file was uploaded
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ 
        success: false,
        message: "No file uploaded" 
      });
    }
    
    // Get the task from the database
    const task = await Task.findById(taskId);
    if (!task) {
      console.error("Task not found with ID:", taskId);
      return res.status(404).json({ 
        success: false,
        message: "Task not found with ID: " + taskId
      });
    }

    // Create a sanitized filename from the original name
    let originalName = req.file.originalname;
    
    // Log the raw filename before processing
    console.log("Original raw filename:", originalName);
    
    // Ensure originalName is properly decoded
    if (req.fileOriginalNames && req.fileOriginalNames[req.file.filename]) {
      // Use the already decoded filename from multer middleware
      originalName = req.fileOriginalNames[req.file.filename];
      console.log("Using decoded filename from multer:", originalName);
    } else {
      // Try to decode if it's URI encoded (for Vietnamese characters)
      try {
        if (originalName.includes('%')) {
          originalName = decodeURIComponent(originalName);
          console.log("Decoded URI encoded filename:", originalName);
        }
        
        // Try to fix encoding issues by assuming Latin1 misinterpretation
        if (/[\u0080-\uFFFF]/.test(originalName)) {
          console.log("Filename contains non-ASCII characters");
          const latinBytes = Buffer.from(originalName, 'latin1');
          const utf8Name = latinBytes.toString('utf8');
          if (utf8Name !== originalName) {
            console.log("Converted from latin1 to utf8:", utf8Name);
            originalName = utf8Name;
          }
        }
      } catch (error) {
        console.error("Error decoding filename:", error);
        // Continue with the original name if decoding fails
      }
    }

    console.log("Final filename after processing:", originalName);

    // Lưu file vào Upload model thông qua service
    console.log("Saving file to Upload model");
    
    // Prepare file data before passing to uploadService
    // Make sure all required fields are present
    const fileData = {
      file: {
        ...req.file,
        originalname: originalName
      }
    };
    
    // Log the data being sent to uploadService
    console.log("File data being sent to uploadService:", {
      filename: fileData.file.filename,
      originalname: fileData.file.originalname,
      mimetype: fileData.file.mimetype,
      size: fileData.file.size,
      path: fileData.file.path
    });
    
    // Check for any null or undefined values
    if (!fileData.file.filename || !fileData.file.path) {
      console.error("Critical file data missing:", {
        filename: fileData.file.filename, 
        path: fileData.file.path
      });
      return res.status(500).json({
        success: false,
        message: "File upload failed - missing critical data"
      });
    }

    const uploadResult = await uploadService.saveFileInfo(fileData, {
      userId,
      taskId,
      projectId,
      permissions: 'public' // Mặc định là công khai
    });

    console.log("File saved to Upload model:", uploadResult._id);

    // Create the attachment entry for Task model
    const attachment = {
      _id: uploadResult._id, // Sử dụng ID từ Upload model
      name: originalName,
      filename: req.file.filename,
      path: req.file.path,
      url: `uploads/${req.file.filename}`, // Chắc chắn đúng định dạng đường dẫn truy cập
      size: req.file.size,
      type: req.file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date(),
      // Thêm tham chiếu đến model Upload
      uploadId: uploadResult._id,
      // Thêm quyền truy cập "public" để cho phép mọi người xem
      accessControl: {
        public: true, 
        permissions: []
      }
    };

    console.log("Adding attachment to task:", {
      taskId: task._id,
      attachment: {
        name: attachment.name,
        size: attachment.size,
        type: attachment.type,
        url: attachment.url,
        accessControl: attachment.accessControl
      }
    });

    // Add the attachment to the task
    if (!task.attachments) {
      task.attachments = [];
    }
    
    task.attachments.push(attachment);
    
    // Save the task with the new attachment
    await task.save();
    console.log("Task saved with new attachment");

    // Get the ID of the newly added attachment
    const newAttachmentId = task.attachments[task.attachments.length - 1]._id;

    // Sử dụng service để lấy URL đầy đủ
    const fullUrl = uploadService.getFullUrl({
      filename: req.file.filename
    }, req);

    const attachmentWithFullUrl = {
      ...attachment,
      _id: newAttachmentId,
      id: newAttachmentId, // Add both formats for frontend compatibility
      fullUrl: fullUrl
    };

    console.log("Successfully added attachment:", {
      taskId: task._id,
      attachmentId: newAttachmentId,
      filename: originalName,
      fullUrl: fullUrl
    });

    // Return success response with the attachment data
    return res.status(200).json({
      success: true,
      message: "Attachment added successfully",
      data: {
        attachment: attachmentWithFullUrl,
        task: task
      }
    });
  } catch (error) {
    console.error("Error adding attachment:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      success: false,
      message: "Server error when adding attachment", 
      error: error.message
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

// Lấy danh sách tệp đính kèm của task
export const getTaskAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`Lấy attachments cho task: ${taskId}`);

    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại",
      });
    }

    // Kết hợp hai nguồn: từ attachments của Task và từ model Upload
    const taskAttachments = [];
    
    // 1. Lấy từ Task model
    if (task.attachments && Array.isArray(task.attachments) && task.attachments.length > 0) {
      task.attachments.forEach(att => {
        taskAttachments.push({
          _id: att._id,
          id: att._id,
          name: att.name || 'Unnamed file',
          filename: att.filename,
          url: att.url,
          type: att.type || 'application/octet-stream',
          size: att.size || 0,
          uploadedBy: att.uploadedBy,
          uploadedAt: att.uploadedAt || new Date(),
          createdAt: att.uploadedAt || new Date(),
          accessControl: att.accessControl || { public: true },
          source: 'task'
        });
      });
    }
    
    // 2. Lấy từ Upload model
    let uploadAttachments = [];
    try {
      uploadAttachments = await uploadService.getFilesByTaskId(taskId);
      
      // Chuyển đổi các đối tượng Upload thành định dạng tương thích
      if (uploadAttachments && uploadAttachments.length > 0) {
        uploadAttachments = uploadAttachments.map(att => ({
          _id: att._id,
          id: att._id,
          name: att.originalname || 'Unnamed file',
          filename: att.filename,
          url: `/uploads/${att.filename}`,
          fullUrl: uploadService.getFullUrl(att, req),
          type: att.mimetype || 'application/octet-stream',
          size: att.size || 0,
          uploadedBy: att.uploadedBy?._id || att.uploadedBy,
          uploadedAt: att.createdAt || new Date(),
          createdAt: att.createdAt || new Date(),
          accessControl: { public: att.permissions === 'public' },
          source: 'upload'
        }));
      }
    } catch (error) {
      console.error("Lỗi khi lấy file từ Upload model:", error);
      // Tiếp tục với chỉ attachments từ Task model
    }
    
    // Kết hợp hai mảng và loại bỏ trùng lặp dựa trên ID
    const allAttachments = [...taskAttachments];
    
    // Thêm các file từ Upload model mà không có trong Task attachments
    uploadAttachments.forEach(ua => {
      if (!taskAttachments.some(ta => ta._id.toString() === ua._id.toString())) {
        allAttachments.push(ua);
      }
    });
    
    // Thêm fullUrl cho mỗi attachment nếu chưa có
    const baseUrl = process.env.NODE_ENV === 'production'
      ? process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
      : `${req.protocol}://${req.get('host')}`;
      
    const attachments = allAttachments.map(att => {
      // Đã có fullUrl
      if (att.fullUrl) {
        return att;
      }
      
      // Tạo URL đầy đủ
      let fullUrl = '';
      if (att.url) {
        if (att.url.startsWith('http')) {
          fullUrl = att.url;
        } else {
          fullUrl = `${baseUrl}/${att.url.startsWith('/') ? att.url.substring(1) : att.url}`;
        }
      }
      
      return {
        ...att,
        fullUrl
      };
    });

    console.log(`Trả về ${attachments.length} attachments`);
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách tệp đính kèm thành công",
      data: attachments,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách tệp đính kèm:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách tệp đính kèm",
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

    // Bỏ qua kiểm tra sprint và project vì task có thể không có thông tin này
    // hoặc không được populate đúng cách

    // Lấy lịch sử thay đổi (có thể lấy từ model AuditLog nếu có)
    try {
      // Kiểm tra xem model AuditLog có tồn tại không
      let AuditLog;
      try {
        AuditLog = mongoose.model('AuditLog');
      } catch (modelError) {
        // Model không tồn tại, trả về mảng rỗng
        console.log("AuditLog model not found:", modelError.message);
        return res.status(200).json({
          success: true,
          message: "Chức năng lịch sử thay đổi chưa được triển khai",
          data: [],
        });
      }
      
      // Tạo lịch sử giả nếu không có dữ liệu thực
      const mockHistory = [
        {
          _id: `history_${Date.now()}_1`,
          entityId: taskId,
          entityType: 'Task',
          action: 'create',
          changes: { title: task.title, status: task.status },
          user: task.createdBy,
          createdAt: task.createdAt,
        }
      ];
      
      // Thử lấy dữ liệu từ AuditLog
      let history;
      try {
        history = await AuditLog.find({ 
          entityId: taskId,
          entityType: 'Task'
        }).populate('user', 'name email avatar').sort({ createdAt: -1 });
      } catch (queryError) {
        console.log("Error querying AuditLog:", queryError.message);
        history = mockHistory;
      }
      
      // Nếu không có lịch sử, sử dụng dữ liệu giả
      if (!history || history.length === 0) {
        history = mockHistory;
      }
      
      res.status(200).json({
        success: true,
        message: "Lấy lịch sử thay đổi thành công",
        data: history || [],
      });
    } catch (modelError) {
      console.error("AuditLog model error:", modelError);
      // Nếu không có model AuditLog, trả về mảng rỗng
      res.status(200).json({
        success: true,
        message: "Không có dữ liệu lịch sử",
        data: [],
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

// Xóa tệp đính kèm
export const deleteAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    console.log(`Xóa attachment ${attachmentId} từ task ${taskId}`);

    // Tìm task
    const task = await Task.findById(taskId)
      .populate('project')
      .populate('assignees');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }
    
    // Tìm attachment trong task
    if (!task.attachments || task.attachments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task không có attachments'
      });
    }

    // Tìm vị trí của attachment trong mảng
    const index = task.attachments.findIndex(att => 
      att._id.toString() === attachmentId
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy attachment'
      });
    }

    // Lấy thông tin attachment trước khi xóa
    const attachment = task.attachments[index];
    console.log("Attachment to delete:", attachment);

    // 1. Xóa từ Upload model nếu có tham chiếu
    const uploadId = attachment.uploadId || attachment._id;
    if (uploadId) {
      try {
        // Xóa file thông qua service
        await uploadService.deleteFile(uploadId, req.user.id);
        console.log(`Đã xóa file từ Upload model: ${uploadId}`);
      } catch (uploadError) {
        console.error("Lỗi khi xóa từ Upload model:", uploadError);
        // Tiếp tục xử lý ngay cả khi có lỗi
      }
    }

    // 2. Xóa file thực tế từ đĩa nếu không xóa qua service
    if (!uploadId) {
      try {
        if (attachment.path && fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
          console.log(`Đã xóa file: ${attachment.path}`);
        } else if (attachment.filename) {
          const filePath = path.join(process.cwd(), 'uploads', attachment.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Đã xóa file: ${filePath}`);
          }
        }
      } catch (fileError) {
        console.error("Lỗi khi xóa file từ đĩa:", fileError);
      }
    }

    // 3. Xóa attachment khỏi task
    task.attachments.splice(index, 1);
    await task.save();

    res.status(200).json({
      success: true,
      message: "Đã xóa tệp đính kèm",
    });
  } catch (error) {
    console.error("Lỗi khi xóa tệp đính kèm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa tệp đính kèm",
      error: error.message,
    });
  }
};

// Thêm hàm helper để kiểm tra quyền truy cập tệp đính kèm
const checkFileAccessPermission = async (taskId, userId) => {
  try {
    // Tìm task
    const task = await Task.findById(taskId)
      .populate('project')
      .populate('assignees');
    
    if (!task) {
      return { 
        hasAccess: false, 
        message: 'Không tìm thấy task' 
      };
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      return { 
        hasAccess: false, 
        message: 'Không tìm thấy thông tin người dùng' 
      };
    }
    
    // Kiểm tra admin hệ thống
    if (user.roles && user.roles.includes('Admin')) {
      return { hasAccess: true };
    }
    
    // Lấy thông tin dự án
    const project = task.project;
    if (!project) {
      return { 
        hasAccess: false, 
        message: 'Không tìm thấy thông tin dự án' 
      };
    }
    
    // Kiểm tra người dùng có phải là PM của dự án không
    const isProjectManager = project.members && project.members.some(
      member => member.user.toString() === userId.toString() && 
      (member.role === 'manager' || member.role === 'admin')
    );
    
    if (isProjectManager) {
      return { hasAccess: true };
    }
    
    // Kiểm tra người dùng có được gán vào task không
    const isAssignee = task.assignees && task.assignees.some(
      assignee => assignee._id.toString() === userId.toString() || 
      assignee.toString() === userId.toString()
    );
    
    if (isAssignee) {
      return { hasAccess: true };
    }
    
    return { 
      hasAccess: false, 
      message: 'Bạn không có quyền truy cập tệp đính kèm này' 
    };
  } catch (error) {
    console.error("Lỗi kiểm tra quyền truy cập:", error);
    return { 
      hasAccess: false, 
      message: 'Lỗi xử lý yêu cầu' 
    };
  }
};

// Thêm middleware cho việc kiểm tra quyền truy cập file
export const checkAttachmentAccess = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    
    const { hasAccess, message } = await checkFileAccessPermission(taskId, userId);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: message || 'Bạn không có quyền truy cập tệp đính kèm này'
      });
    }
    
    next();
  } catch (error) {
    console.error("Lỗi middleware kiểm tra quyền:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý yêu cầu',
      error: error.message
    });
  }
};

// Middleware kiểm tra quyền xóa file
export const checkDeletePermission = async (req, res, next) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = req.user.id;
    
    // Tìm task và attachment
    const task = await Task.findById(taskId)
      .populate('project')
      .populate('assignees');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }
    
    // Tìm attachment trong task
    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tệp đính kèm'
      });
    }
    
    // Lấy thông tin người dùng
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }
    
    // Kiểm tra admin hệ thống
    if (user.roles && user.roles.includes('Admin')) {
      return next();
    }
    
    // Lấy thông tin dự án
    const project = task.project;
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin dự án'
      });
    }
    
    // Kiểm tra người dùng có phải là PM của dự án không
    const isProjectManager = project.members && project.members.some(
      member => member.user.toString() === userId.toString() && 
      (member.role === 'manager' || member.role === 'admin')
    );
    
    if (isProjectManager) {
      return next();
    }
    
    // Kiểm tra người dùng có phải là người tải lên file không
    const isUploader = attachment.uploadedBy && 
      attachment.uploadedBy.toString() === userId.toString();
    
    if (isUploader) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền xóa tệp đính kèm này'
    });
  } catch (error) {
    console.error("Lỗi middleware kiểm tra quyền xóa:", error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xử lý yêu cầu',
      error: error.message
    });
  }
};

export {
  validateTaskData,
  checkTaskPermission,
  addAttachment
};
