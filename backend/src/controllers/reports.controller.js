import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import Timelog from "../models/timelog.model.js";
import { PERMISSIONS } from "../config/constants.js";
import Sprint from "../models/sprint.model.js";
import mongoose from "mongoose";

// Helper function để kiểm tra quyền truy cập báo cáo
const checkReportPermission = async (projectId, userId, userRole) => {
  // Admin có quyền truy cập tất cả báo cáo
  if (userRole === 'admin') {
    const project = await Project.findById(projectId);
    if (!project) return { error: "Dự án không tồn tại" };
    return { project };
  }
  
  const project = await Project.findById(projectId);
  if (!project) return { error: "Dự án không tồn tại" };

  // Kiểm tra nếu là chủ dự án
  if (project.owner && project.owner.toString() === userId.toString()) {
    return { project };
  }

  // Kiểm tra nếu là thành viên dự án
  const member = project.members.find(
    (m) => m.user && m.user.toString() === userId.toString()
  );
  
  if (!member) {
    return { error: "Bạn không có quyền xem báo cáo của dự án này" };
  }
  
  // Kiểm tra nếu có quyền quản lý dự án
  if (member.role !== "Project Manager" && member.role !== "admin") {
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
    console.log("=== DEBUG getProjectOverview ===");
    console.log("ProjectId:", projectId);
    console.log("UserId:", req.user.id);
    console.log("User Role:", req.user.role);
    
    const isAdmin = req.user.role === 'admin';
    
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập, bỏ qua nếu là admin
    if (!isAdmin) {
      const isMember = project.members.some(
        (member) => member.user && member.user.toString() === req.user.id.toString()
      );
      const isOwner = project.owner && project.owner.toString() === req.user.id.toString();
      
      if (!isMember && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem báo cáo của dự án này",
        });
      }
    }

    // Lấy tất cả tasks của dự án
    const tasks = await Task.find({ project: projectId });
    console.log("Found Tasks:", tasks.length);

    // Thống kê theo trạng thái
    const statusStats = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "inProgress").length,
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
      
    console.log("Status Stats:", statusStats);
    console.log("Priority Stats:", priorityStats);
    console.log("=== END DEBUG getProjectOverview ===");

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
          efficiency: totalEstimated && totalActual ? (totalEstimated / totalActual) * 100 : 0,
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
      req.user.id,
      req.user.role
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
      req.user.id,
      req.user.role
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
    const { sprint: sprintId, startDate, endDate, groupBy = "day" } = req.query;
    
    console.log("=== DEBUG getTimeReport ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);
    console.log("GroupBy:", groupBy);
    console.log("Date Range:", startDate, endDate);
    console.log("UserId:", req.user.id);
    console.log("User Role:", req.user.role);

    const isAdmin = req.user.role === 'admin';
    
    // Kiểm tra dự án tồn tại
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập, bỏ qua nếu là admin
    if (!isAdmin) {
      const isMember = project.members.some(
        (member) => member.user && member.user.toString() === req.user.id.toString()
      );
      const isOwner = project.owner && project.owner.toString() === req.user.id.toString();
      
      if (!isMember && !isOwner) {
      return res.status(403).json({
        success: false,
          message: "Bạn không có quyền xem báo cáo của dự án này",
        });
      }
    }

    // Nếu có sprintId, kiểm tra sprint tồn tại
    if (sprintId) {
      const sprint = await Sprint.findOne({
        _id: sprintId,
        project: projectId,
      });

      if (!sprint) {
        return res.status(404).json({
          success: false,
          message: "Sprint không tồn tại",
        });
      }
    }

    // Format date grouping
    const dateFormat = {
      day: "%Y-%m-%d",
      week: "%Y-W%V",
      month: "%Y-%m",
    }[groupBy];

    // Xây dựng điều kiện match cho timelogs
    const matchCondition = {
      project: new mongoose.Types.ObjectId(projectId),
    };

    // Tạo điều kiện cho tasks
    const taskMatchCondition = {
      project: projectId,
    };

    // Thêm điều kiện sprint nếu có
    if (sprintId) {
      const sprintTasks = await Task.find({ sprint: sprintId }).select('_id');
      const taskIds = sprintTasks.map(task => task._id);
      matchCondition.task = { $in: taskIds };
      taskMatchCondition.sprint = sprintId;
    }

    // Thêm điều kiện thời gian
    if (startDate || endDate) {
      matchCondition.startTime = {};
      if (startDate) matchCondition.startTime.$gte = new Date(startDate);
      if (endDate) matchCondition.startTime.$lte = new Date(endDate);
    }

    console.log("Match Condition:", matchCondition);

    // Lấy danh sách tasks để tính estimated time
    const tasks = await Task.find(taskMatchCondition);
    console.log(`Found ${tasks.length} tasks for time report`);

    // Tính tổng estimated time từ tất cả tasks
    const totalEstimatedHours = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
    console.log("Total estimated hours:", totalEstimatedHours);

    // Tổng actual time từ tất cả tasks
    const totalActualHours = tasks.reduce((sum, task) => sum + (task.actualTime || 0), 0);
    console.log("Total actual hours from tasks:", totalActualHours);

    // Thống kê thời gian theo nhóm
    const timeStats = await Timelog.aggregate([
      {
        $match: matchCondition
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

    console.log("Time Stats Count:", timeStats.length);

    // Tổng hợp dữ liệu
    const timeReport = {
      byPeriod: {},
      byUser: {},
      total: {
        time: 0,
        estimatedTime: totalEstimatedHours * 60, // Chuyển giờ sang phút
        actualTime: totalActualHours * 60, // Chuyển giờ sang phút
        tasks: new Set(),
      },
    };

    // Tạo dữ liệu về thời gian ước tính cho mỗi ngày
    // Chia thời gian ước tính đều cho mỗi ngày trong khoảng thời gian
    let uniquePeriods = new Set();
    timeStats.forEach(stat => uniquePeriods.add(stat._id.period));
    const periodCount = Math.max(1, uniquePeriods.size);
    const estimatedTimePerPeriod = (totalEstimatedHours * 60) / periodCount; // Phút
    
    console.log("Estimated time allocation:", {
      totalEstimatedHours,
      periodCount,
      estimatedTimePerPeriod,
      uniquePeriods: Array.from(uniquePeriods)
    });

    // Tạo danh sách ngày có công việc trước
    const periodsWithEstimatedTime = {};
    Array.from(uniquePeriods).forEach(period => {
      periodsWithEstimatedTime[period] = estimatedTimePerPeriod;
    });
    
    console.log("Periods with estimated time:", periodsWithEstimatedTime);

    timeStats.forEach((stat) => {
      const period = stat._id.period;
      
      // Kiểm tra userInfo tồn tại
      if (!stat.userInfo || stat.userInfo.length === 0) {
        console.log("Missing userInfo for stat:", stat);
        return; // Bỏ qua stat này nếu không có userInfo
      }
      
      const user = stat.userInfo[0];

      // Thống kê theo thời gian
      if (!timeReport.byPeriod[period]) {
        timeReport.byPeriod[period] = {
          totalTime: 0,
          estimatedTime: periodsWithEstimatedTime[period] || estimatedTimePerPeriod,
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

    // Kiểm tra lại dữ liệu đã tạo
    console.log("Final byPeriod data contains estimatedTime:", Object.keys(timeReport.byPeriod).map(period => ({
      period,
      hasEstimatedTime: typeof timeReport.byPeriod[period].estimatedTime === 'number',
      estimatedTimeValue: timeReport.byPeriod[period].estimatedTime
    })));

    // Chuyển Set thành số lượng
    Object.values(timeReport.byUser).forEach((userStat) => {
      userStat.taskCount = userStat.taskCount.size;
    });
    timeReport.total.tasks = timeReport.total.tasks.size;

    console.log("Report Generated Successfully");
    console.log("=== END DEBUG getTimeReport ===");

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

// 📌 3.1 Báo cáo tổng quan trang reports
export const getReportOverview = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sprint: sprintId } = req.query;
    
    // Kiểm tra quyền truy cập
    const isAdmin = req.user.role === 'admin';
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập, bỏ qua nếu là admin
    if (!isAdmin) {
      const isMember = project.members.some(
        (member) => member.user && member.user.toString() === req.user.id.toString()
      );
      const isOwner = project.owner && project.owner.toString() === req.user.id.toString();
      
      if (!isMember && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem báo cáo của dự án này",
        });
      }
    }

    // Xây dựng query cho tasks
    let taskQuery = { project: projectId };
    
    // Nếu có sprintId, thêm vào điều kiện truy vấn
    if (sprintId) {
      taskQuery.sprint = sprintId;
    }

    // Lấy tất cả tasks của dự án (và sprint nếu có)
    const tasks = await Task.find(taskQuery);
    
    // Lấy số lượng sprint của dự án
    const sprints = await Sprint.find({ project: projectId });
    const sprintCount = sprints.length;
    
    // Lấy thời gian làm việc thực tế từ timelogs
    const timelogsQuery = { 
      project: projectId,
      isActive: false // Chỉ lấy timelogs đã hoàn thành
    };
    
    // Nếu có sprintId, lọc timelogs theo tasks của sprint đó
    if (sprintId) {
      const taskIds = tasks.map(task => task._id);
      timelogsQuery.task = { $in: taskIds };
    }
    
    // Lấy tất cả timelogs có thực của dự án
    const timelogs = await Timelog.find(timelogsQuery);
    
    // Lấy tổng thời gian thực tế từ các task (actualTime là thời gian thực tế ở đơn vị giờ)
    // Chuyển đổi sang phút để thống nhất đơn vị với timelogs
    const tasksActualTotalTime = tasks.reduce((total, task) => {
      return total + ((task.actualTime || 0) * 60); // Chuyển từ giờ sang phút
    }, 0);
    
    // Tổng thời gian từ timelogs (đơn vị phút)
    const timelogsTotalTime = timelogs.reduce((total, log) => {
      return total + (log.duration || 0);
    }, 0);
    
    // Đếm số task hoàn thành
    const completedTasks = tasks.filter(t => t.status === "done").length;
    
    // Ưu tiên dùng tổng thời gian thực tế từ task, nếu không có thì dùng thời gian từ timelogs
    const totalActualTime = tasksActualTotalTime > 0 ? tasksActualTotalTime : timelogsTotalTime;
    
    // Log thông tin thời gian để debug
    console.log("Time data:", {
      tasksActualTotalTime, 
      timelogsTotalTime, 
      totalActualTime,
      source: tasksActualTotalTime > 0 ? 'tasks' : 'timelogs'
    });
    
    res.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        completedTasks: completedTasks,
        totalMembers: sprintCount,
        totalTime: totalActualTime,
        actualTimeSource: tasksActualTotalTime > 0 ? 'tasks' : 'timelogs'
      }
    });
    
  } catch (error) {
    console.error("Lỗi khi lấy tổng quan báo cáo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy tổng quan báo cáo",
      error: error.message,
    });
  }
};

// 📌 5. Lấy dữ liệu biểu đồ burndown
export const getBurndownChartData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sprint: sprintId } = req.query;

    console.log("=== DEBUG getBurndownChartData ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);

    // Kiểm tra dự án tồn tại
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    let sprintName = "Tất cả";
    let startDate, endDate;

    // Nếu có sprintId, lấy thông tin sprint
    if (sprintId && sprintId !== "all") {
      // Lấy đầy đủ thông tin sprint với tất cả các trường
      const sprint = await Sprint.findById(sprintId).lean();

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

      // Log thông tin chi tiết của sprint để debug
      console.log("Sprint raw data:", {
        _id: sprint._id,
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        startDateType: typeof sprint.startDate,
        endDateType: typeof sprint.endDate,
        startDateValue: String(sprint.startDate),
        endDateValue: String(sprint.endDate),
        startDateISO: sprint.startDate instanceof Date ? sprint.startDate.toISOString() : 'Not a Date',
        endDateISO: sprint.endDate instanceof Date ? sprint.endDate.toISOString() : 'Not a Date'
      });
      
      // Kiểm tra nghiêm ngặt startDate và endDate
      if (!sprint.startDate) {
        console.error("Sprint missing startDate:", sprint._id);
        return res.status(400).json({
          success: false,
          message: "Sprint không có ngày bắt đầu",
        });
      }

      sprintName = sprint.name;
      
      // FIX: Xử lý ngày một cách chính xác, không bị ảnh hưởng bởi múi giờ
      // Lấy chính xác ngày từ chuỗi ISO hoặc từ đối tượng Date
      let startDateStr, endDateStr;
      
      if (typeof sprint.startDate === 'string') {
        startDateStr = sprint.startDate.split('T')[0]; // Lấy chỉ phần ngày YYYY-MM-DD
      } else {
        startDateStr = sprint.startDate.toISOString().split('T')[0];
      }
      
      // Tách ngày tháng năm
      const [startYear, startMonth, startDay] = startDateStr.split('-').map(num => parseInt(num, 10));
      
      // Tạo Date object với ngày, tháng, năm đã tách (không có giờ, phút, giây)
      startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      
      // Tương tự cho endDate
      console.log("Checking sprint end date:", {
        hasEndDate: !!sprint.endDate,
        endDateValue: sprint.endDate,
        endDateType: typeof sprint.endDate
      });
      
      // QUAN TRỌNG: Đảm bảo sử dụng endDate của sprint
      if (sprint.endDate) {
        if (typeof sprint.endDate === 'string') {
          endDateStr = sprint.endDate.split('T')[0];
        } else {
          endDateStr = sprint.endDate.toISOString().split('T')[0];
        }
        
        const [endYear, endMonth, endDay] = endDateStr.split('-').map(num => parseInt(num, 10));
        endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        
        console.log("Created end date from sprint:", {
          endDateStr,
          parsedDate: endDate.toISOString(),
          rawComponents: [endYear, endMonth, endDay]
        });
        
        // Kiểm tra endDate hợp lệ - CHỈ thay thế nếu thực sự không hợp lệ
        if (isNaN(endDate.getTime())) {
          console.error("Invalid endDate:", endDateStr, endDate);
          // Nếu endDate không hợp lệ, sử dụng startDate + 2 tuần
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 14); // Mặc định 2 tuần
          endDate.setHours(23, 59, 59, 999);
        } else if (endDate < startDate) {
          console.error("endDate is before startDate:", endDateStr, startDateStr);
          // Nếu endDate trước startDate, sử dụng startDate + 2 tuần
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 14); // Mặc định 2 tuần
          endDate.setHours(23, 59, 59, 999);
        }
      } else {
        // Nếu không có endDate trong sprint, sử dụng startDate + 2 tuần thay vì ngày hiện tại
        console.log("Sprint missing endDate, using startDate + 2 weeks");
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 14); // Mặc định 2 tuần
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Log thông tin sau khi xử lý đặc biệt múi giờ
      console.log("Sprint dates after direct parsing:", {
        startDateStr,
        startDate: startDate.toISOString(),
        startDateLocal: startDate.toLocaleDateString(),
        endDateStr: endDateStr || 'N/A',
        endDate: endDate.toISOString(),
        endDateLocal: endDate.toLocaleDateString()
      });
    } else {
      // Nếu không có sprintId, lấy thông tin từ dự án
      startDate = new Date(project.startDate || project.createdAt);
      endDate = project.endDate ? new Date(project.endDate) : new Date();
      
      // Nếu không có endDate từ dự án, sử dụng startDate + 1 tuần để đảm bảo có một khoảng thời gian hợp lý
      if (!project.endDate) {
        console.log("No project end date, creating a reasonable time range");
        // Mặc định hiển thị 1 tuần
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
      }
      
      console.log("All sprints mode - using project dates:", {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });
    }
    
    // Chuẩn hóa thời gian - đặt startDate về đầu ngày (00:00) và endDate về cuối ngày (23:59)
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Không cần xử lý khoảng thời gian tùy chỉnh nữa vì đã loại bỏ timeRange
    
    console.log("Processed dates:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      daysDiff: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    });

    // Lấy tiêu chí tìm kiếm task
    let taskQuery = { project: projectId };
    if (sprintId && sprintId !== "all") {
      taskQuery.sprint = sprintId;
    }

    // Lấy tất cả tasks
    const allTasks = await Task.find(taskQuery);
    console.log("Total tasks:", allTasks.length);

    // Nếu không có task nào, trả về danh sách trống
    if (allTasks.length === 0) {
      return res.json({
        success: true,
        data: {
          burndown: [],
          sprint: sprintName
        }
      });
    }

    // Tổng số task
    const totalTasks = allTasks.length;

    // Tạo một mảng ngày từ startDate đến endDate
    const dates = [];
    let currentDate = new Date(startDate);
    
    // IMPORTANT DEBUG: Kiểm tra chắc chắn endDate là đúng
    console.log("CRITICAL DATE CHECK BEFORE GENERATE:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      endDateGetTime: endDate.getTime(),
      startDateGetTime: startDate.getTime(),
      calculatedDaysDiff: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)),
      endDateAfterStartDate: endDate > startDate
    });

    // QUAN TRỌNG: Kiểm tra và đảm bảo endDate sau startDate
    if (endDate <= startDate) {
      console.error("endDate <= startDate, setting endDate to startDate + 7 days");
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Tạo danh sách tất cả các ngày trong khoảng thời gian từ startDate đến endDate (inclusive)
    console.log("Creating date range from", startDate.toISOString(), "to", endDate.toISOString());
    
    // Tạo một bản sao của currentDate để tránh tham chiếu
    currentDate = new Date(startDate.getTime());
    
    // Đặt lại thời gian để đảm bảo so sánh chính xác
    currentDate.setHours(0, 0, 0, 0);
    const endCheck = new Date(endDate.getTime());
    endCheck.setHours(23, 59, 59, 999);
    
    // Sử dụng vòng lặp while với phép so sánh <= để đảm bảo bao gồm cả ngày cuối
    while (currentDate <= endCheck) {
      const newDate = new Date(currentDate.getTime());
      dates.push(newDate);
      
      // Cẩn thận tăng ngày lên 1 để tránh vòng lặp vô hạn
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Debug thông tin của currentDate sau khi tăng
      if (dates.length <= 3 || dates.length > 100 || currentDate > endCheck) {
        console.log(`After date ${dates.length}: currentDate = ${currentDate.toISOString()}, still <= endDate: ${currentDate <= endCheck}`);
      }
      
      // Kiểm tra nếu có quá nhiều ngày, có thể có vòng lặp vô hạn
      if (dates.length > 365) {
        console.error("Too many dates generated, possible infinite loop");
        break;
      }
    }
    
    console.log(`Generated ${dates.length} dates for burndown chart`);
    
    // Hiển thị thông tin chi tiết về các ngày quan trọng đã tạo
    console.log("Important dates generated:");
    console.log(`  First date: ${dates[0]?.toISOString().split('T')[0]}`);
    console.log(`  Last date: ${dates[dates.length-1]?.toISOString().split('T')[0]}`);
    if (dates.length > 5) {
      console.log(`  Middle date: ${dates[Math.floor(dates.length/2)]?.toISOString().split('T')[0]}`);
    }

    // Tạo dữ liệu burndown cho mỗi ngày 
    const burndownData = dates.map((date, index) => {
      // FIX: Định dạng ngày không bị ảnh hưởng bởi múi giờ local
      const day = date.getDate();
      const month = date.getMonth() + 1; // Tháng trong JS bắt đầu từ 0
      const year = date.getFullYear();
      const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Tính số task đã hoàn thành đến ngày này
      const checkDate = new Date(date);
      checkDate.setHours(23, 59, 59, 999);
      
      const completedTasks = allTasks.filter(task => 
        task.status === 'done' && 
        task.completedAt && 
        new Date(task.completedAt) <= checkDate
      );
      
      const completedCount = completedTasks.length;
      
      // Tính số task còn lại
      const remainingTasks = totalTasks - completedCount;
      
      // Tính lý tưởng theo tỷ lệ ngày
      let idealRemaining;
      if (dates.length === 1) {
        idealRemaining = 0; // Nếu chỉ có 1 ngày
      } else {
        idealRemaining = Math.max(0, Math.floor(totalTasks * (1 - (index / (dates.length - 1)))));
      }
      
      return {
        date: dateKey,
        remaining: Math.max(0, remainingTasks),
        ideal: idealRemaining,
        completed: completedCount
      };
    });
    
    console.log("Burndown data points:", burndownData.length);
    if (burndownData.length > 0) {
      console.log("First data point:", burndownData[0]);
      console.log("Last data point:", burndownData[burndownData.length-1]);
    }
    console.log("=== END DEBUG getBurndownChartData ===");

    return res.json({
      success: true,
      data: {
        burndown: burndownData,
        sprint: sprintName,
        dateRange: {
          startDate: dates[0]?.toISOString().split('T')[0],
          endDate: dates[dates.length-1]?.toISOString().split('T')[0],
          totalDays: dates.length
        }
      }
    });

  } catch (error) {
    console.error('Burndown chart error:', error);
    return res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu biểu đồ Burndown",
      error: error.message
    });
  }
};

// Lấy báo cáo hiệu suất thành viên
export const getMemberPerformance = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { sprint: sprintId } = req.query;
    
    console.log("=== DEBUG getMemberPerformance ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);
    console.log("UserId:", req.user.id);
    console.log("User Role:", req.user.role);
    
    const isAdmin = req.user.role === 'admin';
    
    // Kiểm tra dự án tồn tại
    const project = await Project.findById(projectId)
      .populate('members.user', 'name email avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập, bỏ qua nếu là admin
    if (!isAdmin) {
      const isMember = project.members.some(
        (member) => member.user && member.user._id.toString() === req.user.id.toString()
      );
      const isOwner = project.owner && project.owner.toString() === req.user.id.toString();
      
      if (!isMember && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền xem báo cáo của dự án này",
        });
      }
    }

    // Kiểm tra sprint tồn tại nếu có
    if (sprintId) {
      const sprint = await Sprint.findOne({
        _id: sprintId,
            project: projectId,
      });

      if (!sprint) {
        return res.status(404).json({
          success: false,
          message: "Sprint không tồn tại",
        });
      }
    }

    // Tạo danh sách thành viên từ project
    const members = project.members.map(member => ({
      user: member.user,
      role: member.role,
      taskStats: {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0
      },
      timeStats: {
        totalTime: 0,
        averageDaily: 0
      },
      performance: 0
    }));
    
    console.log("Total members:", members.length);

    // Xây dựng điều kiện truy vấn
    const taskQuery = { project: projectId };
    const timelogQuery = { project: projectId };
    
    if (sprintId) {
      taskQuery.sprint = sprintId;
      
      // Lấy danh sách task của sprint để lọc timelogs
      const sprintTasks = await Task.find({ sprint: sprintId, project: projectId }).select('_id');
      const taskIds = sprintTasks.map(task => task._id);
      timelogQuery.task = { $in: taskIds };
    }
    
    // Lấy tất cả các task của dự án để phân tích trạng thái
    const allProjectTasks = await Task.find(taskQuery);
    const uniqueStatuses = [...new Set(allProjectTasks.map(task => task.status))];
    console.log("All unique task statuses in project:", uniqueStatuses);
    
    // Đếm số lượng task trong mỗi trạng thái
    const statusCounts = uniqueStatuses.reduce((acc, status) => {
      acc[status] = allProjectTasks.filter(task => task.status === status).length;
      return acc;
    }, {});
    console.log("Task counts by status:", statusCounts);
    
    // Xác định tổng số task hoàn thành thực tế trong dự án/sprint
    const totalCompletedTasks = allProjectTasks.filter(t => t.status === "done").length;
    console.log("Total completed tasks in project/sprint:", totalCompletedTasks);

    // Lấy dữ liệu cho từng thành viên
    await Promise.all(
      members.map(async (member) => {
        try {
          const userId = member.user._id;
          
          // Thêm điều kiện assignee vào truy vấn
          const memberTaskQuery = { ...taskQuery, assignees: userId };
          
          // Lấy task của thành viên
          const tasks = await Task.find(memberTaskQuery);
          
          // Debug: Kiểm tra trạng thái của các task
          console.log(`DEBUG tasks for member ${member.user.name || userId}:`, 
            tasks.map(t => ({id: t._id, title: t.title, status: t.status}))
          );
          
          // Đếm các task theo trạng thái
          const doneTasks = tasks.filter(t => t.status === "done");
          const inProgressTasks = tasks.filter(t => t.status === "inProgress");
          const overdueTasks = tasks.filter(t => 
            t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date()
          );
          
          console.log(`Member task counts for ${member.user.name || userId}:`, {
            total: tasks.length,
            done: doneTasks.length,
            inProgress: inProgressTasks.length,
            overdue: overdueTasks.length,
            doneIds: doneTasks.map(t => t._id)
          });
          
          // Cập nhật thống kê task
          member.taskStats.total = tasks.length;
          member.taskStats.completed = doneTasks.length;
          member.taskStats.inProgress = inProgressTasks.length;
          member.taskStats.overdue = overdueTasks.length;
          
          // Thêm điều kiện user vào truy vấn
          const memberTimelogQuery = { ...timelogQuery, user: userId };
          
          // Lấy timelog của thành viên
          const timelogs = await Timelog.find(memberTimelogQuery);
          
          // Tính tổng thời gian từ actualTime của task thay vì từ timelogs
          // Tính tổng thời gian từ actualTime của tasks (đơn vị giờ -> chuyển sang phút)
          const tasksActualTotalTime = tasks.reduce((sum, task) => {
            return sum + ((task.actualTime || 0) * 60); // Chuyển đổi từ giờ sang phút
          }, 0);
          
          // Ưu tiên sử dụng thời gian thực tế từ tasks
          member.timeStats.totalTime = tasksActualTotalTime;
          
          // Tính hiệu suất
          const completionRate = member.taskStats.total > 0 
            ? (member.taskStats.completed / member.taskStats.total) * 100 
            : 0;
            
          const onTimeRate = member.taskStats.total > 0 
            ? ((member.taskStats.completed - member.taskStats.overdue) / member.taskStats.total) * 100 
            : 0;
            
          // Điểm hiệu suất = tỷ lệ hoàn thành (60%) + tỷ lệ đúng hạn (40%)
          member.performance = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));
          
          return member;
        } catch (memberError) {
          console.error(`Error processing member ${member.user._id}:`, memberError);
          return member; // Vẫn trả về member dù có lỗi
        }
      })
    );

    // Tính toán tổng task được gán
    const totalAssignedTasksCount = members.reduce((sum, m) => sum + m.taskStats.total, 0);
    // Tính tổng task hoàn thành được ghi nhận (có thể bị trùng lặp)
    const totalCompletedTasksCount = members.reduce((sum, m) => sum + m.taskStats.completed, 0);
    
    console.log("Total assigned tasks count:", totalAssignedTasksCount);
    console.log("Total completed tasks count from members:", totalCompletedTasksCount);
    console.log("Actual total completed tasks:", totalCompletedTasks);
    
    // Điều chỉnh số liệu trong trường hợp có task trùng lặp
    if (totalCompletedTasksCount > totalCompletedTasks) {
      console.log("Detected duplicate counting of completed tasks!");
      
      // Tính toán tỷ lệ hiệu chỉnh
      const adjustmentRatio = totalCompletedTasks / totalCompletedTasksCount;
      
      // Điều chỉnh số liệu cho mỗi thành viên
      members.forEach(member => {
        // Điều chỉnh số task hoàn thành
        const adjustedCompleted = Math.round(member.taskStats.completed * adjustmentRatio);
        console.log(`Adjusting member ${member.user.name}: ${member.taskStats.completed} -> ${adjustedCompleted} completed tasks`);
        
        member.taskStats.completed = adjustedCompleted;
        
        // Tính lại hiệu suất
        const completionRate = member.taskStats.total > 0 
          ? (member.taskStats.completed / member.taskStats.total) * 100 
          : 0;
          
        const onTimeRate = member.taskStats.total > 0 
          ? ((member.taskStats.completed - member.taskStats.overdue) / member.taskStats.total) * 100 
          : 0;
          
        member.performance = Math.round((completionRate * 0.6) + (onTimeRate * 0.4));
      });
    }

    // Tính toán hiệu suất trung bình
    const avgPerformance = members.length > 0
      ? members.reduce((sum, m) => sum + m.performance, 0) / members.length
      : 0;
      
    console.log("Average performance:", avgPerformance);
    console.log("=== END DEBUG getMemberPerformance ===");

    res.json({
      success: true,
      data: {
        members,
        totalMembers: members.length,
        averagePerformance: Math.round(avgPerformance),
        sprintId: sprintId
      },
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
