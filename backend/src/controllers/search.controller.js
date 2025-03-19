import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Upload from "../models/upload.model.js";
import Comment from "../models/comment.model.js";

// Helper function để xây dựng query tìm kiếm
const buildSearchQuery = (searchTerm, fields) => {
  if (!searchTerm) return {};

  return {
    $or: fields.map((field) => ({
      [field]: { $regex: searchTerm, $options: "i" },
    })),
  };
};

// Helper function để kiểm tra quyền truy cập dự án
const checkProjectAccess = async (userId, projectId) => {
  const project = await Project.findById(projectId);
  if (!project) return false;

  return (
    project.owner.toString() === userId.toString() ||
    project.members.some((m) => m.user.toString() === userId.toString())
  );
};

// 📌 1. Tìm kiếm tổng hợp
export const searchAll = async (req, res) => {
  try {
    const { query, type } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập từ khóa tìm kiếm",
      });
    }

    const results = {};
    const searchPromises = [];

    // Tìm kiếm người dùng
    if (!type || type === "users") {
      searchPromises.push(
        User.find(buildSearchQuery(query, ["name", "email"]))
          .select("name email avatar role position department")
          .limit(5)
          .then((users) => (results.users = users))
      );
    }

    // Tìm kiếm dự án
    if (!type || type === "projects") {
      const projectQuery = {
        ...buildSearchQuery(query, ["name", "description"]),
        $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
      };

      searchPromises.push(
        Project.find(projectQuery)
          .select("name description status category priority")
          .populate("owner", "name avatar")
          .limit(5)
          .then((projects) => (results.projects = projects))
      );
    }

    // Tìm kiếm công việc
    if (!type || type === "tasks") {
      const taskQuery = {
        ...buildSearchQuery(query, ["title", "description"]),
        $or: [{ createdBy: req.user.id }, { assignees: req.user.id }],
      };

      searchPromises.push(
        Task.find(taskQuery)
          .select("title description status priority dueDate")
          .populate("project", "name")
          .populate("assignees", "name avatar")
          .limit(5)
          .then((tasks) => (results.tasks = tasks))
      );
    }

    // Tìm kiếm file
    if (!type || type === "files") {
      const fileQuery = {
        ...buildSearchQuery(query, ["filename", "originalname"]),
        $or: [
          { uploadedBy: req.user.id },
          { permissions: "public" },
          { allowedUsers: req.user.id },
        ],
      };

      searchPromises.push(
        Upload.find(fileQuery)
          .select("filename originalname type size createdAt")
          .populate("uploadedBy", "name avatar")
          .limit(5)
          .then((files) => (results.files = files))
      );
    }

    await Promise.all(searchPromises);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm",
      error: error.message,
    });
  }
};

// 📌 2. Tìm kiếm người dùng
export const searchUsers = async (req, res) => {
  try {
    const { query, role, department, skills, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập từ khóa tìm kiếm",
      });
    }

    const filter = buildSearchQuery(query, ["name", "email"]);

    // Thêm các điều kiện lọc
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (skills) filter.skills = { $in: skills.split(",") };

    const users = await User.find(filter)
      .select("name email avatar role position department skills")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm người dùng:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm người dùng",
      error: error.message,
    });
  }
};

// 📌 3. Tìm kiếm dự án
export const searchProjects = async (req, res) => {
  try {
    const {
      query,
      status,
      category,
      priority,
      page = 1,
      limit = 20,
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập từ khóa tìm kiếm",
      });
    }

    const filter = {
      ...buildSearchQuery(query, ["name", "description"]),
      $or: [{ owner: req.user.id }, { "members.user": req.user.id }],
    };

    // Thêm các điều kiện lọc
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const projects = await Project.find(filter)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .skip((page - 1) * limit)
      .limit(limit);

    // Thêm thống kê cho mỗi dự án
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = {
          totalTasks: await Task.countDocuments({ project: project._id }),
          completedTasks: await Task.countDocuments({
            project: project._id,
            status: "done",
          }),
          totalMembers: project.members.length,
        };
        return { ...project.toObject(), stats };
      })
    );

    const total = await Project.countDocuments(filter);

    res.json({
      success: true,
      data: {
        projects: projectsWithStats,
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm dự án",
      error: error.message,
    });
  }
};

// 📌 4. Tìm kiếm công việc
export const searchTasks = async (req, res) => {
  try {
    const {
      query,
      projectId,
      status,
      priority,
      assignee,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // Tìm kiếm theo từ khóa
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    // Kiểm tra quyền truy cập dự án
    if (projectId) {
      const hasAccess = await checkProjectAccess(req.user.id, projectId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập dự án này",
        });
      }
      filter.project = projectId;
    }

    // Thêm các điều kiện lọc
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignees = assignee;

    // Lọc theo thời gian
    if (startDate || endDate) {
      filter.dueDate = {};
      if (startDate) filter.dueDate.$gte = new Date(startDate);
      if (endDate) filter.dueDate.$lte = new Date(endDate);
    }

    const tasks = await Task.find(filter)
      .populate("project", "name status")
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("parent", "title status")
      .populate("subtasks", "title status progress")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi khi tìm kiếm công việc:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm công việc",
      error: error.message,
    });
  }
};
