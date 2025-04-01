import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import Timelog from "../models/timelog.model.js";
import { PERMISSIONS } from "../config/constants.js";

// Helper function để kiểm tra quyền truy cập báo cáo
const checkReportPermission = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: "Dự án không tồn tại" };

  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (
    !project.owner.toString() === userId.toString() &&
    !member?.role === "Project Manager"
  ) {
    return { error: "Bạn không có quyền xem báo cáo của dự án này" };
  }

  return { project };
};

// Helper function để tính toán thời gian làm việc
const calculateWorkingTime = (timelogs) => {
  return timelogs.reduce((total, log) => total + (log.duration || 0), 0);
};

// 📌 1. Báo cáo tổng quan dự án
export const getProjectOverview = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập
    const isMember = project.members.some(
      (member) => member.user.toString() === req.user.id.toString()
    );
    if (!isMember && project.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem báo cáo của dự án này",
      });
    }

    // Lấy tất cả tasks của dự án
    const tasks = await Task.find({ project: projectId });

    // Thống kê theo trạng thái
    const statusStats = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    // Thống kê theo độ ưu tiên
    const priorityStats = {
      low: tasks.filter((t) => t.priority === "low").length,
      medium: tasks.filter((t) => t.priority === "medium").length,
      high: tasks.filter((t) => t.priority === "high").length,
    };

    // Tính toán tiến độ và thời gian
    const totalTasks = tasks.length;
    const completedTasks = statusStats.done;
    const totalEstimated = tasks.reduce(
      (sum, task) => sum + (task.estimatedTime || 0),
      0
    );
    const totalActual = tasks.reduce(
      (sum, task) => sum + (task.actualTime || 0),
      0
    );

    // Tính số ngày còn lại
    const daysRemaining = project.dueDate
      ? Math.ceil(
          (new Date(project.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
        )
      : null;

    res.json({
      success: true,
      data: {
        general: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
          daysRemaining,
        },
        time: {
          estimated: totalEstimated,
          actual: totalActual,
          efficiency: totalEstimated ? (totalEstimated / totalActual) * 100 : 0,
        },
        status: statusStats,
        priority: priorityStats,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo tổng quan dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo tổng quan dự án",
      error: error.message,
    });
  }
};

// 📌 2. Báo cáo tiến độ dự án
export const getProjectProgress = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    const { error, project } = await checkReportPermission(
      projectId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Lấy dữ liệu burndown chart
    const burndownData = await project.getBurndownData();

    // Thống kê theo thời gian
    const timelineStats = await Task.aggregate([
      {
        $match: {
          project: project._id,
          createdAt: {
            $gte: startDate ? new Date(startDate) : project.startDate,
            $lte: endDate ? new Date(endDate) : project.endDate,
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          created: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Thống kê milestone
    const milestoneStats = await Promise.all(
      project.milestones.map(async (milestone) => {
        const tasks = await Task.find({
          project: project._id,
          milestone: milestone._id,
        });

        return {
          ...milestone.toObject(),
          stats: {
            total: tasks.length,
            completed: tasks.filter((t) => t.status === "done").length,
            onTrack: milestone.dueDate > new Date(),
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        burndown: burndownData,
        timeline: timelineStats,
        milestones: milestoneStats,
        completion: {
          tasks: {
            total: await Task.countDocuments({ project: project._id }),
            completed: await Task.countDocuments({
              project: project._id,
              status: "done",
            }),
          },
          milestones: {
            total: project.milestones.length,
            completed: project.milestones.filter(
              (m) => m.status === "Completed"
            ).length,
          },
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo tiến độ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo tiến độ",
      error: error.message,
    });
  }
};

// 📌 3. Báo cáo hiệu suất thành viên
export const getUserPerformance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, userId } = req.query;

    const { error, project } = await checkReportPermission(
      projectId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Lọc thành viên
    const members = userId
      ? project.members.filter((m) => m.user.toString() === userId)
      : project.members;

    // Lấy thống kê cho từng thành viên
    const performanceStats = await Promise.all(
      members.map(async (member) => {
        // Thống kê task
        const tasks = await Task.find({
          project: project._id,
          assignees: member.user,
          createdAt: {
            $gte: startDate ? new Date(startDate) : project.startDate,
            $lte: endDate ? new Date(endDate) : project.endDate,
          },
        });

        // Thống kê thời gian
        const timelogs = await Timelog.find({
          project: project._id,
          user: member.user,
          startTime: {
            $gte: startDate ? new Date(startDate) : project.startDate,
            $lte: endDate ? new Date(endDate) : project.endDate,
          },
        });

        const taskStats = {
          total: tasks.length,
          completed: tasks.filter((t) => t.status === "done").length,
          inProgress: tasks.filter((t) => t.status === "in_progress").length,
          overdue: tasks.filter(
            (t) => t.status !== "done" && t.dueDate && t.dueDate < new Date()
          ).length,
        };

        const timeStats = {
          totalTime: calculateWorkingTime(timelogs),
          averageDaily:
            timelogs.length > 0
              ? calculateWorkingTime(timelogs) / timelogs.length
              : 0,
        };

        return {
          user: await User.findById(member.user).select(
            "name email avatar position"
          ),
          role: member.role,
          taskStats,
          timeStats,
          efficiency:
            taskStats.completed > 0
              ? timeStats.totalTime / taskStats.completed
              : 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        members: performanceStats,
        summary: {
          totalMembers: performanceStats.length,
          averageCompletion:
            performanceStats.reduce(
              (avg, member) => avg + member.taskStats.completed,
              0
            ) / performanceStats.length,
          averageEfficiency:
            performanceStats.reduce(
              (avg, member) => avg + member.efficiency,
              0
            ) / performanceStats.length,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo hiệu suất:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo hiệu suất",
      error: error.message,
    });
  }
};

// 📌 4. Báo cáo thời gian làm việc
export const getTimeReport = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, groupBy = "day" } = req.query;

    const { error, project } = await checkReportPermission(
      projectId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Format date grouping
    const dateFormat = {
      day: "%Y-%m-%d",
      week: "%Y-W%V",
      month: "%Y-%m",
    }[groupBy];

    // Thống kê thời gian theo nhóm
    const timeStats = await Timelog.aggregate([
      {
        $match: {
          project: project._id,
          startTime: {
            $gte: startDate ? new Date(startDate) : project.startDate,
            $lte: endDate ? new Date(endDate) : project.endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            period: {
              $dateToString: { format: dateFormat, date: "$startTime" },
            },
            user: "$user",
          },
          totalTime: { $sum: "$duration" },
          taskCount: { $addToSet: "$task" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $sort: { "_id.period": 1 } },
    ]);

    // Tổng hợp dữ liệu
    const timeReport = {
      byPeriod: {},
      byUser: {},
      total: {
        time: 0,
        tasks: new Set(),
      },
    };

    timeStats.forEach((stat) => {
      const period = stat._id.period;
      const user = stat.userInfo[0];

      // Thống kê theo thời gian
      if (!timeReport.byPeriod[period]) {
        timeReport.byPeriod[period] = {
          totalTime: 0,
          users: [],
        };
      }
      timeReport.byPeriod[period].totalTime += stat.totalTime;
      timeReport.byPeriod[period].users.push({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        time: stat.totalTime,
        taskCount: stat.taskCount.length,
      });

      // Thống kê theo user
      if (!timeReport.byUser[user._id]) {
        timeReport.byUser[user._id] = {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
          totalTime: 0,
          taskCount: new Set(),
        };
      }
      timeReport.byUser[user._id].totalTime += stat.totalTime;
      stat.taskCount.forEach((taskId) =>
        timeReport.byUser[user._id].taskCount.add(taskId.toString())
      );

      // Tổng thống kê
      timeReport.total.time += stat.totalTime;
      stat.taskCount.forEach((taskId) =>
        timeReport.total.tasks.add(taskId.toString())
      );
    });

    // Chuyển Set thành số lượng
    Object.values(timeReport.byUser).forEach((userStat) => {
      userStat.taskCount = userStat.taskCount.size;
    });
    timeReport.total.tasks = timeReport.total.tasks.size;

    res.json({
      success: true,
      data: timeReport,
    });
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo thời gian:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo thời gian",
      error: error.message,
    });
  }
};

// Lấy dữ liệu biểu đồ Burndown
export const getBurndownChartData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập
    const isMember = project.members.some(
      (member) => member.user.toString() === req.user.id.toString()
    );
    if (!isMember && project.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem báo cáo của dự án này",
      });
    }

    // Lấy tất cả tasks của dự án
    const tasks = await Task.find({ project: projectId });

    // Tính tổng thời gian ước tính
    const totalEstimated = tasks.reduce(
      (sum, task) => sum + (task.estimatedTime || 0),
      0
    );

    // Tạo mảng dữ liệu theo ngày
    const startDate = project.startDate || project.createdAt;
    const endDate = project.dueDate || new Date();
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const burndownData = [];
    let remainingWork = totalEstimated;

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Tính tổng thời gian đã hoàn thành đến ngày này
      const completedTasks = await Task.find({
        project: projectId,
        completedAt: { $lte: date },
      });

      const completedTime = completedTasks.reduce(
        (sum, task) => sum + (task.actualTime || 0),
        0
      );

      remainingWork = totalEstimated - completedTime;

      burndownData.push({
        date: date.toISOString().split("T")[0],
        remaining: Math.max(0, remainingWork),
        ideal: totalEstimated - (totalEstimated / days) * i,
      });
    }

    res.json({
      success: true,
      data: {
        burndown: burndownData,
        total: totalEstimated,
        completed: totalEstimated - remainingWork,
        remaining: remainingWork,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu biểu đồ burndown:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu biểu đồ burndown",
      error: error.message,
    });
  }
};

// Lấy báo cáo hiệu suất thành viên
export const getMemberPerformance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate(
      "members.user",
      "name email avatar"
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập
    const isMember = project.members.some(
      (member) => member.user._id.toString() === req.user.id.toString()
    );
    if (!isMember && project.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem báo cáo của dự án này",
      });
    }

    // Lấy thống kê cho từng thành viên
    const memberStats = await Promise.all(
      project.members.map(async (member) => {
        // Các task được gán
        const assignedTasks = await Task.find({
          project: projectId,
          assignees: member.user._id,
        });

        // Các task đã hoàn thành
        const completedTasks = assignedTasks.filter(
          (task) => task.status === "done"
        );

        // Tổng thời gian làm việc
        const timelogs = await Timelog.find({
          project: projectId,
          user: member.user._id,
        });

        const totalTimeSpent = timelogs.reduce(
          (sum, log) => sum + (log.duration || 0),
          0
        );

        return {
          user: {
            id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar,
          },
          role: member.role,
          stats: {
            totalTasks: assignedTasks.length,
            completedTasks: completedTasks.length,
            completionRate: assignedTasks.length
              ? (completedTasks.length / assignedTasks.length) * 100
              : 0,
            timeSpent: totalTimeSpent,
            averageTimePerTask: completedTasks.length
              ? totalTimeSpent / completedTasks.length
              : 0,
          },
          tasks: assignedTasks.map((task) => ({
            id: task._id,
            title: task.title,
            status: task.status,
            estimatedTime: task.estimatedTime || 0,
            actualTime: task.actualTime || 0,
            efficiency:
              task.estimatedTime && task.actualTime
                ? (task.estimatedTime / task.actualTime) * 100
                : 0,
          })),
        };
      })
    );

    res.json({
      success: true,
      data: memberStats,
    });
  } catch (error) {
    console.error("Lỗi khi lấy báo cáo hiệu suất thành viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy báo cáo hiệu suất thành viên",
      error: error.message,
    });
  }
};
