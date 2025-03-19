import mongoose from "mongoose";
import { ROLES } from "../config/constants.js";

const uploadSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    type: {
      type: String,
      enum: ["document", "image", "video", "audio", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["uploading", "completed", "failed"],
      default: "completed",
    },
    metadata: {
      width: Number, // For images
      height: Number, // For images
      duration: Number, // For audio/video
      pages: Number, // For documents
      extension: String,
      thumbnail: String,
    },
    permissions: {
      type: String,
      enum: ["public", "private", "restricted"],
      default: "private",
    },
    allowedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    allowedRoles: [String],
    version: {
      type: Number,
      default: 1,
    },
    previousVersions: [
      {
        filename: String,
        path: String,
        version: Number,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
uploadSchema.index({ task: 1 });
uploadSchema.index({ project: 1 });
uploadSchema.index({ uploadedBy: 1 });
uploadSchema.index({ type: 1 });

// Virtual fields
uploadSchema.virtual("url").get(function () {
  return `/uploads/${this._id}/${this.filename}`;
});

uploadSchema.virtual("thumbnailUrl").get(function () {
  if (this.metadata && this.metadata.thumbnail) {
    return `/uploads/thumbnails/${this.metadata.thumbnail}`;
  }
  return null;
});

// Methods
uploadSchema.methods.generateThumbnail = async function () {
  try {
    if (!this.mimetype.startsWith("image/")) return null;

    // TODO: Implement thumbnail generation logic here
    // const thumbnail = await ImageService.generateThumbnail(this.path);
    // this.metadata.thumbnail = thumbnail;
    // await this.save();

    return this.metadata.thumbnail;
  } catch (error) {
    console.error("Lỗi khi tạo thumbnail:", error);
    return null;
  }
};

uploadSchema.methods.updateVersion = async function (newFileData) {
  try {
    // Lưu version hiện tại vào history
    this.previousVersions.push({
      filename: this.filename,
      path: this.path,
      version: this.version,
      uploadedBy: this.uploadedBy,
      uploadedAt: this.updatedAt,
    });

    // Cập nhật thông tin file mới
    this.filename = newFileData.filename;
    this.originalname = newFileData.originalname;
    this.path = newFileData.path;
    this.mimetype = newFileData.mimetype;
    this.size = newFileData.size;
    this.version += 1;
    this.uploadedBy = newFileData.uploadedBy;

    // Tạo thumbnail mới nếu là ảnh
    if (this.mimetype.startsWith("image/")) {
      await this.generateThumbnail();
    }

    await this.save();
    return this;
  } catch (error) {
    console.error("Lỗi khi cập nhật version:", error);
    throw error;
  }
};

uploadSchema.methods.checkPermission = function (userId, userRoles) {
  // Public files are accessible to everyone
  if (this.permissions === "public") return true;

  // Check if user is the owner
  if (this.uploadedBy.toString() === userId.toString()) return true;

  // Check if user is in allowed users list
  if (this.allowedUsers.some((u) => u.toString() === userId.toString()))
    return true;

  // Check if user has an allowed role
  if (userRoles.some((role) => this.allowedRoles.includes(role))) return true;

  return false;
};

const Upload = mongoose.model("Upload", uploadSchema);
export default Upload;
