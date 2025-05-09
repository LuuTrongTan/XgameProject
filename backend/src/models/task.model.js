import mongoose from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 2000,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["todo", "inProgress", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    tags: [String],
    estimatedTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: Date,
    startDate: Date,
    completedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    subtasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    dependencies: [
      {
        task: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Task",
        },
        type: {
          type: String,
          enum: ["blocks", "is_blocked_by", "relates_to"],
          default: "relates_to",
        },
      },
    ],
    attachments: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId()
        },
        name: {
          type: String,
          default: ''
        },
        filename: {
          type: String,
          required: true
        },
        url: {
          type: String,
          required: true
        },
        path: {
          type: String,
          required: true
        },
        type: {
        type: String,
          default: 'application/octet-stream'
        },
        size: {
          type: Number,
          default: 0
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        },
        uploadId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Upload",
        },
        accessControl: {
          public: {
            type: Boolean,
            default: true
          },
          permissions: [{
            type: String,
            enum: ["read", "write", "delete"]
          }]
        }
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
        options: [String],
      },
    ],
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project.milestones",
    },
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    position: {
      type: Number,
      default: 0
    },
    // Calendar synchronization fields
    syncWithCalendar: {
      type: Boolean,
      default: false
    },
    calendarType: {
      type: String,
      enum: ['google', 'outlook', null],
      default: null
    },
    googleCalendarEventId: {
      type: String,
      default: null
    },
    outlookCalendarEventId: {
      type: String,
      default: null
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
TaskSchema.index({ project: 1, status: 1 });
TaskSchema.index({ sprint: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ parent: 1 });
TaskSchema.index({ "dependencies.task": 1 });
TaskSchema.index({ status: 1, position: 1 });

// Virtual fields
TaskSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "task",
});

TaskSchema.virtual("timelogs", {
  ref: "Timelog",
  localField: "_id",
  foreignField: "task",
});

// Middleware
TaskSchema.pre("save", async function (next) {
  try {
    if (
      this.isModified("status") &&
      this.status === "done" &&
      !this.completedAt
    ) {
      this.completedAt = new Date();
    }

    if ((this.isNew || (this.isModified("status") && !this.isModified("actualTime")))) {
      const timelogs = await this.model("Timelog").find({ task: this._id });
      const timelogsTotal = timelogs.reduce(
        (total, log) => total + (log.duration || 0),
        0
      );
      
      console.log(`[Task=${this._id}] Updating actualTime from timelogs. Current: ${this.actualTime}, From timelogs: ${timelogsTotal}`);
      
      if (this.isNew || !this.isModified("actualTime")) {
        this.actualTime = timelogsTotal;
      }
    }

    if (this.subtasks && this.subtasks.length > 0) {
      const subtasks = await this.model("Task").find({
        _id: { $in: this.subtasks },
      });
      const completedSubtasks = subtasks.filter(
        (task) => task.status === "done"
      ).length;
      this.progress = Math.round((completedSubtasks / subtasks.length) * 100);
    } else {
      switch (this.status) {
        case "todo":
          this.progress = 0;
          break;
        case "inProgress":
          this.progress = 50;
          break;
        case "done":
          this.progress = 100;
          break;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Methods
TaskSchema.methods.addComment = async function (userId, content) {
  try {
    const comment = new (this.model("Comment"))({
      task: this._id,
      user: userId,
      content: content,
    });
    await comment.save();
    return comment;
  } catch (error) {
    throw error;
  }
};

TaskSchema.methods.addTimelog = async function (userId, data) {
  try {
    const timelog = new (this.model("Timelog"))({
      task: this._id,
      user: userId,
      ...data,
    });
    await timelog.save();

    this.actualTime += timelog.duration || 0;
    await this.save();

    return timelog;
  } catch (error) {
    throw error;
  }
};

TaskSchema.methods.checkDependencies = async function () {
  try {
    const blockers = this.dependencies.filter(
      (d) => d.type === "is_blocked_by"
    );
    if (blockers.length === 0) return { canStart: true };

    const blockerTasks = await this.model("Task").find({
      _id: { $in: blockers.map((b) => b.task) },
    });

    const pendingBlockers = blockerTasks.filter(
      (task) => task.status !== "done"
    );
    return {
      canStart: pendingBlockers.length === 0,
      pendingBlockers: pendingBlockers,
    };
  } catch (error) {
    throw error;
  }
};

const Task = mongoose.model("Task", TaskSchema);
export default Task;
