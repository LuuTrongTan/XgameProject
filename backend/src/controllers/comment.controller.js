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

  // Kiểm tra xem người dùng có phải là tác giả của comment không
  if (comment.user.toString() !== userId.toString()) {
    return { error: "Bạn không có quyền thực hiện hành động này với bình luận" };
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
    const { taskId, projectId, sprintId } = req.params;
    const errors = validateCommentData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Tìm task để xác nhận tồn tại và thuộc về project/sprint
    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      sprint: sprintId
    }).select('_id').lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại hoặc không thuộc sprint này",
      });
    }

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

    // Lấy thông tin đầy đủ của comment
    const populatedComment = await Comment.findById(comment._id)
      .populate("user", "name email avatar avatarBase64")
      .populate("mentions", "name email avatar avatarBase64")
      .populate({
        path: "parentComment",
        populate: { path: "user", select: "name email avatar avatarBase64" },
      });

    // Gửi thông báo real-time qua socket
    // 1. Emit to task room
    global.io.to(`task:${taskId}`).emit("new_comment", {
      comment: populatedComment,
      taskId: taskId,
      user: {
        id: req.user.id,
        name: req.user.name,
        avatar: req.user.avatar
      }
    });

    // 2. Emit to project room
    global.io.to(`project:${projectId}`).emit("task_comment_added", {
      taskId: taskId,
      comment: populatedComment,
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });

    // 3. Emit to sprint room
    global.io.to(`sprint:${sprintId}`).emit("task_updated", {
      taskId: taskId,
      type: "comment_added",
      data: {
        comment: populatedComment
      }
    });

    // 4. Emit to mentioned users
    if (mentions && mentions.length > 0) {
      mentions.forEach(mentionId => {
        global.io.to(mentionId.toString()).emit("mentioned_in_comment", {
          taskId: taskId,
          projectId: projectId,
          sprintId: sprintId,
          comment: populatedComment,
          mentioner: {
            id: req.user.id,
            name: req.user.name
          }
        });
      });
    }

    // Gửi thông báo cho những người liên quan
    const fullTask = await Task.findById(taskId).populate('assignees');
    if (fullTask) {
      notifyCommentParticipants(populatedComment, fullTask, req.user);
    }

    res.status(201).json({
      success: true,
      message: "Thêm bình luận thành công",
      data: populatedComment,
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
    const { taskId, projectId, sprintId } = req.params;
    const {
      page = 1,
      limit = 20,
      sort = "newest",
      parentOnly = true,
    } = req.query;

    console.log("=== Getting comments ===");
    console.log("Task ID:", taskId);
    console.log("Project ID:", projectId);
    console.log("Sprint ID:", sprintId);

    // Kiểm tra task tồn tại và thuộc về project/sprint
    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      sprint: sprintId
    }).select('_id').lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Công việc không tồn tại hoặc không thuộc sprint này",
      });
    }

    // Xây dựng query
    const query = {
      task: taskId,
      status: "active",
    };

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
      .populate("user", "name email avatar avatarBase64")
      .populate("mentions", "name email avatar avatarBase64")
      .populate({
        path: "replies",
        match: { status: "active" },
        populate: [
          { path: "user", select: "name email avatar avatarBase64" },
          { path: "mentions", select: "name email avatar avatarBase64" },
        ],
        options: { sort: { createdAt: 1 } },
      });

    // Properly populate reactions for each comment
    const populatedComments = await Promise.all(comments.map(async (comment) => {
      const commentObj = comment.toObject();
      
      // Populate reactions user data
      if (commentObj.reactions && commentObj.reactions.length > 0) {
        commentObj.reactions = await Promise.all(commentObj.reactions.map(async (reaction) => {
          if (reaction.user) {
            try {
              const user = await User.findById(reaction.user).select('name email avatar avatarBase64');
              return {
                ...reaction,
                user: user ? user : { _id: reaction.user, name: 'Unknown User' }
              };
            } catch (err) {
              console.error("Error populating reaction user:", err);
              return reaction;
            }
          }
          return reaction;
        }));
      }

      // Also populate reactions for replies
      if (commentObj.replies && commentObj.replies.length > 0) {
        commentObj.replies = await Promise.all(commentObj.replies.map(async (reply) => {
          if (reply.reactions && reply.reactions.length > 0) {
            reply.reactions = await Promise.all(reply.reactions.map(async (reaction) => {
              if (reaction.user) {
                try {
                  const user = await User.findById(reaction.user).select('name email avatar avatarBase64');
                  return {
                    ...reaction,
                    user: user ? user : { _id: reaction.user, name: 'Unknown User' }
                  };
                } catch (err) {
                  console.error("Error populating reply reaction user:", err);
                  return reaction;
                }
              }
              return reaction;
            }));
          }
          return reply;
        }));
      }
      
      return commentObj;
    }));

    const total = await Comment.countDocuments(query);

    console.log(`Found ${populatedComments.length} comments for task ${taskId}`);

    res.json({
      success: true,
      data: {
        comments: populatedComments,
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
    const { content } = req.body;

    // Kiểm tra quyền
    const { comment, error } = await checkCommentPermission(commentId, req.user.id);
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Cập nhật nội dung
    comment.content = content;
    comment.edited = true;
    await comment.save();

    res.json({
      success: true,
      message: "Đã cập nhật bình luận",
      data: comment,
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

// Xóa bình luận
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    // Kiểm tra quyền
    const { comment, error } = await checkCommentPermission(commentId, req.user.id);
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Xóa comment
    await comment.remove();

    res.json({
      success: true,
      message: "Đã xóa bình luận",
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

// Thêm/xóa reaction cho comment
export const toggleReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { type } = req.body;

    // Get user ID, handle both formats (MongoDB ObjectId and string ID)
    const userId = req.user.id || req.user._id;
    
    console.log('toggleReaction:', {
      commentId,
      type,
      userId: userId.toString(),
      userName: req.user.name
    });

    // Kiểm tra comment tồn tại
    const comment = await Comment.findById(commentId);
    if (!comment) {
      console.log(`Comment ${commentId} not found`);
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bình luận",
      });
    }

    // Kiểm tra loại reaction hợp lệ
    const validTypes = ["like", "heart"];
    if (!validTypes.includes(type)) {
      console.log(`Invalid reaction type: ${type}`);
      return res.status(400).json({
        success: false,
        message: "Loại reaction không hợp lệ",
      });
    }

    // Convert IDs to strings for comparison
    const userIdStr = userId.toString();
    
    // Tìm reaction hiện tại của user
    const existingReactionIndex = comment.reactions.findIndex(
      (r) => r.user.toString() === userIdStr && r.type === type
    );
    
    console.log('Existing reaction check:', {
      existingReactionIndex,
      currentReactions: comment.reactions.map(r => ({
        user: r.user.toString(),
        type: r.type
      }))
    });

    if (existingReactionIndex !== -1) {
      // Nếu đã có reaction thì xóa
      console.log(`Removing existing reaction from user ${userIdStr}`);
      comment.reactions.splice(existingReactionIndex, 1);
    } else {
      // Nếu chưa có thì thêm mới
      console.log(`Adding new reaction for user ${userIdStr}`);
      comment.reactions.push({
        user: userId,
        type: type,
      });
    }

    await comment.save();
    console.log('Comment saved with updated reactions');

    // Trả về comment đã được cập nhật với thông tin người dùng đầy đủ
    const updatedComment = await Comment.findById(commentId)
      .populate("user", "name email avatar avatarBase64")
      .populate("mentions", "name email avatar avatarBase64")
      .populate({
        path: "replies",
        match: { status: "active" },
        populate: [
          { path: "user", select: "name email avatar avatarBase64" },
          { path: "mentions", select: "name email avatar avatarBase64" },
        ],
        });

    // Populate reactions with user data
    const commentObj = updatedComment.toObject();
    if (commentObj.reactions && commentObj.reactions.length > 0) {
      commentObj.reactions = await Promise.all(commentObj.reactions.map(async (reaction) => {
        if (reaction.user) {
          try {
            const user = await User.findById(reaction.user).select('name email avatar avatarBase64');
            return {
              ...reaction,
              user: user ? user : { _id: reaction.user, name: 'Unknown User' }
            };
          } catch (err) {
            console.error("Error populating reaction user:", err);
            return reaction;
          }
        }
        return reaction;
      }));
    }
    
    console.log('Updated comment reactions:', commentObj.reactions);

    res.json({
      success: true,
      data: commentObj,
    });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xử lý reaction",
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
      .populate("user", "name email avatar avatarBase64")
      .populate("mentions", "name email avatar avatarBase64");

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
