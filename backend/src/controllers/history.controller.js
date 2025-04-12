import Activity from '../models/activity.model.js';
import Project from '../models/project.model.js';
import Task from '../models/task.model.js';
import User from '../models/user.model.js';
import { isAdmin } from '../middlewares/auth.middleware.js';

// Lấy lịch sử hoạt động của người dùng hiện tại
export const getUserHistory = async (req, res) => {
  try {
    console.log('getUserHistory called');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    // Xác định userId cần lấy lịch sử
    let userId;
    
    // Nếu admin đang xem lịch sử của người dùng khác (qua query params userId)
    if (req.user.role === 'admin' && req.query.userId) {
      userId = req.query.userId;
      console.log('Admin viewing history for user:', userId);
    } else {
      // Người dùng đang xem lịch sử của chính họ
      userId = req.user.id;
      console.log('User viewing own history:', userId);
    }
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Nếu là admin xem lịch sử của người dùng khác, kiểm tra người dùng tồn tại
    if (req.user.role === 'admin' && req.query.userId) {
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        console.log('User not found:', userId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
    }
    
    console.log('Finding activities for user:', userId, 'with skip:', skip, 'limit:', parseInt(limit));
    const activities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('project', 'name status description')
      .populate('task', 'title status priority dueDate')
      .populate('sprint', 'name startDate endDate')
      .populate('user', 'name avatar email')
      .exec();

    console.log('Found activities:', activities.length);
    if (activities.length > 0) {
      console.log('Activity types:', activities.map(a => a.type).join(', '));
    } else {
      console.log('No activities found for user');
    }

    // Xử lý các hoạt động để đảm bảo tên dự án và sprint được hiển thị đúng
    const processedActivities = activities.map(activity => {
      const activityObj = activity.toObject();
      
      // Sử dụng tên dự án từ details nếu project không được populate
      if (!activityObj.project && activityObj.metadata && activityObj.metadata.projectName) {
        activityObj.project = { name: activityObj.metadata.projectName };
      }
      
      // Nếu vẫn không có tên dự án và có projectId, thêm placeholder
      if (!activityObj.project && activityObj.projectId) {
        activityObj.project = { name: 'Dự án' };
      }
      
      // Tương tự cho sprint
      if (!activityObj.sprint && activityObj.metadata && activityObj.metadata.sprintName) {
        activityObj.sprint = { name: activityObj.metadata.sprintName };
      }
      
      return activityObj;
    });

    const totalActivities = await Activity.countDocuments({ user: userId });
    
    res.json({
      success: true,
      data: processedActivities,
      pagination: {
        total: totalActivities,
        page: parseInt(page),
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    console.error('Error in getUserHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử hoạt động',
      error: error.message
    });
  }
};

// Lấy lịch sử hoạt động của một người dùng cụ thể (chỉ cho admin)
export const getUserHistoryById = async (req, res) => {
  try {
    console.log('getUserHistoryById called');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    console.log('Getting history for specific user:', req.params.userId);
    console.log('Request from admin:', req.user.id);
    
    const { userId } = req.params;
    if (!userId) {
      console.error('User ID not found in request parameters');
      return res.status(400).json({
        success: false,
        message: 'User ID không được cung cấp'
      });
    }
    
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Kiểm tra người dùng tồn tại
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      console.log('User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    console.log('Finding activities for user:', userId, 'with skip:', skip, 'limit:', limit);
    const activities = await Activity.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('project', 'name')
      .populate('task', 'title')
      .populate('user', 'name avatar')
      .exec();

    console.log('Found activities for specific user:', activities.length);
    if (activities.length > 0) {
      console.log('Activity types:', activities.map(a => a.type).join(', '));
    } else {
      console.log('No activities found for user');
    }

    const totalActivities = await Activity.countDocuments({ user: userId });
    console.log('Total activities count:', totalActivities);
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        total: totalActivities,
        page: parseInt(page),
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    console.error('Error in getUserHistoryById:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử hoạt động người dùng',
      error: error.message
    });
  }
};

// Lấy lịch sử hoạt động hệ thống (chỉ cho admin)
export const getSystemHistory = async (req, res) => {
  try {
    console.log('Getting system history');
    const { page = 1, limit = 20, userId } = req.query;
    const skip = (page - 1) * limit;
    
    // Lọc theo loại hoạt động hệ thống
    const filter = { type: 'system' };
    
    // Nếu có userId và là admin, lọc thêm theo user
    if (userId) {
      filter.user = userId;
    }
    
    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('project', 'name')
      .populate('task', 'title')
      .populate('user', 'name avatar')
      .exec();

    console.log('Found system activities:', activities.length);

    const totalActivities = await Activity.countDocuments(filter);
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        total: totalActivities,
        page: parseInt(page),
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    console.error('Error in getSystemHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử hoạt động hệ thống',
      error: error.message
    });
  }
};

// Lấy lịch sử hoạt động của dự án
export const getProjectHistory = async (req, res) => {
  try {
    console.log('Getting project history for project:', req.params.projectId);
    const { projectId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Kiểm tra dự án tồn tại
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án'
      });
    }

    // Kiểm tra quyền truy cập
    const userIsMember = project.members.some(member => member.user.toString() === req.user.id);
    const userIsOwner = project.owner.toString() === req.user.id;
    const userIsAdmin = req.user.role === 'admin';

    if (!userIsMember && !userIsOwner && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem lịch sử hoạt động của dự án này'
      });
    }

    const activities = await Activity.find({ project: projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('project', 'name')
      .populate('task', 'title')
      .populate('user', 'name avatar')
      .exec();

    console.log('Found project activities:', activities.length);

    const totalActivities = await Activity.countDocuments({ project: projectId });
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        total: totalActivities,
        page: parseInt(page),
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    console.error('Error in getProjectHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử hoạt động dự án',
      error: error.message
    });
  }
};

// Lấy lịch sử hoạt động của task
export const getTaskHistory = async (req, res) => {
  try {
    console.log('Getting task history for task:', req.params.taskId);
    const { taskId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Kiểm tra task tồn tại
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    // Kiểm tra quyền truy cập
    const project = task.project;
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Task không thuộc dự án nào'
      });
    }

    const userIsMember = project.members.some(member => member.user.toString() === req.user.id);
    const userIsOwner = project.owner.toString() === req.user.id;
    const userIsAdmin = req.user.role === 'admin';

    if (!userIsMember && !userIsOwner && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem lịch sử hoạt động của task này'
      });
    }

    const activities = await Activity.find({ task: taskId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('project', 'name')
      .populate('task', 'title')
      .populate('user', 'name avatar')
      .exec();

    console.log('Found task activities:', activities.length);

    const totalActivities = await Activity.countDocuments({ task: taskId });
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        total: totalActivities,
        page: parseInt(page),
        pages: Math.ceil(totalActivities / limit)
      }
    });
  } catch (error) {
    console.error('Error in getTaskHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử hoạt động task',
      error: error.message
    });
  }
}; 