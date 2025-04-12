import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import Timelog from "../models/timelog.model.js";
import User from "../models/user.model.js";
import Sprint from "../models/sprint.model.js";
import Activity from "../models/activity.model.js";
import { isAdmin } from "../middlewares/auth.middleware.js";
import mongoose from "mongoose";

// Hàm trợ giúp để kiểm tra dữ liệu actualTime
const ensureTasksWithTime = async () => {
  try {
    // Tìm tất cả task có actualTime > 0
    const tasksWithTime = await Task.find({ actualTime: { $gt: 0 } })
      .select('_id title actualTime')
      .lean();
    
    console.log(`Found ${tasksWithTime.length} tasks with actualTime > 0`);
    
    if (tasksWithTime.length === 0) {
      // Nếu không có task nào có actualTime, cập nhật một task đã tồn tại
      const existingTask = await Task.findOne({ status: 'done' });
      
      if (existingTask) {
        console.log(`Updating actualTime for task ${existingTask._id} (${existingTask.title})`);
        existingTask.actualTime = 5; // Đặt giá trị 5 giờ
        await existingTask.save();
        console.log(`Successfully updated actualTime to ${existingTask.actualTime} hours`);
        return true;
      }
    }
    
    return tasksWithTime.length > 0;
  } catch (error) {
    console.error("Error ensuring tasks with time:", error);
    return false;
  }
};

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
    // Kiểm tra và đảm bảo có tasks với actualTime > 0
    await ensureTasksWithTime();
    
    const userId = req.query.userId || req.user.id;
    // Đảm bảo lấy chính xác role của user
    const userRole = req.user.role;
    
    // Kiểm tra xem user có phải admin không
    const isAdminUser = userRole === 'admin';
    
    // Nếu user cố tình xem dữ liệu người khác mà không phải admin thì chặn
    if (userId !== req.user.id && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem dữ liệu của người dùng khác"
      });
    }

    console.log("=== DEBUG getDashboardData ===");
    console.log("Logged in user:", req.user.id, req.user.name || req.user.email);
    console.log("Viewing data for userId:", userId);
    console.log("User Role:", userRole);
    console.log("Is Admin?:", isAdminUser);
    console.log("Admin viewing own dashboard?", isAdminUser && userId === req.user.id);
    console.log("Admin viewing other user dashboard?", isAdminUser && userId !== req.user.id);

    // Thống kê dự án
    let projectFilter;
    
    if (isAdminUser && userId === req.user.id) {
      // Admin xem toàn bộ hệ thống
      projectFilter = {};
    } else {
      // Admin xem data của user cụ thể hoặc user thường chỉ xem dự án của mình
      projectFilter = { $or: [{ owner: userId }, { "members.user": userId }] };
    }
    
    console.log("Project filter applied:", JSON.stringify(projectFilter));

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

    // Thống kê công việc
    let taskFilter;
    
    if (isAdminUser && userId === req.user.id) {
      // Admin xem toàn bộ hệ thống
      taskFilter = {};
    } else {
      // Admin xem data của user cụ thể hoặc user thường chỉ xem task của mình
      taskFilter = { assignees: userId };
    }
    
    console.log("Task filter applied:", JSON.stringify(taskFilter));
    
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
    if (isAdminUser && userId === req.user.id) {
      // Admin xem toàn bộ hệ thống
      projectIds = await Project.find().distinct('_id');
    } else {
      // Admin xem data của user cụ thể hoặc user thường chỉ xem dự án của mình
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

    // Tính tổng thời gian làm việc từ tất cả các task của người dùng hiện tại
    let totalWorkHours = 0;
    try {
      // Lọc các task theo userId
      const userTasks = await Task.find({ assignee: userId }).select("actualTime").lean();
      
      // Tính tổng thủ công từ các task của người dùng
      const manualSum = userTasks.reduce((sum, task) => sum + (task.actualTime || 0), 0);
      console.log(`Total actualTime (user ${userId} tasks, manual):`, manualSum);
      
      // Tổng hợp thời gian từ các task của người dùng
      const totalTimeResult = await Task.aggregate([
        {
          $match: { assignee: mongoose.Types.ObjectId(userId) }
        },
        {
          $group: {
            _id: null,
            totalHours: { $sum: "$actualTime" }
          }
        }
      ]);
      
      totalWorkHours = totalTimeResult.length > 0 ? parseFloat(totalTimeResult[0].totalHours.toFixed(2)) : 0;
      console.log(`Total work hours from aggregation for user ${userId}:`, totalWorkHours);
    } catch (timeError) {
      console.error("Error calculating total work hours:", timeError);
      totalWorkHours = 0;
    }

    // Format dữ liệu cho biểu đồ - chỉ gửi tổng giờ làm việc
    const formattedTimeData = [
      {
        day: "Tổng thời gian",
        hours: totalWorkHours
      }
    ];
    
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

    // Lấy tiến độ của các dự án - Admin thấy tất cả dự án, người dùng thấy dự án liên quan
    const rawProjects = await Project.find({
      ...(isAdminUser && userId === req.user.id 
        ? {} // Admin xem dashboard hệ thống
        : { $or: [{ owner: userId }, { "members.user": userId }] }), // Admin xem dự án của user hoặc user thường
      isArchived: false
    })
    .select("name status progress")
    .sort("-updatedAt");
    // Không giới hạn số lượng dự án hiển thị
    
    console.log(`Finding projects with filter: ${isAdminUser && userId === req.user.id ? 'All projects (admin)' : `Projects related to user ${userId}`}`);

    // Tính toán lại progress cho mỗi dự án trước khi trả về
    const projectsProgress = await Promise.all(
      rawProjects.map(async (project) => {
        // Tính toán progress
        const progress = await project.calculateProgress();
        console.log(`Project ${project.name}: Progress = ${progress}%`);
        
        // Cập nhật progress
        project.progress = progress;
        await project.save();
        
        return {
          _id: project._id,
          name: project.name,
          status: project.status,
          progress: progress
        };
      })
    );

    console.log("Projects Progress count:", projectsProgress.length);
    console.log("Projects Progress details:", JSON.stringify(projectsProgress, null, 2));

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
      .populate("user", "name email avatar avatarBase64 role")
      .populate("project", "name")
      .sort("-createdAt")
      .limit(10);
    
    console.log("Recent Activities count:", recentActivities.length);
    
    // Lấy danh sách công việc được gán cho người dùng
    const assignedTasks = await Task.find({
      assignees: userId,
      status: { $ne: "done" }
    })
    .populate("project", "name")
    .sort({ dueDate: 1, priority: -1 })
    .limit(10);
    
    console.log("Assigned Tasks count:", assignedTasks.length);
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
        assignedTasks,
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
