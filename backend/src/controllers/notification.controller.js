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
    console.log('getNotifications called');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    // Xác định userId cần lấy thông báo
    let userId;
    
    // Nếu admin đang xem thông báo của người dùng khác (qua query params userId)
    if (req.user.role === 'admin' && req.query.userId) {
      userId = req.query.userId;
      console.log('Admin viewing notifications for user:', userId);
      
      // Kiểm tra người dùng tồn tại không
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        console.log('User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
    } else {
      // Người dùng đang xem thông báo của chính họ
      userId = req.user.id;
      console.log('User viewing own notifications:', userId);
    }
    
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    console.log('Query params:', { page, limit, unreadOnly });
    
    // Tạo filter
    const filter = { user: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }
    console.log('Using filter:', filter);
    
    // Query với phân trang
    console.log('Finding notifications with skip:', (page - 1) * limit, 'limit:', parseInt(limit));
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'name avatar')
      .lean();
    
    console.log('Found notifications:', notifications.length);
    if (notifications.length > 0) {
      console.log('First notification type:', notifications[0].type);
    } else {
      console.log('No notifications found for user');
    }
    
    // Tính tổng số trang
    const totalNotifications = await Notification.countDocuments(filter);
    console.log('Total notifications count:', totalNotifications);
    const totalPages = Math.ceil(totalNotifications / limit);
    
    // Đếm số thông báo chưa đọc
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });
    console.log('Unread notifications count:', unreadCount);
    
    res.json({
      success: true,
      data: {
        notifications,
        currentPage: parseInt(page),
        totalPages,
        totalNotifications,
        unreadCount
      },
      message: 'Lấy danh sách thông báo thành công'
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thông báo',
      error: error.message
    });
  }
};

// Thêm controller mới để admin xem thông báo của người dùng khác
export const getUserNotifications = async (req, res) => {
  try {
    console.log('getUserNotifications called');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    const targetUserId = req.params.userId;
    console.log('Getting notifications for specific user:', targetUserId); 
    console.log('Request from admin:', req.user.id);
    
    if (!targetUserId) {
      console.error('User ID not found in request parameters');
      return res.status(400).json({
        success: false,
        message: 'User ID không được cung cấp'
      });
    }
    
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    console.log('Query params:', { page, limit, unreadOnly });
    
    // Kiểm tra người dùng tồn tại không
    const userExists = await User.exists({ _id: targetUserId });
    if (!userExists) {
      console.log('User not found:', targetUserId);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }
    
    // Tạo filter
    const filter = { user: targetUserId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }
    console.log('Using filter:', filter);
    
    // Query với phân trang
    console.log('Finding notifications with skip:', (page - 1) * limit, 'limit:', parseInt(limit));
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('sender', 'name avatar')
      .lean();
    
    console.log('Found notifications for specific user:', notifications.length);
    if (notifications.length > 0) {
      console.log('First notification:', notifications[0]);
    } else {
      console.log('No notifications found for user');
    }
    
    // Tính tổng số trang
    const totalNotifications = await Notification.countDocuments(filter);
    console.log('Total notifications count:', totalNotifications);
    const totalPages = Math.ceil(totalNotifications / limit);
    
    // Đếm số thông báo chưa đọc
    const unreadCount = await Notification.countDocuments({
      user: targetUserId,
      isRead: false
    });
    console.log('Unread notifications count:', unreadCount);
    
    res.json({
      success: true,
      data: {
        notifications,
        currentPage: parseInt(page),
        totalPages,
        totalNotifications,
        unreadCount
      },
      message: `Lấy danh sách thông báo của người dùng ${targetUserId} thành công`
    });
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách thông báo',
      error: error.message
    });
  }
};

// Đánh dấu đã đọc
export const markAsRead = async (req, res) => {
  try {
    console.log('markAsRead called');
    console.log('Request body:', req.body);
    
    // Xác định userId cần đánh dấu thông báo
    let userId;
    
    // Nếu admin đang thao tác trên thông báo của người dùng khác
    if (req.user.role === 'admin' && req.body.userId) {
      userId = req.body.userId;
      console.log('Admin marking notifications as read for user:', userId);
      
      // Kiểm tra người dùng tồn tại không
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        console.log('User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
    } else {
      // Người dùng đang đánh dấu thông báo của chính họ
      userId = req.user.id;
      console.log('User marking own notifications as read:', userId);
    }
    
    const { all = false, notificationIds = [] } = req.body;
    
    let updateResult;
    if (all) {
      // Đánh dấu tất cả thông báo là đã đọc
      updateResult = await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      );
      
      console.log('Marked all notifications as read for user:', userId, 'Count:', updateResult.modifiedCount);
      
      res.json({
        success: true,
        data: { modifiedCount: updateResult.modifiedCount },
        message: 'Đã đánh dấu tất cả thông báo là đã đọc'
      });
    } else if (notificationIds && notificationIds.length > 0) {
      // Đánh dấu các thông báo cụ thể là đã đọc
      updateResult = await Notification.updateMany(
        { _id: { $in: notificationIds }, user: userId },
        { isRead: true }
      );
      
      console.log('Marked specific notifications as read for user:', userId, 'Count:', updateResult.modifiedCount);
      
      res.json({
        success: true,
        data: { modifiedCount: updateResult.modifiedCount },
        message: 'Đã đánh dấu các thông báo được chọn là đã đọc'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Yêu cầu không hợp lệ. Vui lòng cung cấp notificationIds hoặc all=true'
      });
    }
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đánh dấu thông báo đã đọc',
      error: error.message
    });
  }
};

// Xóa thông báo
export const deleteNotifications = async (req, res) => {
  try {
    console.log('deleteNotifications called');
    console.log('Request body:', req.body);
    
    // Xác định userId cần xóa thông báo
    let userId;
    
    // Nếu admin đang thao tác trên thông báo của người dùng khác
    if (req.user.role === 'admin' && req.body.userId) {
      userId = req.body.userId;
      console.log('Admin deleting notifications for user:', userId);
      
      // Kiểm tra người dùng tồn tại không
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        console.log('User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
    } else {
      // Người dùng đang xóa thông báo của chính họ
      userId = req.user.id;
      console.log('User deleting own notifications:', userId);
    }
    
    const { all = false, notificationIds = [] } = req.body;
    
    let deleteResult;
    if (all) {
      // Xóa tất cả thông báo
      deleteResult = await Notification.deleteMany({ user: userId });
      
      console.log('Deleted all notifications for user:', userId, 'Count:', deleteResult.deletedCount);
      
      res.json({
        success: true,
        data: { deletedCount: deleteResult.deletedCount },
        message: 'Đã xóa tất cả thông báo'
      });
    } else if (notificationIds && notificationIds.length > 0) {
      // Xóa các thông báo cụ thể
      deleteResult = await Notification.deleteMany({
        _id: { $in: notificationIds },
        user: userId
      });
      
      console.log('Deleted specific notifications for user:', userId, 'Count:', deleteResult.deletedCount);
      
      res.json({
        success: true,
        data: { deletedCount: deleteResult.deletedCount },
        message: 'Đã xóa các thông báo được chọn'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Yêu cầu không hợp lệ. Vui lòng cung cấp notificationIds hoặc all=true'
      });
    }
  } catch (error) {
    console.error('Error in deleteNotifications:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa thông báo',
      error: error.message
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

// Lấy số lượng thông báo chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    console.log('getUnreadCount called');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    // Xác định userId cần lấy số lượng thông báo chưa đọc
    let userId;
    
    // Nếu admin đang xem thông báo của người dùng khác
    if (req.user.role === 'admin' && req.query.userId) {
      userId = req.query.userId;
      console.log('Admin getting unread count for user:', userId);
      
      // Kiểm tra người dùng tồn tại không
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        console.log('User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
    } else {
      // Người dùng đang xem thông báo của chính họ
      userId = req.user.id;
      console.log('User getting own unread count:', userId);
    }
    
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });
    
    console.log('Unread count for user', userId, ':', unreadCount);
    
    res.json({
      success: true,
      data: { unreadCount },
      message: 'Lấy số lượng thông báo chưa đọc thành công'
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy số lượng thông báo chưa đọc',
      error: error.message
    });
  }
};
