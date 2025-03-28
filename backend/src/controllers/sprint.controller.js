import Sprint from "../models/sprint.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import { ROLES } from "../config/constants.js";

// Validate dữ liệu đầu vào
const validateSprintData = (data) => {
  const errors = [];

  if (!data.name || data.name.length < 3 || data.name.length > 100) {
    errors.push("Tên sprint phải từ 3-100 ký tự");
  }

  if (
    !data.description ||
    data.description.length < 5 ||
    data.description.length > 1000
  ) {
    errors.push("Mô tả sprint phải từ 5-1000 ký tự");
  }

  if (!data.startDate || !Date.parse(data.startDate)) {
    errors.push("Ngày bắt đầu không hợp lệ");
  }

  if (!data.endDate || !Date.parse(data.endDate)) {
    errors.push("Ngày kết thúc không hợp lệ");
  }

  if (Date.parse(data.startDate) > Date.parse(data.endDate)) {
    errors.push("Ngày kết thúc phải sau ngày bắt đầu");
  }

  if (
    data.status &&
    !["planning", "active", "completed"].includes(data.status)
  ) {
    errors.push("Trạng thái sprint không hợp lệ");
  }

  if (data.goal && data.goal.length > 500) {
    errors.push("Mục tiêu sprint không được vượt quá 500 ký tự");
  }

  return errors;
};

// Kiểm tra quyền truy cập dự án
const checkProjectPermission = async (
  projectId,
  userId,
  requiredRoles = []
) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: "Dự án không tồn tại" };

  // Thêm log debug
  console.log("=== DEBUG PROJECT PERMISSION ===");
  console.log("ProjectId:", projectId);
  console.log("UserId:", userId);
  console.log("Project owner:", project.owner);
  console.log("Required roles:", requiredRoles);

  // Tìm người dùng trong danh sách thành viên dự án
  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );

  console.log("Found member:", member ? "yes" : "no");
  if (member) {
    console.log("Member role:", member.role);
    console.log("ROLES.ADMIN:", ROLES.ADMIN);
    console.log("ROLES.PROJECT_MANAGER:", ROLES.PROJECT_MANAGER);
    console.log("Is Admin?", member.role === ROLES.ADMIN);
    console.log("Is Project Manager?", member.role === ROLES.PROJECT_MANAGER);
    console.log(
      "Required roles includes member role?",
      requiredRoles.includes(member.role)
    );
  }

  // Nếu là admin hoặc project manager, luôn có quyền truy cập
  if (
    member &&
    (member.role === ROLES.ADMIN || member.role === ROLES.PROJECT_MANAGER)
  ) {
    return { project };
  }

  // Nếu là owner, luôn có quyền truy cập
  if (project.owner.toString() === userId.toString()) {
    return { project };
  }

  // Nếu không phải thành viên
  if (!member) {
    return { error: "Bạn không phải thành viên của dự án" };
  }

  // Kiểm tra role của member nếu có yêu cầu
  if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
    return { error: "Bạn không có quyền thực hiện hành động này" };
  }

  return { project };
};

// Kiểm tra quyền xem sprint
const canViewSprint = (sprint, userId, projectRole) => {
  console.log("=== DEBUG canViewSprint ===");
  console.log("Sprint:", sprint._id);
  console.log("UserId:", userId);
  console.log("ProjectRole:", projectRole);
  console.log("Is Admin?", projectRole === ROLES.ADMIN);
  console.log("Is Project Manager?", projectRole === ROLES.PROJECT_MANAGER);

  // Admin và Project Manager luôn có quyền xem
  if (projectRole === ROLES.ADMIN || projectRole === ROLES.PROJECT_MANAGER) {
    console.log("User is Admin or Project Manager - Access granted");
    return true;
  }

  // Kiểm tra xem user có phải là thành viên của sprint không
  const isMember = sprint.members.some(
    (member) => member.user.toString() === userId.toString()
  );
  console.log("Is Sprint Member?", isMember);
  console.log("=== END DEBUG canViewSprint ===");

  return isMember;
};

// Lấy danh sách sprint của dự án
export const getSprints = async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log("=== DEBUG getSprints Controller ===");
    console.log("ProjectId:", projectId);
    console.log("UserId:", req.user.id);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID dự án",
      });
    }

    // Lấy thông tin project và kiểm tra quyền
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Tìm role của user trong project
    const member = project.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );
    const isOwner = project.owner.toString() === req.user.id.toString();
    const projectRole = member ? member.role : null;

    console.log("Project Role:", projectRole);
    console.log("Is Owner:", isOwner);

    // Kiểm tra quyền truy cập
    const isAdminOrManager =
      projectRole === ROLES.ADMIN ||
      projectRole === ROLES.PROJECT_MANAGER ||
      isOwner;
    if (!member && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập dự án này",
      });
    }

    // Lấy danh sách sprint
    const sprints = await Sprint.find({ project: projectId })
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ startDate: 1 });

    console.log("Found Sprints:", sprints.length);
    console.log(
      "Sprint IDs:",
      sprints.map((s) => s._id)
    );

    // Admin, Project Manager và Owner có thể xem tất cả sprint
    // Member chỉ có thể xem những sprint mà họ là thành viên
    const filteredSprints = isAdminOrManager
      ? sprints
      : sprints.filter((sprint) =>
          sprint.members.some(
            (member) => member.user._id.toString() === req.user.id.toString()
          )
        );

    console.log("Filtered Sprints:", filteredSprints.length);
    console.log("=== END DEBUG getSprints Controller ===");

    // Thêm số lượng task cho mỗi sprint
    const sprintsWithTaskCount = await Promise.all(
      filteredSprints.map(async (sprint) => {
        const taskCount = await Task.countDocuments({ sprint: sprint._id });
        const completedTaskCount = await Task.countDocuments({
          sprint: sprint._id,
          status: "done",
        });
        return {
          ...sprint.toObject(),
          taskCount: {
            total: taskCount,
            completed: completedTaskCount,
          },
        };
      })
    );

    return res.json({
      success: true,
      data: sprintsWithTaskCount,
      message: "Lấy danh sách sprint thành công",
    });
  } catch (error) {
    console.error("Error in getSprints:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// Lấy chi tiết sprint
export const getSprintById = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;
    console.log("=== DEBUG getSprintById ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);
    console.log("UserId:", req.user.id);
    console.log("ProjectRole:", req.projectRole);

    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId })
      .populate("project", "name")
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!sprint) {
      console.log("Sprint not found");
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id);
    if (error) {
      console.log("Project Permission Error:", error);
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Admin và Project Manager luôn có quyền xem
    const isAdminOrManager =
      req.projectRole === ROLES.ADMIN ||
      req.projectRole === ROLES.PROJECT_MANAGER;

    console.log("Is Admin or Manager?", isAdminOrManager);

    // Nếu không phải admin/manager, kiểm tra xem có phải thành viên của sprint không
    const isSprintMember = sprint.members.some(
      (member) => member.user._id.toString() === req.user.id.toString()
    );

    console.log("Is Sprint Member?", isSprintMember);

    if (!isAdminOrManager && !isSprintMember) {
      console.log(
        "Access Denied: User is neither admin/manager nor sprint member"
      );
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xem sprint này",
      });
    }

    // Lấy danh sách task của sprint
    const tasks = await Task.find({ sprint: sprint._id })
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email avatar")
      .sort({ createdAt: -1 });

    console.log("Tasks found:", tasks.length);
    console.log("=== END DEBUG getSprintById ===");

    res.json({
      success: true,
      data: {
        ...sprint.toObject(),
        tasks,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin sprint",
      error: error.message,
    });
  }
};

// Tạo sprint mới
export const createSprint = async (req, res) => {
  try {
    const { projectId } = req.params;

    console.log("=== DEBUG CREATE SPRINT ===");
    console.log(
      "User making request:",
      req.user.id,
      req.user.name,
      req.user.email
    );
    console.log("Project ID:", projectId);
    console.log("=== END DEBUG ===");

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID dự án",
      });
    }

    const errors = validateSprintData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Không cần kiểm tra quyền nữa vì đã được xử lý bởi middleware
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    const sprint = new Sprint({
      name: req.body.name,
      description: req.body.description,
      project: projectId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || "planning",
      goal: req.body.goal || "",
      createdBy: req.user.id,
    });

    await sprint.save();

    console.log("Sprint created:", sprint);

    res.status(201).json({
      success: true,
      data: sprint,
      message: "Sprint đã được tạo thành công",
    });
  } catch (error) {
    console.error("Lỗi khi tạo sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo sprint",
      error: error.message,
    });
  }
};

// Cập nhật sprint
export const updateSprint = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Không cần kiểm tra quyền nữa vì đã được xử lý bởi middleware

    if (req.body.name) sprint.name = req.body.name;
    if (req.body.description) sprint.description = req.body.description;
    if (req.body.startDate) sprint.startDate = req.body.startDate;
    if (req.body.endDate) sprint.endDate = req.body.endDate;
    if (req.body.status) sprint.status = req.body.status;
    if (req.body.goal !== undefined) sprint.goal = req.body.goal;

    // Validate trước khi lưu
    const errors = validateSprintData(sprint);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    await sprint.save();

    res.json({
      success: true,
      data: sprint,
      message: "Sprint đã được cập nhật thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật sprint",
      error: error.message,
    });
  }
};

// Xóa sprint
export const deleteSprint = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    // Không cần kiểm tra quyền nữa vì đã được xử lý bởi middleware

    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra các task đang dùng sprint
    const tasksInSprint = await Task.find({ sprint: sprintId });
    if (tasksInSprint.length > 0) {
      // Gỡ liên kết sprint khỏi tất cả task
      await Task.updateMany({ sprint: sprintId }, { $unset: { sprint: "" } });
    }

    await Sprint.findByIdAndDelete(sprintId);

    res.json({
      success: true,
      message: "Sprint đã được xóa thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa sprint",
      error: error.message,
    });
  }
};

// Thêm task vào sprint
export const addTaskToSprint = async (req, res) => {
  try {
    const { projectId, sprintId, taskId } = req.params;

    // Không cần kiểm tra quyền nữa vì đã được xử lý bởi middleware

    // Kiểm tra sprint và task tồn tại
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại",
      });
    }

    // Gán task vào sprint
    task.sprint = sprintId;
    await task.save();

    res.json({
      success: true,
      message: "Task đã được thêm vào sprint",
    });
  } catch (error) {
    console.error("Lỗi khi thêm task vào sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm task vào sprint",
      error: error.message,
    });
  }
};

// Gỡ task khỏi sprint
export const removeTaskFromSprint = async (req, res) => {
  try {
    const { projectId, sprintId, taskId } = req.params;

    // Không cần kiểm tra quyền nữa vì đã được xử lý bởi middleware

    // Kiểm tra sprint và task tồn tại
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      project: projectId,
      sprint: sprintId,
    });
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại hoặc không thuộc sprint này",
      });
    }

    // Gỡ task khỏi sprint
    task.sprint = undefined;
    await task.save();

    res.json({
      success: true,
      message: "Task đã được gỡ khỏi sprint",
    });
  } catch (error) {
    console.error("Lỗi khi gỡ task khỏi sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gỡ task khỏi sprint",
      error: error.message,
    });
  }
};

// Lấy danh sách thành viên của sprint
export const getSprintMembers = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id);
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra xem sprint có tồn tại không
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Lấy danh sách thành viên và populate thông tin user
    const sprintWithMembers = await Sprint.findById(sprintId).populate(
      "members.user",
      "name email avatar"
    );

    res.json({
      success: true,
      data: sprintWithMembers.members || [],
      message: "Lấy danh sách thành viên thành công",
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách thành viên sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách thành viên",
      error: error.message,
    });
  }
};

// Thêm thành viên vào sprint
export const addMemberToSprint = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng là bắt buộc",
      });
    }

    // Kiểm tra quyền quản lý thành viên sprint (cần là owner hoặc project manager)
    const { project, error } = await checkProjectPermission(
      projectId,
      req.user.id,
      [ROLES.PROJECT_MANAGER, ROLES.ADMIN]
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra xem sprint có tồn tại không
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra xem user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Kiểm tra xem user đã là thành viên của project chưa
    const isMemberOfProject = project.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    // Nếu chưa là thành viên project, thêm vào project trước
    if (!isMemberOfProject) {
      project.members.push({
        user: userId,
        role: ROLES.MEMBER,
        addedBy: req.user.id,
      });
      await project.save();
      console.log(`Đã thêm người dùng ${userId} vào dự án`);
    }

    // Kiểm tra xem user đã là thành viên của sprint chưa
    const isMemberOfSprint = sprint.members.some(
      (member) => member.user.toString() === userId.toString()
    );

    if (isMemberOfSprint) {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã là thành viên của sprint",
      });
    }

    // Thêm user vào sprint
    sprint.members.push({
      user: userId,
      role: "member",
      addedAt: new Date(),
      addedBy: req.user.id,
    });

    await sprint.save();

    res.json({
      success: true,
      message: "Thêm thành viên vào sprint thành công",
      data: { userId, sprintId },
    });
  } catch (error) {
    console.error("Lỗi khi thêm thành viên vào sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm thành viên vào sprint",
      error: error.message,
    });
  }
};

// Xóa thành viên khỏi sprint
export const removeMemberFromSprint = async (req, res) => {
  try {
    const { projectId, sprintId, userId } = req.params;

    // Kiểm tra quyền quản lý thành viên sprint (cần là owner hoặc project manager)
    const { error } = await checkProjectPermission(projectId, req.user.id, [
      ROLES.PROJECT_MANAGER,
      ROLES.ADMIN,
    ]);
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra xem sprint có tồn tại không
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Kiểm tra xem user có phải là thành viên của sprint không
    const memberIndex = sprint.members.findIndex(
      (member) => member.user.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không phải là thành viên của sprint",
      });
    }

    // Xóa user khỏi sprint
    sprint.members.splice(memberIndex, 1);
    await sprint.save();

    res.json({
      success: true,
      message: "Xóa thành viên khỏi sprint thành công",
    });
  } catch (error) {
    console.error("Lỗi khi xóa thành viên khỏi sprint:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa thành viên khỏi sprint",
      error: error.message,
    });
  }
};

// Lấy danh sách người dùng có thể thêm vào sprint
export const getAvailableUsersForSprint = async (req, res) => {
  try {
    const { projectId, sprintId } = req.params;

    // Kiểm tra quyền truy cập dự án
    const { project, error } = await checkProjectPermission(
      projectId,
      req.user.id
    );
    if (error) {
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    // Kiểm tra xem sprint có tồn tại không
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Lấy danh sách ID thành viên hiện tại của sprint
    const currentSprintMemberIds = sprint.members.map((member) =>
      member.user.toString()
    );

    // Lấy danh sách thành viên dự án có thể thêm vào sprint
    const availableUsers = await Promise.all(
      project.members
        .filter(
          (member) => !currentSprintMemberIds.includes(member.user.toString())
        )
        .map(async (member) => {
          const user = await User.findById(member.user);
          return {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: member.role,
          };
        })
    );

    res.json({
      success: true,
      data: availableUsers,
      message: "Lấy danh sách người dùng có thể thêm thành công",
    });
  } catch (error) {
    console.error(
      "Lỗi khi lấy danh sách người dùng có thể thêm vào sprint:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách người dùng",
      error: error.message,
    });
  }
};
