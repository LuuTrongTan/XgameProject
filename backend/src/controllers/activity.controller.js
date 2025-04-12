import Activity from "../models/activity.model.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

/**
 * @desc    Create a new activity
 * @route   POST /api/activities
 * @access  Private
 */
export const createActivity = async (req, res) => {
  try {
    const { type, action, title, description, projectId, taskId, sprintId, metadata } = req.body;
    
    const activity = new Activity({
      type,
      action,
      title,
      description,
      user: req.user.id,
      project: projectId,
      task: taskId,
      sprint: sprintId,
      metadata
    });
    
    await activity.save();
    
    // Emit socket event
    const eventTarget = taskId ? `task:${taskId}` : 
                       projectId ? `project:${projectId}` : 
                       sprintId ? `sprint:${sprintId}` : null;
    
    if (eventTarget) {
      global.io.to(eventTarget).emit('activity', { activity });
    }
    
    res.status(201).json({
      success: true,
      data: activity,
      message: 'Hoạt động đã được ghi lại'
    });
  } catch (error) {
    console.error('Error in createActivity:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo hoạt động',
      error: error.message
    });
  }
};

/**
 * @desc    Get recent activities
 * @route   GET /api/activities/recent
 * @access  Private
 */
export const getRecentActivities = async (req, res) => {
  try {
    const { limit = 50, userId, projectId, taskId, sprintId } = req.query;

    // Xây dựng query filter
    const filter = {};
    
    // Nếu có userId và người dùng là admin hoặc đang xem hoạt động của chính mình
    if (userId && (isAdmin(req.user) || userId === req.user.id)) {
      filter.user = userId;
    } else if (!isAdmin(req.user)) {
      // Nếu không phải admin, chỉ xem hoạt động của mình
      filter.user = req.user.id;
    }
    
    // Filter theo project, task hoặc sprint nếu có
    if (projectId) filter.project = projectId;
    if (taskId) filter.task = taskId;
    if (sprintId) filter.sprint = sprintId;
    
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('user', 'name avatar')
      .populate('project', 'name')
      .populate('task', 'title')
      .populate('sprint', 'name')
      .lean();
    
    res.json({
      success: true,
      data: activities,
      message: 'Lấy danh sách hoạt động thành công'
    });
  } catch (error) {
    console.error('Error in getRecentActivities:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy hoạt động gần đây',
      error: error.message
    });
  }
}; 