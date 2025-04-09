import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entityType",
    },
    entityType: {
      type: String,
      required: true,
      enum: ["Task", "Sprint", "Project", "Comment", "User"],
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "assign",
        "unassign",
        "attachment",
        "comment",
        "status",
        "priority",
        "tag",
        "calendar",
        "progress",
        "time",
        "assignee",
        "view"
      ],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
    },
  },
  {
    timestamps: true,
  }
);

// Đánh index theo entity và thời gian để tối ưu truy vấn
auditLogSchema.index({ entityId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ projectId: 1, createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog; 