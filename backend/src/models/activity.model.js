import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["project", "task", "comment", "sprint", "user", "system"],
    },
    action: {
      type: String,
      required: true,
      enum: ["created", "updated", "deleted", "completed", "archived", "restored", "assigned", "commented"],
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },
    sprint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ task: 1, createdAt: -1 });
activitySchema.index({ sprint: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity; 