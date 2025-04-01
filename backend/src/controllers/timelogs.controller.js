import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Timelog from "../models/timelog.model.js";
import Comment from "../models/comment.model.js";
import { google } from "googleapis";
import { calendar } from "../config/google.config.js";
import { createNotification } from "./notification.controller.js";
import User from "../models/user.model.js";

// Validate dữ liệu đầu vào
const validateTimelogData = (data) => {
  const errors = [];

  if (!data.startTime) {
    errors.push("Thời gian bắt đầu là bắt buộc");
  }

  if (data.description && data.description.length > 500) {
    errors.push("Mô tả không được quá 500 ký tự");
  }

  return errors;
};

// Kiểm tra quyền truy cập timelog
const checkTimelogPermission = async (timelogId, userId) => {
  const timelog = await Timelog.findById(timelogId).populate({
    path: "task",
    populate: { path: "project", populate: { path: "members" } },
  });

  if (!timelog) return { error: "Bản ghi thời gian không tồn tại" };

  const project = timelog.task.project;
  if (project.owner.toString() === userId.toString()) return { timelog };

  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (!member) return { error: "Bạn không phải thành viên của dự án" };

  if (timelog.user.toString() !== userId.toString()) {
    return { error: "Bạn không có quyền chỉnh sửa bản ghi thời gian này" };
  }

  return { timelog };
};

// Lấy danh sách time logs
export const getTimelogs = async (req, res) => {
  try {
    const { taskId, userId } = req.query;
    const query = {};

    if (taskId) query.task = taskId;
    if (userId) query.user = userId;

    const timelogs = await Timelog.find(query)
      .populate("task user")
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: timelogs,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách time logs:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách time logs",
      error: error.message,
    });
  }
};

// Tạo bản ghi thời gian mới
export const createTimelog = async (req, res) => {
  try {
    const { taskId, description, startTime } = req.body;

    // Kiểm tra task
    const task = await Task.findById(taskId).populate({
      path: "project",
      populate: { path: "members" },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    // Kiểm tra quyền
    const project = task.project;
    if (!project.owner.equals(req.user._id)) {
      const member = project.members.find((m) => m.user.equals(req.user._id));
      if (!member) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền ghi nhận thời gian cho công việc này",
        });
      }
    }

    // Tạo bản ghi mới
    const timelog = new Timelog({
      task: taskId,
      project: project._id,
      user: req.user._id,
      description,
      startTime: startTime || new Date(),
      status: "running",
    });

    await timelog.save();

    // Thông báo cho người được phân công
    if (task.assignees.includes(req.user._id)) {
      await createNotification({
        userId: task.assignees.filter((id) => !id.equals(req.user._id)),
        type: "timelog_started",
        message: `${req.user.name} đã bắt đầu làm việc trên "${task.title}"`,
        link: `/tasks/${task._id}`,
        task: task._id,
        project: project._id,
        timelog: timelog._id,
        senderId: req.user._id,
      });
    }

    // Gửi thông báo realtime
    global.io.emit("timelog_created", {
      taskId,
      timelog,
      creator: {
        id: req.user._id,
        name: req.user.name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Tạo bản ghi thời gian thành công",
      data: timelog,
    });
  } catch (error) {
    console.error("Lỗi khi tạo bản ghi thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo bản ghi thời gian",
      error: error.message,
    });
  }
};

// Bắt đầu đếm thời gian
export const startTimer = async (req, res) => {
  try {
    const { timelogId } = req.params;
    const { timelog, error } = await checkTimelogPermission(
      timelogId,
      req.user._id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra trạng thái hiện tại
    if (timelog.status === "running") {
      return res.status(400).json({
        success: false,
        message: "Bản ghi thời gian đã đang chạy",
      });
    }

    // Cập nhật trạng thái
    timelog.status = "running";
    timelog.startTime = new Date();
    await timelog.save();

    // Gửi thông báo realtime
    global.io.emit("timer_started", {
      timelogId: timelog._id,
      taskId: timelog.task._id,
      startTime: timelog.startTime,
      user: {
        id: req.user._id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Bắt đầu đếm thời gian thành công",
      data: timelog,
    });
  } catch (error) {
    console.error("Lỗi khi bắt đầu đếm thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi bắt đầu đếm thời gian",
      error: error.message,
    });
  }
};

// Tạm dừng đếm thời gian
export const pauseTimer = async (req, res) => {
  try {
    const { timelogId } = req.params;
    const { timelog, error } = await checkTimelogPermission(
      timelogId,
      req.user._id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra trạng thái hiện tại
    if (timelog.status !== "running") {
      return res.status(400).json({
        success: false,
        message: "Bản ghi thời gian không trong trạng thái chạy",
      });
    }

    // Cập nhật thời gian và trạng thái
    const now = new Date();
    const duration = Math.round((now - timelog.startTime) / 1000); // Đổi sang giây
    timelog.duration = (timelog.duration || 0) + duration;
    timelog.status = "paused";
    await timelog.save();

    // Cập nhật thời gian thực tế của task
    const task = await Task.findById(timelog.task);
    if (task) {
      task.actualTime = (task.actualTime || 0) + duration;
      await task.save();
    }

    // Gửi thông báo realtime
    global.io.emit("timer_paused", {
      timelogId: timelog._id,
      taskId: timelog.task._id,
      duration: timelog.duration,
      user: {
        id: req.user._id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Tạm dừng đếm thời gian thành công",
      data: timelog,
    });
  } catch (error) {
    console.error("Lỗi khi tạm dừng đếm thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạm dừng đếm thời gian",
      error: error.message,
    });
  }
};

// Hoàn thành và kết thúc đếm thời gian
export const completeTimer = async (req, res) => {
  try {
    const { timelogId } = req.params;
    const { timelog, error } = await checkTimelogPermission(
      timelogId,
      req.user._id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Tính toán thời gian nếu đang chạy
    if (timelog.status === "running") {
      const now = new Date();
      const duration = Math.round((now - timelog.startTime) / 1000);
      timelog.duration = (timelog.duration || 0) + duration;
    }

    // Cập nhật trạng thái
    timelog.status = "completed";
    timelog.endTime = new Date();
    await timelog.save();

    // Cập nhật thời gian thực tế của task
    const task = await Task.findById(timelog.task);
    if (task) {
      task.actualTime = (task.actualTime || 0) + (timelog.duration || 0);
      await task.save();

      // Thông báo cho người được phân công
      await createNotification({
        userId: task.assignees.filter((id) => !id.equals(req.user._id)),
        type: "timelog_completed",
        message: `${req.user.name} đã hoàn thành công việc trên "${
          task.title
        }" (${Math.round(timelog.duration / 60) || 0} phút)`,
        link: `/tasks/${task._id}`,
        task: task._id,
        project: timelog.project,
        timelog: timelog._id,
        senderId: req.user._id,
      });
    }

    // Gửi thông báo realtime
    global.io.emit("timer_completed", {
      timelogId: timelog._id,
      taskId: timelog.task._id,
      duration: timelog.duration,
      user: {
        id: req.user._id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Hoàn thành bản ghi thời gian thành công",
      data: timelog,
    });
  } catch (error) {
    console.error("Lỗi khi hoàn thành bản ghi thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hoàn thành bản ghi thời gian",
      error: error.message,
    });
  }
};

// Lấy báo cáo thời gian làm việc
export const getTimelogReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, projectId } = req.query;

    // Xây dựng query
    const query = {
      user: userId,
      status: "completed",
    };

    if (startDate) {
      query.startTime = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.endTime = { $lte: new Date(endDate) };
    }
    if (projectId) {
      query.project = projectId;
    }

    // Thống kê tổng quan
    const overallStats = await Timelog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTime: { $sum: "$duration" },
          totalTasks: { $addToSet: "$task" },
          totalProjects: { $addToSet: "$project" },
        },
      },
    ]);

    // Thống kê theo ngày
    const dailyStats = await Timelog.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
          },
          totalTime: { $sum: "$duration" },
          tasks: { $addToSet: "$task" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Thống kê theo dự án
    const projectStats = await Timelog.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$project",
          totalTime: { $sum: "$duration" },
          tasks: { $addToSet: "$task" },
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "projectInfo",
        },
      },
    ]);

    // Định dạng kết quả
    const report = {
      overall: {
        totalTime: overallStats[0]?.totalTime || 0,
        totalTasks: overallStats[0]?.totalTasks.length || 0,
        totalProjects: overallStats[0]?.totalProjects.length || 0,
        averageDaily:
          dailyStats.length > 0
            ? Math.round((overallStats[0]?.totalTime || 0) / dailyStats.length)
            : 0,
      },
      daily: dailyStats.map((day) => ({
        date: day._id,
        totalTime: day.totalTime,
        taskCount: day.tasks.length,
      })),
      projects: projectStats.map((proj) => ({
        project: {
          id: proj._id,
          name: proj.projectInfo[0]?.name,
          status: proj.projectInfo[0]?.status,
        },
        totalTime: proj.totalTime,
        taskCount: proj.tasks.length,
      })),
    };

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo thời gian làm việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo thời gian làm việc",
      error: error.message,
    });
  }
};

// Cập nhật time log
export const updateTimelog = async (req, res) => {
  try {
    const { timelog, error } = await checkTimelogPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const errors = validateTimelogData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Chỉ cho phép cập nhật một số trường
    const allowedUpdates = ["endTime", "description", "duration"];
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        timelog[key] = req.body[key];
      }
    });

    await timelog.save();

    const populatedTimelog = await Timelog.findById(timelog._id).populate(
      "task user"
    );

    res.json({
      success: true,
      message: "Cập nhật time log thành công",
      data: populatedTimelog,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật time log:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật time log",
      error: error.message,
    });
  }
};

// Xóa time log
export const deleteTimelog = async (req, res) => {
  try {
    const { timelog, error } = await checkTimelogPermission(
      req.params.id,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    await timelog.remove();

    res.json({
      success: true,
      message: "Xóa time log thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa time log:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa time log",
      error: error.message,
    });
  }
};

// So sánh thời gian dự kiến và thực tế
export const getTimeComparison = async (req, res) => {
  try {
    const { taskId, projectId } = req.query;

    // Query cho task cụ thể
    if (taskId) {
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy công việc",
        });
      }

      const comparison = {
        estimated: task.estimatedTime || 0,
        actual: task.actualTime || 0,
        difference: (task.actualTime || 0) - (task.estimatedTime || 0),
        percentageDeviation: task.estimatedTime
          ? Math.round(
              (((task.actualTime || 0) - task.estimatedTime) /
                task.estimatedTime) *
                100
            )
          : 0,
      };

      return res.json({
        success: true,
        data: comparison,
      });
    }

    // Query cho cả dự án
    if (projectId) {
      const tasks = await Task.find({ project: projectId });

      const projectComparison = {
        overall: {
          estimated: 0,
          actual: 0,
          difference: 0,
          percentageDeviation: 0,
        },
        taskBreakdown: [],
      };

      tasks.forEach((task) => {
        projectComparison.overall.estimated += task.estimatedTime || 0;
        projectComparison.overall.actual += task.actualTime || 0;

        projectComparison.taskBreakdown.push({
          taskId: task._id,
          title: task.title,
          estimated: task.estimatedTime || 0,
          actual: task.actualTime || 0,
          difference: (task.actualTime || 0) - (task.estimatedTime || 0),
          percentageDeviation: task.estimatedTime
            ? Math.round(
                (((task.actualTime || 0) - task.estimatedTime) /
                  task.estimatedTime) *
                  100
              )
            : 0,
        });
      });

      projectComparison.overall.difference =
        projectComparison.overall.actual - projectComparison.overall.estimated;
      projectComparison.overall.percentageDeviation = projectComparison.overall
        .estimated
        ? Math.round(
            (projectComparison.overall.difference /
              projectComparison.overall.estimated) *
              100
          )
        : 0;

      return res.json({
        success: true,
        data: projectComparison,
      });
    }

    res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp taskId hoặc projectId",
    });
  } catch (error) {
    console.error("Lỗi khi so sánh thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi so sánh thời gian",
      error: error.message,
    });
  }
};
