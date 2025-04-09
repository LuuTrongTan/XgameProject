import Activity from "../models/activity.model.js";

/**
 * @desc    Create a new activity
 * @route   POST /api/activities
 * @access  Private
 */
export const createActivity = async (req, res) => {
  try {
    const { type, action, title, description, project, task, sprint, metadata } = req.body;
    
    // Validate input
    if (!type || !action || !title) {
      return res.status(400).json({ 
        success: false,
        message: "Thiếu thông tin bắt buộc" 
      });
    }
    
    // Tạo activity mới
    const activity = await Activity.create({
      type,
      action,
      title,
      description,
      user: req.user._id,
      project,
      task,
      sprint,
      metadata
    });
    
    // Trả về kết quả thành công
    res.status(201).json({
      success: true,
      message: "Activity logged successfully",
      data: activity
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi tạo hoạt động" 
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
    const { limit = 20, project, task, sprint } = req.query;
    
    // Xây dựng query
    const query = { user: req.user._id };
    
    // Thêm các điều kiện lọc nếu có
    if (project) query.project = project;
    if (task) query.task = task;
    if (sprint) query.sprint = sprint;
    
    // Lấy danh sách activities
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("user", "name email avatar")
      .populate("project", "name")
      .populate("task", "title")
      .populate("sprint", "name");
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi lấy hoạt động gần đây" 
    });
  }
}; 