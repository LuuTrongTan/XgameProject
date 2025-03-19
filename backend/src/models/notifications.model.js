import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        // Task notifications
        "task_assigned", // Được gán task mới
        "task_updated", // Task được cập nhật
        "task_commented", // Có comment mới trên task
        "task_mentioned", // Được mention trong comment
        "task_status", // Trạng thái task thay đổi
        "task_due_soon", // Task sắp đến hạn (1 ngày)
        "task_overdue", // Task quá hạn
        "task_completed", // Task hoàn thành
        "task_dependency", // Task dependency thay đổi
        "task_attachment", // Có file đính kèm mới

        // Project notifications
        "project_role", // Thay đổi role trong project
        "project_removed", // Bị xóa khỏi project
        "project_invitation", // Được mời vào project
        "project_status", // Trạng thái project thay đổi
        "project_milestone", // Milestone được cập nhật
        "project_document", // Tài liệu mới được thêm vào

        // Comment notifications
        "comment_reply", // Có reply cho comment
        "comment_reaction", // Có reaction mới cho comment

        // System notifications
        "system_maintenance", // Thông báo bảo trì hệ thống
        "system_update", // Cập nhật tính năng mới
      ],
      required: true,
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    link: { type: String }, // Đường dẫn đến task/project liên quan
    task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Người tạo thông báo
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    emailSent: { type: Boolean, default: false },
    pushSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Tự động đánh dấu là đã đọc sau 30 ngày
NotificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
  }
);

// Index cho tìm kiếm và filter
NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ user: 1, type: 1 });
NotificationSchema.index({ task: 1 });
NotificationSchema.index({ project: 1 });

// Methods
NotificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  await this.save();
  return this;
};

NotificationSchema.methods.archive = async function () {
  this.isArchived = true;
  await this.save();
  return this;
};

NotificationSchema.methods.sendEmail = async function () {
  try {
    if (this.emailSent) return false;

    // TODO: Implement email sending logic here
    // const emailSent = await EmailService.send({
    //   to: this.user.email,
    //   subject: this.type,
    //   message: this.message,
    //   link: this.link
    // });

    this.emailSent = true;
    await this.save();
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi email thông báo:", error);
    return false;
  }
};

NotificationSchema.methods.sendPushNotification = async function () {
  try {
    if (this.pushSent) return false;

    // TODO: Implement push notification logic here
    // const pushSent = await PushService.send({
    //   userId: this.user,
    //   title: this.type,
    //   body: this.message,
    //   link: this.link
    // });

    this.pushSent = true;
    await this.save();
    return true;
  } catch (error) {
    console.error("Lỗi khi gửi push notification:", error);
    return false;
  }
};

// Statics
NotificationSchema.statics.createAndNotify = async function (data) {
  try {
    const notification = new this(data);
    await notification.save();

    // Gửi email nếu user bật thông báo qua email
    const user = await mongoose.model("User").findById(data.user);
    if (user && user.emailNotifications) {
      await notification.sendEmail();
    }

    // Gửi push notification
    await notification.sendPushNotification();

    return notification;
  } catch (error) {
    console.error("Lỗi khi tạo và gửi thông báo:", error);
    throw error;
  }
};

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;
