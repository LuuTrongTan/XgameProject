import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Timelog from "../models/timelog.model.js";
import User from "../models/user.model.js";
import Sprint from "../models/sprint.model.js";
import Activity from "../models/activity.model.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

// 📌 1. Lấy tổng quan cho admin
export const getAdminDashboard = async (req, res) => {
  try {
    // Kiểm tra quyền admin
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập dashboard admin",
      });
    }

    // Thống kê người dùng
    const userStats = {
      total: await User.countDocuments(),
      active: await User.countDocuments({ status: "active" }),
      byDepartment: await User.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
      ]),
      byRole: await User.aggregate([
        { $unwind: "$roles" },
        { $group: { _id: "$roles", count: { $sum: 1 } } },
      ]),
    };

    // Thống kê dự án
    const projectStats = {
      total: await Project.countDocuments(),
      active: await Project.countDocuments({ status: "in_progress" }),
      byStatus: await Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      byCategory: await Project.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    };

    // Thống kê công việc
    const taskStats = {
      total: await Task.countDocuments(),
      completed: await Task.countDocuments({ status: "done" }),
      byStatus: await Task.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      byPriority: await Task.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
    };

    // Thống kê thời gian làm việc
    const timeStats = await Timelog.aggregate([
      {
        $group: {
          _id: null,
          totalTime: { $sum: "$duration" },
          avgTimePerTask: { $avg: "$duration" },
        },
      },
    ]);

    // Thống kê hiệu suất
    const performanceStats = {
      taskCompletionRate: (taskStats.completed / taskStats.total) * 100,
      avgTasksPerProject: taskStats.total / (projectStats.total || 1),
      avgMembersPerProject: await Project.aggregate([
        { $project: { memberCount: { $size: "$members" } } },
        { $group: { _id: null, avg: { $avg: "$memberCount" } } },
      ]),
    };

    res.json({
      success: true,
      data: {
        users: userStats,
        projects: projectStats,
        tasks: taskStats,
        time: timeStats[0] || { totalTime: 0, avgTimePerTask: 0 },
        performance: performanceStats,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê admin dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê admin dashboard",
      error: error.message,
    });
  }
};

// 📌 2. Lấy tổng quan cho người dùng
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Dự án của người dùng
    const projects = await Project.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    })
      .select("name status progress members")
      .populate("owner", "name avatar")
      .limit(5);

    // Công việc được giao
    const tasks = await Task.find({ assignees: userId })
      .select("title status priority dueDate project")
      .populate("project", "name")
      .sort({ dueDate: 1 })
      .limit(10);

    // Thống kê công việc
    const taskStats = {
      total: await Task.countDocuments({ assignees: userId }),
      completed: await Task.countDocuments({
        assignees: userId,
        status: "done",
      }),
      inProgress: await Task.countDocuments({
        assignees: userId,
        status: "in_progress",
      }),
      overdue: await Task.countDocuments({
        assignees: userId,
        status: { $ne: "done" },
        dueDate: { $lt: new Date() },
      }),
    };

    // Thời gian làm việc
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const timeStats = {
      today: await Timelog.aggregate([
        {
          $match: {
            user: userId,
            startTime: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$duration" },
          },
        },
      ]),
      thisWeek: await Timelog.aggregate([
        {
          $match: {
            user: userId,
            startTime: {
              $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
            },
            total: { $sum: "$duration" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    };

    // Hiệu suất
    const performance = {
      taskCompletionRate: (taskStats.completed / taskStats.total) * 100,
      onTimeCompletionRate:
        ((taskStats.completed - taskStats.overdue) / taskStats.total) * 100,
      averageTimePerTask:
        (
          await Timelog.aggregate([
            { $match: { user: userId } },
            { $group: { _id: "$task", duration: { $sum: "$duration" } } },
            { $group: { _id: null, avg: { $avg: "$duration" } } },
          ])
        )[0]?.avg || 0,
    };

    res.json({
      success: true,
      data: {
        projects,
        tasks,
        taskStats,
        timeStats: {
          today: timeStats.today[0]?.total || 0,
          weeklyBreakdown: timeStats.thisWeek,
        },
        performance,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy user dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy user dashboard",
      error: error.message,
    });
  }
};

// 📌 3. Lấy tổng quan dự án cho quản lý
export const getManagerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy danh sách dự án quản lý
    const managedProjects = await Project.find({
      $or: [
        { owner: userId },
        {
          members: {
            $elemMatch: { user: userId, role: "Project Manager" },
          },
        },
      ],
    }).select("_id");

    const projectIds = managedProjects.map((p) => p._id);

    // Thống kê nhân sự
    const teamStats = await Project.aggregate([
      { $match: { _id: { $in: projectIds } } },
      { $unwind: "$members" },
      {
        $group: {
          _id: "$members.user",
          projects: { $addToSet: "$_id" },
          roles: { $addToSet: "$members.role" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
    ]);

    // Thống kê công việc theo dự án
    const projectTaskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: "$project",
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "done"] },
                    { $lt: ["$dueDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
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

    // Thống kê thời gian làm việc theo dự án
    const projectTimeStats = await Timelog.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: "$project",
          totalTime: { $sum: "$duration" },
          avgTimePerTask: { $avg: "$duration" },
        },
      },
    ]);

    // Hiệu suất team
    const teamPerformance = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $unwind: "$assignees" },
      {
        $group: {
          _id: "$assignees",
          assigned: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "done"] },
                    { $lt: ["$dueDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        teamStats: {
          total: teamStats.length,
          members: teamStats,
        },
        projectStats: projectTaskStats.map((project) => ({
          project: project.projectInfo[0],
          tasks: {
            total: project.total,
            completed: project.completed,
            overdue: project.overdue,
            completionRate: (project.completed / project.total) * 100,
          },
          time: projectTimeStats.find(
            (t) => t._id.toString() === project._id.toString()
          ) || { totalTime: 0, avgTimePerTask: 0 },
        })),
        teamPerformance: teamPerformance.map((member) => ({
          user: member.userInfo[0],
          stats: {
            assigned: member.assigned,
            completed: member.completed,
            overdue: member.overdue,
            completionRate: (member.completed / member.assigned) * 100,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy manager dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy manager dashboard",
      error: error.message,
    });
  }
};

// 📌 4. Lấy dữ liệu tổng quan cho dashboard
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;
    // Kiểm tra roles trước khi truy cập để tránh lỗi
    const userRole = req.user.role || (req.user.roles && Array.isArray(req.user.roles) && req.user.roles.length > 0 
      ? req.user.roles[0] 
      : 'user'); // Giá trị mặc định nếu không có roles
    
    const isAdminUser = userRole === 'admin';
    
    console.log("=== DEBUG getDashboardData ===");
    console.log("UserId:", userId);
    console.log("User Role:", userRole);
    console.log("Is Admin?:", isAdminUser);

    // Thống kê dự án - Admin thấy tất cả dự án, người dùng khác chỉ thấy dự án liên quan
    let projectFilter = isAdminUser 
      ? {} 
      : { $or: [{ owner: userId }, { "members.user": userId }] };
    
    const projectStats = {
      total: await Project.countDocuments(projectFilter),
      active: await Project.countDocuments({
        ...projectFilter,
        status: "Đang hoạt động"
      }),
      completed: await Project.countDocuments({
        ...projectFilter,
        status: "Hoàn thành"
      }),
      closed: await Project.countDocuments({
        ...projectFilter,
        status: "Đóng"
      }),
      archived: await Project.countDocuments({
        ...projectFilter,
        isArchived: true
      })
    };
    
    console.log("Project Stats:", projectStats);

    // Thống kê công việc - Admin thấy tất cả task, người dùng khác chỉ thấy task được gán
    let taskFilter = isAdminUser 
      ? {} 
      : { assignees: userId };
    
    const taskStats = {
      total: await Task.countDocuments(taskFilter),
      completed: await Task.countDocuments({
        ...taskFilter,
        status: "done"
      }),
      inProgress: await Task.countDocuments({
        ...taskFilter,
        status: "inProgress"
      }),
      pending: await Task.countDocuments({
        ...taskFilter,
        status: "todo"
      }),
      highPriority: await Task.countDocuments({
        ...taskFilter,
        priority: { $in: ["high", "urgent"] }
      }),
      overdue: await Task.countDocuments({
        ...taskFilter,
        status: { $ne: "done" },
        dueDate: { $lt: new Date() }
      })
    };
    
    console.log("Task Stats:", taskStats);

    // Lấy các projectIds dựa trên quyền
    let projectIds = [];
    if (isAdminUser) {
      projectIds = await Project.find().distinct('_id');
    } else {
      projectIds = await Project.find({ $or: [{ owner: userId }, { "members.user": userId }] }).distinct('_id');
    }

    // Thống kê Sprint
    const sprintStats = {
      total: await Sprint.countDocuments({
        project: { $in: projectIds }
      }),
      active: await Sprint.countDocuments({
        project: { $in: projectIds },
        status: "active"
      }),
      planning: await Sprint.countDocuments({
        project: { $in: projectIds },
        status: "planning"
      }),
      completed: await Sprint.countDocuments({
        project: { $in: projectIds },
        status: "completed"
      })
    };
    
    console.log("Sprint Stats:", sprintStats);

    // Dữ liệu cho biểu đồ thời gian làm việc
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Truy vấn timelogs một cách an toàn
    let timeChartData = [];
    try {
      // Admin xem tổng thống kê thời gian của tất cả người dùng, người dùng thường chỉ xem của mình
      const timelogFilter = isAdminUser ? {} : { user: userId };
      
      // Sử dụng startTime thay vì date để phù hợp với model
      timeChartData = await Timelog.aggregate([
        {
          $match: {
            ...timelogFilter,
            startTime: { $gte: startOfWeek, $lte: today }
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: "$startTime" },
            totalHours: { $sum: "$duration" }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    } catch (timelogError) {
      console.error("Error fetching timelogs:", timelogError);
      timeChartData = []; // Đảm bảo mảng trống nếu lỗi
    }

    // Format dữ liệu cho biểu đồ
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const formattedTimeData = days.map((day, index) => {
      const dayData = timeChartData.find(d => d._id === index + 1);
      return {
        day,
        hours: dayData ? dayData.totalHours : 0
      };
    });
    
    console.log("Time Chart Data:", formattedTimeData);

    // Lấy dự án active
    let activeProject = null;
    try {
      // Admin lấy dự án active mới nhất, người dùng lấy dự án liên quan
      activeProject = await Project.findOne({
        ...(isAdminUser ? {} : { $or: [{ owner: userId }, { "members.user": userId }] }),
        status: "Đang hoạt động"
      }).sort("-updatedAt");
    } catch (projectError) {
      console.error("Error fetching active project:", projectError);
    }

    let activeSprint = null;
    let projectId = null;
    let sprintId = null;

    if (activeProject) {
      projectId = activeProject._id;
      
      try {
        // Lấy sprint active từ collection Sprint riêng biệt
        activeSprint = await Sprint.findOne({
          project: projectId,
          status: "active"
        });
        
        // Nếu không có sprint active, lấy sprint gần nhất
        if (!activeSprint) {
          activeSprint = await Sprint.findOne({
            project: projectId
          }).sort({ startDate: -1 });
        }
        
        if (activeSprint) {
          sprintId = activeSprint._id;
        }
      } catch (sprintError) {
        console.error("Error fetching active sprint:", sprintError);
      }
    }

    // Lấy tiến độ của các dự án - Admin thấy dự án mới nhất, người dùng thấy dự án liên quan
    const projectsProgress = await Project.find({
      ...(isAdminUser ? {} : { $or: [{ owner: userId }, { "members.user": userId }] }),
      isArchived: false
    })
    .select("name status progress")
    .sort("-updatedAt")
    .limit(5);
    
    console.log("Projects Progress count:", projectsProgress.length);

    // Lấy các hoạt động gần đây - Admin thấy tất cả, người dùng thấy hoạt động liên quan
    let activityFilter;
    if (isAdminUser) {
      activityFilter = {};
    } else {
      activityFilter = {
        $or: [
          { project: { $in: projectIds } },
          { user: userId }
        ]
      };
    }
    
    const recentActivities = await Activity.find(activityFilter)
      .populate("user", "name avatar")
      .populate("project", "name")
      .sort("-createdAt")
      .limit(10);
    
    console.log("Recent Activities count:", recentActivities.length);
    console.log("=== END DEBUG getDashboardData ===");

    res.json({
      success: true,
      data: {
        projectStats,
        taskStats,
        sprintStats,
        timeChartData: formattedTimeData,
        activeProject: activeProject ? {
          _id: activeProject._id,
          name: activeProject.name,
          status: activeProject.status,
          progress: activeProject.progress
        } : null,
        activeSprint: activeSprint ? {
          _id: activeSprint._id,
          name: activeSprint.name,
          status: activeSprint.status,
          startDate: activeSprint.startDate,
          endDate: activeSprint.endDate
        } : null,
        projectsProgress,
        recentActivities,
        projectId,
        sprintId
      },
      message: "Lấy dữ liệu dashboard thành công"
    });
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy dữ liệu dashboard",
      error: error.message
    });
  }
};
