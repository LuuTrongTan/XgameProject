import Comment from "../models/comment.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Project from "../models/project.model.js";
import { createNotification } from "./notification.controller.js";

// Validate dữ liệu đầu vào
const validateCommentData = (data) => {
  const errors = [];

  if (
    !data.content ||
    data.content.trim().length < 1 ||
    data.content.length > 1000
  ) {
    errors.push("Nội dung bình luận phải từ 1-1000 ký tự");
  }

  return errors;
};

// Kiểm tra quyền truy cập comment
const checkCommentPermission = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) return { error: "Bình luận không tồn tại" };

  // Kiểm tra quyền trong task/project
  if (comment.task) {
    const task = await Task.findById(comment.task).populate({
      path: "project",
      populate: { path: "members" },
    });

    if (!task) return { error: "Công việc không tồn tại" };
    const project = task.project;

    if (project.owner.toString() === userId.toString()) return { comment };
    const member = project.members.find(
      (m) => m.user.toString() === userId.toString()
    );
    if (!member) return { error: "Bạn không phải thành viên của dự án" };
  }

  return { comment };
};

// Helper function để xử lý mentions
const processMentions = (content) => {
  const mentionPattern = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    const userId = match[2];
    mentions.push(userId);
  }

  return [...new Set(mentions)];
};

// Helper function để gửi thông báo
const notifyCommentParticipants = async (comment, task, actor) => {
  const notifyUsers = new Set();
  
  // Kiểm tra các trường của task trước khi thêm vào Set
  if (task) {
    // Kiểm tra assignees
    if (task.assignees && Array.isArray(task.assignees)) {
      task.assignees.forEach(assignee => {
        if (assignee) notifyUsers.add(assignee);
      });
    }
    
    // Kiểm tra watchers
    if (task.watchers && Array.isArray(task.watchers)) {
      task.watchers.forEach(watcher => {
        if (watcher) notifyUsers.add(watcher);
      });
    }
    
    // Kiểm tra người tạo task
    if (task.createdBy) {
      notifyUsers.add(task.createdBy);
    }
  }
  
  // Thêm người được mention
  if (comment && comment.mentions && Array.isArray(comment.mentions)) {
    comment.mentions.forEach(mention => {
      if (mention) notifyUsers.add(mention);
    });
  }

  // Thêm người comment gốc nếu đây là reply
  if (comment && comment.parentComment) {
    try {
      const parentComment = await Comment.findById(comment.parentComment);
      if (parentComment && parentComment.user) {
        notifyUsers.add(parentComment.user);
      }
    } catch (error) {
      console.error("Error finding parent comment:", error);
    }
  }

  // Loại bỏ người comment
  if (actor && actor.toString) {
    notifyUsers.delete(actor.toString());
  }

  // Gửi thông báo cho từng người
  for (const userId of notifyUsers) {
    if (!userId) continue; // Bỏ qua nếu userId không tồn tại
    
    try {
      await createNotification({
        userId,
        type: comment.parentComment ? "comment_reply" : "task_commented",
        message: `${actor.name || 'Một người dùng'} đã ${
          comment.parentComment ? "trả lời bình luận" : "bình luận"
        } trong công việc "${task?.title || 'một công việc'}"`,
        link: `/tasks/${task?._id || ''}`,
        task: task?._id,
        project: task?.project,
        comment: comment?._id,
        senderId: actor?._id,
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }
};

// Thêm bình luận vào task
export const addTaskComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const errors = validateCommentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Tìm task để xác nhận tồn tại, nhưng chỉ lấy các thông tin cần thiết
    const task = await Task.findById(taskId).select('_id').lean();
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại",
      });
    }

    // Bỏ qua việc kiểm tra quyền bình luận để cho phép tất cả người dùng bình luận
    // Xử lý mentions từ nội dung
    const mentions = processMentions(req.body.content);

    // Tạo comment
    const comment = new Comment({
      content: req.body.content,
      task: taskId,
      user: req.user.id,
      mentions,
      attachments: req.body.attachments || [],
      parentComment: req.body.parentComment,
    });

    // Lưu comment
    await comment.save();

    // Lấy thông tin đầy đủ của comment, nhưng không đợi kết quả để đẩy nhanh response
    const getPopulatedComment = async () => {
      try {
        const populatedComment = await Comment.findById(comment._id)
          .populate("user", "name email avatar")
          .populate("mentions", "name email avatar")
          .populate({
            path: "parentComment",
            populate: { path: "user", select: "name email avatar" },
          });

        // Lấy thông tin đầy đủ của task để gửi thông báo
        const fullTask = await Task.findById(taskId).populate('assignees');
        
        // Gửi thông báo cho những người liên quan (thực hiện sau khi trả về response)
        if (fullTask) {
          notifyCommentParticipants(populatedComment, fullTask, req.user);
        } else {
          notifyCommentParticipants(populatedComment, { _id: taskId }, req.user);
        }

        // Gửi thông báo realtime qua socket
        if (global.io) {
          global.io.emit("new_comment", {
            taskId,
            comment: populatedComment,
            creator: {
              id: req.user.id,
              name: req.user.name,
            },
          });
        }
      } catch (error) {
        console.error("Error populating comment:", error);
      }
    };

    // Chạy hàm lấy thông tin đầy đủ và gửi thông báo mà không đợi kết quả
    getPopulatedComment();

    // Trả về response ngay lập tức với thông tin cơ bản
    const basicComment = {
      _id: comment._id,
      content: comment.content,
      task: comment.task,
      user: {
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
      },
      mentions: comment.mentions,
      attachments: comment.attachments,
      parentComment: comment.parentComment,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: "Thêm bình luận thành công",
      data: basicComment,
    });
  } catch (error) {
    console.error("Lỗi khi thêm bình luận:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm bình luận",
      error: error.message,
    });
  }
};

// Lấy danh sách bình luận
export const getComments = async (req, res) => {
  try {
    const { taskId } = req.query;
    const {
      page = 1,
      limit = 20,
      sort = "newest",
      parentOnly = true,
    } = req.query;

    // Kiểm tra task tồn tại nếu có taskId
    if (taskId) {
      const task = await Task.findById(taskId).select('_id').lean();
      if (!task) {
        return res.status(404).json({
          success: false,
          message: "Công việc không tồn tại",
        });
      }
      
      // Bỏ qua việc kiểm tra quyền truy cập để cho phép tất cả mọi người xem comment
    }

    // Xây dựng query
    const query = {
      status: "active",
    };

    if (taskId) {
      query.task = taskId;
    }

    if (parentOnly === "true") {
      query.parentComment = null;
    }

    // Xác định cách sắp xếp
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      mostLiked: { "reactions.length": -1 },
    };

    // Tìm comments
    const comments = await Comment.find(query)
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email avatar")
      .populate("mentions", "name email avatar")
      .populate({
        path: "replies",
        match: { status: "active" },
        populate: [
          { path: "user", select: "name email avatar" },
          { path: "mentions", select: "name email avatar" },
        ],
        options: { sort: { createdAt: 1 } },
      })
      .lean();

    const total = await Comment.countDocuments(query);

    // Thống kê
    const stats = {
      total,
      replies: await Comment.countDocuments({
        ...query,
        parentComment: { $ne: null },
      }),
      reactions: await Comment.aggregate([
        { $match: query },
        { $unwind: "$reactions" },
        { $group: { _id: "$reactions.type", count: { $sum: 1 } } },
      ]),
    };

    res.json({
      success: true,
      data: {
        comments,
        stats,
        pagination: {
          total,
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách bình luận:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách bình luận",
      error: error.message,
    });
  }
};

// Cập nhật bình luận
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const errors = validateCommentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    const { comment, error } = await checkCommentPermission(
      commentId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Chỉ người tạo comment mới được sửa
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa bình luận này",
      });
    }

    // Xử lý mentions mới
    const mentions = processMentions(req.body.content);

    comment.content = req.body.content;
    comment.mentions = mentions;
    comment.isEdited = true;
    comment.editHistory.push({
      content: req.body.content,
      editedBy: req.user.id,
      editedAt: new Date(),
    });

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "name email avatar")
      .populate("mentions", "name email avatar")
      .populate({
        path: "parentComment",
        populate: { path: "user", select: "name email avatar" },
      });

    // Gửi thông báo cho mentions mới
    const task = await Task.findById(comment.task);
    if (task) {
      await notifyCommentParticipants(comment, task, req.user);
    }

    // Gửi thông báo realtime
    global.io.emit("comment_updated", {
      commentId: comment._id,
      comment: populatedComment,
      updater: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật bình luận thành công",
      data: populatedComment,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật bình luận:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật bình luận",
      error: error.message,
    });
  }
};

// Xóa bình luận (soft delete)
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment, error } = await checkCommentPermission(
      commentId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Chỉ người tạo comment hoặc admin mới được xóa
    if (
      comment.user.toString() !== req.user.id &&
      !req.user.roles.includes("Admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa bình luận này",
      });
    }

    await comment.softDelete(req.user.id);

    // Nếu là comment gốc, soft delete tất cả replies
    if (!comment.parentComment) {
      await Comment.updateMany(
        { parentComment: comment._id },
        {
          $set: {
            status: "deleted",
            editHistory: {
              $push: {
                content: "Comment đã bị xóa",
                editedBy: req.user.id,
                editedAt: new Date(),
              },
            },
          },
        }
      );
    }

    // Gửi thông báo realtime
    global.io.emit("comment_deleted", {
      commentId: comment._id,
      taskId: comment.task,
      deleter: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Xóa bình luận thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa bình luận:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa bình luận",
      error: error.message,
    });
  }
};

// Thêm/xóa reaction
export const toggleReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.body;

    if (!["like", "heart", "laugh", "wow", "sad", "angry"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Loại reaction không hợp lệ",
      });
    }

    const { comment, error } = await checkCommentPermission(
      commentId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    const reactions = await comment.addReaction(req.user.id, type);

    // Thông báo cho người viết comment
    if (comment.user.toString() !== req.user.id) {
      const task = await Task.findById(comment.task);
      if (task) {
        await createNotification({
          userId: comment.user,
          type: "comment_reaction",
          message: `${req.user.name} đã bày tỏ cảm xúc ${type} với bình luận của bạn`,
          link: `/tasks/${task._id}`,
          task: task._id,
          project: task.project,
          comment: comment._id,
          senderId: req.user.id,
        });
      }
    }

    // Gửi thông báo realtime
    global.io.emit("comment_reaction_updated", {
      commentId: comment._id,
      reactions,
      reactor: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật reaction thành công",
      data: reactions,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật reaction:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật reaction",
      error: error.message,
    });
  }
};

// Thêm trả lời cho bình luận
export const addReply = async (req, res) => {
  try {
    const { commentId } = req.params;
    const errors = validateCommentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: "Bình luận gốc không tồn tại",
      });
    }

    // Xử lý mentions từ nội dung
    const mentions = processMentions(req.body.content);

    const reply = new Comment({
      content: req.body.content,
      task: parentComment.task,
      user: req.user.id,
      mentions,
      parentComment: commentId,
      attachments: req.body.attachments || [],
    });

    await reply.save();

    // Cập nhật replies trong comment gốc
    parentComment.replies.push(reply._id);
    await parentComment.save();

    const populatedReply = await Comment.findById(reply._id)
      .populate("user", "name email avatar")
      .populate("mentions", "name email avatar");

    // Gửi thông báo cho người liên quan
    const task = await Task.findById(parentComment.task);
    if (task) {
      await notifyCommentParticipants(reply, task, req.user);
    }

    // Gửi thông báo realtime
    global.io.emit("new_reply", {
      commentId,
      reply: populatedReply,
      creator: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.status(201).json({
      success: true,
      message: "Thêm trả lời thành công",
      data: populatedReply,
    });
  } catch (error) {
    console.error("Lỗi khi thêm trả lời:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm trả lời",
      error: error.message,
    });
  }
};
