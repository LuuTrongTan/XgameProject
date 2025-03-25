import mongoose from "mongoose";
import { ROLES } from "../config/constants.js";

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["Đang hoạt động", "Hoàn thành", "Đóng"],
      default: "Đang hoạt động",
    },
    avatar: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: Object.values(ROLES),
          default: ROLES.MEMBER,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
    documents: [
      {
        name: String,
        path: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: Date,
        permissions: {
          type: String,
          enum: ["all", "admin_only", "custom"],
          default: "all",
        },
        allowedRoles: [
          {
            type: String,
            enum: Object.values(ROLES),
          },
        ],
        allowedUsers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
        version: {
          type: Number,
          default: 1,
        },
        size: Number,
        type: String,
        description: String,
      },
    ],

    startDate: Date,
    endDate: Date,
    completedAt: Date,

    milestones: [
      {
        name: String,
        description: String,
        dueDate: Date,
        completedAt: Date,
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed"],
          default: "Pending",
        },
      },
    ],
    customFields: [
      {
        name: String,
        type: {
          type: String,
          enum: ["text", "number", "date", "boolean", "select"],
          default: "text",
        },
        value: mongoose.Schema.Types.Mixed,
        options: [String], // For select type
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field để lấy tasks
ProjectSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "project",
});

// Methods để lấy thống kê tasks
ProjectSchema.methods.getTaskStats = async function () {
  try {
    const tasks = await this.model("Task").find({ project: this._id });
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
  } catch (error) {
    console.error("Lỗi khi lấy thống kê task:", error);
    return {
      total: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };
  }
};

// Method để tính tiến độ dự án
ProjectSchema.methods.calculateProgress = async function () {
  try {
    const tasks = await this.model("Task").find({ project: this._id });
    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter((t) => t.status === "done").length;
    return Math.round((completedTasks / tasks.length) * 100);
  } catch (error) {
    console.error("Lỗi khi tính tiến độ dự án:", error);
    return 0;
  }
};

// Kiểm tra quyền truy cập document
ProjectSchema.methods.canAccessDocument = function (userId, documentId) {
  const document = this.documents.id(documentId);
  if (!document) return false;

  // Owner luôn có quyền truy cập
  if (this.owner.toString() === userId.toString()) return true;

  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (!member) return false;

  // Kiểm tra permissions
  switch (document.permissions) {
    case "all":
      return true;
    case "admin_only":
      return (
        member.role === ROLES.ADMIN || member.role === ROLES.PROJECT_MANAGER
      );
    case "custom":
      return (
        document.allowedRoles.includes(member.role) ||
        document.allowedUsers.some((u) => u.toString() === userId.toString())
      );
    default:
      return false;
  }
};

// Thêm các phương thức mới
ProjectSchema.methods.getMemberStats = async function () {
  try {
    const tasks = await this.model("Task")
      .find({ project: this._id })
      .populate("assignees");
    const memberStats = {};

    this.members.forEach((member) => {
      memberStats[member.user] = {
        totalTasks: 0,
        completedTasks: 0,
        totalTime: 0,
      };
    });

    tasks.forEach((task) => {
      task.assignees.forEach((assignee) => {
        if (memberStats[assignee._id]) {
          memberStats[assignee._id].totalTasks++;
          if (task.status === "done") {
            memberStats[assignee._id].completedTasks++;
          }
        }
      });
    });

    // Tính tổng thời gian làm việc
    const timelogs = await this.model("Timelog").find({
      task: { $in: tasks.map((t) => t._id) },
    });

    timelogs.forEach((log) => {
      if (memberStats[log.user]) {
        memberStats[log.user].totalTime += log.duration || 0;
      }
    });

    return memberStats;
  } catch (error) {
    console.error("Lỗi khi lấy thống kê thành viên:", error);
    return {};
  }
};

ProjectSchema.methods.getBurndownData = async function () {
  try {
    const tasks = await this.model("Task")
      .find({
        project: this._id,
        createdAt: { $gte: this.startDate, $lte: this.endDate },
      })
      .sort("createdAt");

    const burndown = {
      dates: [],
      ideal: [],
      actual: [],
    };

    let totalTasks = tasks.length;
    let remainingTasks = totalTasks;
    let currentDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);

    while (currentDate <= endDate) {
      burndown.dates.push(new Date(currentDate));

      // Tính toán đường lý tưởng
      const daysFromStart = Math.floor(
        (currentDate - this.startDate) / (1000 * 60 * 60 * 24)
      );
      const totalDays = Math.floor(
        (this.endDate - this.startDate) / (1000 * 60 * 60 * 24)
      );
      const idealRemaining =
        totalTasks - totalTasks * (daysFromStart / totalDays);
      burndown.ideal.push(idealRemaining);

      // Tính toán đường thực tế
      const completedTasks = tasks.filter(
        (task) => task.completedAt && task.completedAt <= currentDate
      ).length;
      burndown.actual.push(totalTasks - completedTasks);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return burndown;
  } catch (error) {
    console.error("Lỗi khi tạo dữ liệu burndown chart:", error);
    return null;
  }
};

// Thêm phương thức kiểm tra quyền của thành viên
ProjectSchema.methods.checkMemberPermission = function (userId, permission) {
  // Owner có tất cả quyền
  if (this.owner.toString() === userId.toString()) return true;

  const member = this.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  if (!member) return false;

  // Admin và Project Manager có tất cả quyền
  if (member.role === ROLES.ADMIN || member.role === ROLES.PROJECT_MANAGER)
    return true;

  // Kiểm tra quyền cụ thể của thành viên
  return member.permissions.includes(permission);
};

const Project = mongoose.model("Project", ProjectSchema);
export default Project;
