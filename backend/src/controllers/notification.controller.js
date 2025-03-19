import Notification from "../models/notifications.model.js";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Project from "../models/project.model.js";
import nodemailer from "nodemailer";

// Tạo và gửi thông báo
export const createNotification = async (data) => {
  try {
    // Kiểm tra user preferences
    const user = await User.findById(data.userId);
    if (!user) throw new Error("Không tìm thấy người dùng");

    // Kiểm tra preferences cho loại thông báo
    const shouldNotify = {
      inApp: user.notificationPreferences?.inApp?.[data.type] !== false,
      email: user.notificationPreferences?.email?.[data.type] !== false,
    };

    if (!shouldNotify.inApp && !shouldNotify.email) {
      return null; // User đã tắt cả thông báo cho loại này
    }

    // Tạo thông báo mới
    const notification = new Notification({
      user: data.userId,
      type: data.type,
      message: data.message,
      link: data.link,
      task: data.taskId,
      project: data.projectId,
      comment: data.commentId,
      sender: data.senderId,
      priority: data.priority || "medium",
      metadata: data.metadata,
    });

    await notification.save();

    // Gửi thông báo realtime qua socket
    if (shouldNotify.inApp) {
      global.io.to(data.userId.toString()).emit("new_notification", {
        notification: await notification.populate([
          { path: "task", select: "title" },
          { path: "project", select: "name" },
          { path: "sender", select: "name avatar" },
        ]),
        type: data.type,
      });
    }

    // Gửi email nếu user bật thông báo email
    if (shouldNotify.email) {
      await sendEmailNotification(user.email, data.type, {
        subject: getNotificationSubject(data.type),
        message: data.message,
        link: data.link,
      });
    }

    return notification;
  } catch (error) {
    console.error("Lỗi khi tạo thông báo:", error);
    throw error;
  }
};

// Lấy danh sách thông báo
export const getNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type,
      priority,
      startDate,
      endDate,
    } = req.query;

    const query = { user: req.user.id };

    // Lọc theo trạng thái đã đọc
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    // Lọc theo loại thông báo
    if (type) {
      query.type = type;
    }

    // Lọc theo độ ưu tiên
    if (priority) {
      query.priority = priority;
    }

    // Lọc theo thời gian
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("task", "title status")
      .populate("project", "name status")
      .populate("sender", "name avatar")
      .populate("comment", "content");

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    // Thống kê theo loại thông báo
    const stats = await Notification.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        stats: stats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông báo",
      error: error.message,
    });
  }
};

// Đánh dấu đã đọc
export const markAsRead = async (req, res) => {
  try {
    const { notificationIds, all = false } = req.body;

    if (all) {
      // Đánh dấu tất cả thông báo
      await Notification.updateMany(
        { user: req.user.id, isRead: false },
        { isRead: true }
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Đánh dấu các thông báo cụ thể
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          user: req.user.id,
        },
        { isRead: true }
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn thông báo cần đánh dấu",
      });
    }

    // Gửi event cập nhật badge count
    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });
    global.io.to(req.user.id.toString()).emit("notifications_updated", {
      unreadCount,
    });

    res.json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc",
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Lỗi khi đánh dấu thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi đánh dấu thông báo",
      error: error.message,
    });
  }
};

// Xóa thông báo
export const deleteNotification = async (req, res) => {
  try {
    const { notificationIds, all = false } = req.body;

    if (all) {
      // Xóa tất cả thông báo
      await Notification.deleteMany({ user: req.user.id });
    } else if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn thông báo cần xóa",
      });
    } else {
      // Xóa các thông báo được chọn
      await Notification.deleteMany({
        _id: { $in: notificationIds },
        user: req.user.id,
      });
    }

    res.json({
      success: true,
      message: "Đã xóa thông báo thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa thông báo:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa thông báo",
      error: error.message,
    });
  }
};

// Gửi email thông báo
export const sendEmailNotification = async (email, type, data) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailTemplate = getEmailTemplate(type, data);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: data.subject,
      html: emailTemplate,
    });

    console.log("Email thông báo đã được gửi đến", email);
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    return false;
  }
};

// Kiểm tra và gửi thông báo task sắp đến hạn
export const checkDueTasks = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueTasks = await Task.find({
      dueDate: {
        $gte: new Date(),
        $lte: tomorrow,
      },
      status: { $ne: "done" },
    }).populate("assignees project");

    for (const task of dueTasks) {
      // Gửi thông báo cho người được gán
      for (const assignee of task.assignees) {
        await createNotification({
          userId: assignee._id,
          type: "task_due_soon",
          message: `Task "${task.title}" sẽ đến hạn trong vòng 24h`,
          taskId: task._id,
          projectId: task.project._id,
          priority: "high",
          metadata: {
            dueDate: task.dueDate,
            projectName: task.project.name,
          },
        });
      }

      // Gửi thông báo cho người tạo task
      if (task.createdBy) {
        await createNotification({
          userId: task.createdBy,
          type: "task_due_soon",
          message: `Task "${task.title}" bạn tạo sẽ đến hạn trong vòng 24h`,
          taskId: task._id,
          projectId: task.project._id,
          priority: "medium",
          metadata: {
            dueDate: task.dueDate,
            projectName: task.project.name,
          },
        });
      }
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra task đến hạn:", error);
  }
};

// Kiểm tra và gửi thông báo task quá hạn
export const checkOverdueTasks = async () => {
  try {
    const overdueTasks = await Task.find({
      dueDate: { $lt: new Date() },
      status: { $ne: "done" },
    }).populate("assignees project");

    for (const task of overdueTasks) {
      // Gửi thông báo cho người được gán
      for (const assignee of task.assignees) {
        await createNotification({
          userId: assignee._id,
          type: "task_overdue",
          message: `Task "${task.title}" đã quá hạn`,
          taskId: task._id,
          projectId: task.project._id,
          priority: "urgent",
          metadata: {
            dueDate: task.dueDate,
            projectName: task.project.name,
            overdueDays: Math.floor(
              (new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)
            ),
          },
        });
      }

      // Gửi thông báo cho project manager
      const project = await Project.findById(task.project._id).populate(
        "members"
      );
      const projectManagers = project.members.filter(
        (m) => m.role === "Project Manager"
      );

      for (const manager of projectManagers) {
        await createNotification({
          userId: manager.user,
          type: "task_overdue",
          message: `Task "${task.title}" trong dự án của bạn đã quá hạn`,
          taskId: task._id,
          projectId: task.project._id,
          priority: "high",
          metadata: {
            dueDate: task.dueDate,
            projectName: task.project.name,
            overdueDays: Math.floor(
              (new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24)
            ),
          },
        });
      }
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra task quá hạn:", error);
  }
};

// Helper function để lấy tiêu đề email theo loại thông báo
const getNotificationSubject = (type) => {
  const subjects = {
    task_assigned: "Bạn được gán một công việc mới",
    task_updated: "Công việc đã được cập nhật",
    task_commented: "Có bình luận mới trong công việc",
    task_mentioned: "Bạn được nhắc đến trong một bình luận",
    task_status: "Trạng thái công việc đã thay đổi",
    task_due_soon: "Công việc sắp đến hạn",
    task_overdue: "Công việc đã quá hạn",
    project_role: "Vai trò của bạn trong dự án đã thay đổi",
    project_invitation: "Bạn được mời tham gia dự án mới",
    comment_reply: "Có người trả lời bình luận của bạn",
    comment_reaction: "Có người bày tỏ cảm xúc với bình luận của bạn",
  };

  return subjects[type] || "Thông báo mới";
};

// Helper function để tạo template email
const getEmailTemplate = (type, data) => {
  const baseTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${data.subject}</h2>
      <p style="color: #666; font-size: 16px;">${data.message}</p>
      ${
        data.link
          ? `<a href="${data.link}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Xem chi tiết</a>`
          : ""
      }
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
      <p style="color: #999; font-size: 12px;">Email này được gửi tự động, vui lòng không trả lời.</p>
    </div>
  `;

  return baseTemplate;
};
