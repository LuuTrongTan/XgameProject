import Upload from "../models/upload.model.js";
import multer from "multer";
import { uploadFile as uploadToCloudinary } from "../config/cloudinary.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    // Tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Lọc file theo loại
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    "image/*": ["image/jpeg", "image/png", "image/gif"],
    "video/*": ["video/mp4", "video/mpeg", "video/quicktime"],
    "audio/*": ["audio/mpeg", "audio/wav", "audio/ogg"],
    "document/*": [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  };

  let isValid = false;
  Object.values(allowedTypes).forEach((types) => {
    if (types.includes(file.mimetype)) isValid = true;
  });

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Định dạng file không được hỗ trợ"), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Helper function để phân loại file
const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  if (
    mimetype.includes("pdf") ||
    mimetype.includes("word") ||
    mimetype.includes("excel")
  )
    return "document";
  return "other";
};

// Helper function để tạo thumbnail
const generateThumbnail = async (file) => {
  if (!file.mimetype.startsWith("image/")) return null;

  const thumbnailPath = `uploads/thumbnails/${file.filename}`;
  await sharp(file.path)
    .resize(200, 200, { fit: "inside" })
    .toFile(thumbnailPath);

  return thumbnailPath;
};

// 📌 1. Upload file
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file nào được tải lên",
      });
    }

    // Upload lên Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(req.file.path);

    // Tạo thumbnail nếu là ảnh
    let thumbnailPath = null;
    if (req.file.mimetype.startsWith("image/")) {
      thumbnailPath = await generateThumbnail(req.file);
    }

    const newFile = new Upload({
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: cloudinaryUrl,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
      task: req.body.taskId || null,
      project: req.body.projectId || null,
      comment: req.body.commentId || null,
      type: getFileType(req.file.mimetype),
      permissions: req.body.permissions || "private",
      allowedUsers: req.body.allowedUsers
        ? JSON.parse(req.body.allowedUsers)
        : [],
      allowedRoles: req.body.allowedRoles
        ? JSON.parse(req.body.allowedRoles)
        : [],
      metadata: {
        extension: path.extname(req.file.originalname),
        thumbnail: thumbnailPath,
      },
    });

    await newFile.save();

    // Xóa file tạm
    fs.unlinkSync(req.file.path);
    if (thumbnailPath) fs.unlinkSync(thumbnailPath);

    res.status(201).json({
      success: true,
      message: "Tải lên thành công",
      data: await newFile.populate("uploadedBy", "name email avatar"),
    });
  } catch (error) {
    console.error("Lỗi khi tải file lên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tải file lên",
      error: error.message,
    });
  }
};

// 📌 2. Lấy danh sách file
export const getFiles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      taskId,
      projectId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    // Lọc theo loại file
    if (type) query.type = type;

    // Lọc theo task/project
    if (taskId) query.task = taskId;
    if (projectId) query.project = projectId;

    // Tìm kiếm theo tên
    if (search) {
      query.$or = [
        { filename: { $regex: search, $options: "i" } },
        { originalname: { $regex: search, $options: "i" } },
      ];
    }

    // Kiểm tra quyền truy cập
    query.$or = [
      { permissions: "public" },
      { uploadedBy: req.user.id },
      { allowedUsers: req.user.id },
      { allowedRoles: { $in: req.user.roles } },
    ];

    const files = await Upload.find(query)
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("uploadedBy", "name email avatar")
      .populate("task", "title")
      .populate("project", "name")
      .populate("comment", "content");

    const total = await Upload.countDocuments(query);

    res.json({
      success: true,
      data: {
        files,
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách file:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách file",
      error: error.message,
    });
  }
};

// 📌 3. Lấy chi tiết file
export const getFileById = async (req, res) => {
  try {
    const file = await Upload.findById(req.params.id)
      .populate("uploadedBy", "name email avatar")
      .populate("task", "title status")
      .populate("project", "name status")
      .populate("comment", "content");

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập
    if (!file.checkPermission(req.user.id, req.user.roles)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập file này",
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin file:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin file",
      error: error.message,
    });
  }
};

// 📌 4. Cập nhật thông tin file
export const updateFile = async (req, res) => {
  try {
    const file = await Upload.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại",
      });
    }

    // Kiểm tra quyền chỉnh sửa
    if (file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa file này",
      });
    }

    // Cập nhật thông tin
    const allowedUpdates = ["permissions", "allowedUsers", "allowedRoles"];
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (key === "allowedUsers" || key === "allowedRoles") {
          file[key] = JSON.parse(req.body[key]);
        } else {
          file[key] = req.body[key];
        }
      }
    });

    await file.save();

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: await file.populate([
        { path: "uploadedBy", select: "name email avatar" },
        { path: "allowedUsers", select: "name email avatar" },
      ]),
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật file:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật file",
      error: error.message,
    });
  }
};

// 📌 5. Xóa file
export const deleteFile = async (req, res) => {
  try {
    const file = await Upload.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File không tồn tại",
      });
    }

    // Kiểm tra quyền xóa
    if (
      file.uploadedBy.toString() !== req.user.id &&
      !req.user.roles.includes("Admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa file này",
      });
    }

    // Xóa file từ Cloudinary
    const publicId = file.path.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(publicId);

    // Xóa thumbnail nếu có
    if (file.metadata.thumbnail) {
      fs.unlinkSync(file.metadata.thumbnail);
    }

    await file.deleteOne();

    res.json({
      success: true,
      message: "Xóa file thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa file:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa file",
      error: error.message,
    });
  }
};

// Lấy danh sách file theo task
export const getFilesByTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const files = await Upload.find({ task: taskId })
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email avatar");

    res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách file:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách file",
      error: error.message,
    });
  }
};
