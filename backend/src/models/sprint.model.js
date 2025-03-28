import mongoose from "mongoose";

const sprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên sprint là bắt buộc"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Mô tả sprint là bắt buộc"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Ngày bắt đầu là bắt buộc"],
    },
    endDate: {
      type: Date,
      required: [true, "Ngày kết thúc là bắt buộc"],
      validate: {
        validator: function (endDate) {
          return endDate > this.startDate;
        },
        message: "Ngày kết thúc phải sau ngày bắt đầu",
      },
    },
    status: {
      type: String,
      enum: ["planning", "active", "completed"],
      default: "planning",
    },
    goal: {
      type: String,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project ID là bắt buộc"],
    },
    tasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          default: "member",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index để tối ưu truy vấn
sprintSchema.index({ project: 1 });
sprintSchema.index({ status: 1 });
// Index để tìm kiếm thành viên nhanh hơn
sprintSchema.index({ "members.user": 1 });

// Middleware để kiểm tra ngày kết thúc
sprintSchema.pre("save", function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error("Ngày kết thúc phải sau ngày bắt đầu"));
  }
  next();
});

const Sprint = mongoose.model("Sprint", sprintSchema);

export default Sprint;
