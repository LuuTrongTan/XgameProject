import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attachments: [
      {
        filename: String,
        path: String,
        size: Number,
        type: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        type: {
          type: String,
          enum: ["like", "heart", "laugh", "wow", "sad", "angry"],
          default: "like",
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "deleted", "hidden"],
      default: "active",
    },
    editHistory: [
      {
        content: String,
        editedAt: {
          type: Date,
          default: Date.now,
        },
        editedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field để lấy replies
CommentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentComment",
});

// Virtual field để đếm số lượng reactions
CommentSchema.virtual("reactionCounts").get(function () {
  const counts = {};
  this.reactions.forEach((reaction) => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });
  return counts;
});

// Middleware để xử lý mentions và thông báo
CommentSchema.pre("save", async function (next) {
  try {
    if (this.isModified("content")) {
      // Lưu lịch sử chỉnh sửa
      if (!this.isNew && this.isEdited) {
        this.editHistory.push({
          content: this.content,
          editedBy: this.user,
        });
      }

      // Xử lý mentions từ nội dung
      const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions = [];
      let match;

      while ((match = mentionPattern.exec(this.content)) !== null) {
        const userId = match[2];
        if (mongoose.Types.ObjectId.isValid(userId)) {
          mentions.push(userId);
        }
      }

      this.mentions = [...new Set(mentions)];
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Methods
CommentSchema.methods.addReaction = async function (userId, reactionType) {
  try {
    // Kiểm tra xem user đã reaction chưa
    const existingReaction = this.reactions.find(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingReaction) {
      if (existingReaction.type === reactionType) {
        // Nếu reaction giống nhau thì xóa reaction
        this.reactions = this.reactions.filter(
          (r) => r.user.toString() !== userId.toString()
        );
      } else {
        // Nếu khác thì cập nhật loại reaction
        existingReaction.type = reactionType;
      }
    } else {
      // Thêm reaction mới
      this.reactions.push({
        user: userId,
        type: reactionType,
      });
    }

    await this.save();
    return this.reactions;
  } catch (error) {
    throw error;
  }
};

CommentSchema.methods.softDelete = async function (userId) {
  try {
    this.status = "deleted";
    this.editHistory.push({
      content: "Comment đã bị xóa",
      editedBy: userId,
    });
    await this.save();
    return true;
  } catch (error) {
    throw error;
  }
};

const Comment = mongoose.model("Comment", CommentSchema);
export default Comment;
