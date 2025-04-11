import Sprint from "../models/sprint.model.js";
import Project from "../models/project.model.js";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import { ROLES } from "../config/constants.js";
import { createNotification } from "./notification.controller.js";

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
    console.log("\n=== DEBUG getSprintById ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);
    console.log("UserId:", req.user.id);
    console.log("User Email:", req.user.email);
    console.log("User Role:", req.user.role);
    console.log("ProjectRole từ middleware:", req.projectRole);

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

    console.log("Sprint found:", {
      id: sprint._id,
      name: sprint.name,
      memberCount: sprint.members?.length || 0,
    });

    // Kiểm tra quyền truy cập dự án
    const { error } = await checkProjectPermission(projectId, req.user.id);
    if (error) {
      console.log("Project Permission Error:", error);
      return res.status(403).json({
        success: false,
        message: error,
      });
    }

    console.log("Đã vượt qua kiểm tra quyền dự án");
    console.log("Quyền truy cập hợp lệ, tiếp tục lấy tasks");

    // Nếu người dùng có quyền truy cập dự án, họ có thể xem tất cả sprint của dự án
    // Lấy danh sách task của sprint
    const tasks = await Task.find({ sprint: sprint._id })
      .populate("assignees", "name")
      .populate("createdBy", "name email avatar")
      .sort({ createdAt: -1 });

    console.log("Tasks found:", tasks.length);
    console.log("=== END DEBUG getSprintById ===\n");

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
    console.log("Request body:", req.body);
    console.log("=== END DEBUG ===");

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

    // Tìm vai trò của người tạo trong dự án
    let creatorRole = ROLES.MEMBER;
    const memberInProject = project.members.find(
      (member) => member.user.toString() === req.user.id.toString()
    );
    
    if (memberInProject) {
      creatorRole = memberInProject.role;
    } else if (project.owner.toString() === req.user.id.toString()) {
      creatorRole = ROLES.PROJECT_MANAGER;
    }

    // Khởi tạo danh sách thành viên với người tạo
    const initialMembers = [
      {
        user: req.user.id,
        role: creatorRole, // Giữ nguyên vai trò của người tạo từ dự án
        addedAt: new Date(),
        addedBy: req.user.id,
      }
    ];

    // Xử lý danh sách thành viên được chọn từ form
    if (req.body.members && Array.isArray(req.body.members) && req.body.members.length > 0) {
      console.log("Thêm thành viên từ danh sách đã chọn:", req.body.members);
      
      // Lọc ra các thành viên khác với người tạo
      const additionalMembers = req.body.members
        .filter(member => 
          // Lọc bỏ người tạo sprint (đã được thêm ở trên)
          (member.id || member._id).toString() !== req.user.id.toString()
        )
        .map(member => {
          let memberRole = member.role || "member";
          
          // Nếu là chủ dự án, gán vai trò project_manager
          if (project.owner.toString() === (member.id || member._id).toString()) {
            memberRole = ROLES.PROJECT_MANAGER;
          }
          
          // Lấy vai trò từ dự án nếu là admin hoặc project_manager
          const projectMember = project.members.find(
            m => m.user.toString() === (member.id || member._id).toString()
          );
          
          if (projectMember && 
              (projectMember.role === ROLES.PROJECT_MANAGER || projectMember.role === ROLES.ADMIN)) {
            memberRole = projectMember.role;
          }
          
          return {
            user: member.id || member._id,
            role: memberRole,
            addedAt: new Date(),
            addedBy: req.user.id,
          };
        });
      
      // Thêm các thành viên khác vào danh sách
      initialMembers.push(...additionalMembers);
      
      console.log("Danh sách thành viên sprint sau khi xử lý:", initialMembers);
    }

    // Tạo sprint mới với danh sách thành viên
    const sprint = new Sprint({
      name: req.body.name,
      description: req.body.description,
      project: projectId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status || "planning",
      goal: req.body.goal || "",
      createdBy: req.user.id,
      members: initialMembers
    });

    // Lưu sprint mới
    const newSprint = await sprint.save();

    // Populate sprint with references
    const populatedSprint = await Sprint.findById(newSprint._id)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("project", "name");

    // Gửi thông báo real-time qua socket
    // 1. Emit to project room
    global.io.to(`project:${projectId}`).emit("sprint_created", {
      sprint: populatedSprint,
      creator: {
        id: req.user.id,
        name: req.user.name
      }
    });

    // 2. Emit to each member's personal room
    for (const member of initialMembers) {
      global.io.to(member.user.toString()).emit("sprint_assigned", {
        sprint: {
          _id: newSprint._id,
          name: newSprint.name,
          project: {
            _id: project._id,
            name: project.name
          }
        },
        assigner: {
          id: req.user.id,
          name: req.user.name
        }
      });
    }

    // Create notifications for project members
    // Get project members to notify them
    const projectWithMembers = await Project.findById(projectId)
      .populate("members.user", "_id")
      .populate("owner", "_id");
    
    // Prepare members array for notification (all project members and owner)
    const membersToNotify = [
      ...projectWithMembers.members.map(member => member.user._id),
      projectWithMembers.owner._id
    ];
    
    // Send notification to each member
    for (const userId of membersToNotify) {
      await createNotification({
        userId,
        type: "project_milestone",
        message: `Sprint mới "${newSprint.name}" đã được tạo trong dự án ${project.name}`,
        link: `/projects/${projectId}/sprints/${newSprint._id}`,
        projectId,
        senderId: req.user.id,
      });
    }

    res.status(201).json({
      success: true,
      data: newSprint,
      message: "Tạo sprint thành công",
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
    const { name, description, startDate, endDate, status, goal } = req.body;

    // Validate input
    const errors = validateSprintData(req.body);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu đầu vào không hợp lệ",
        errors,
      });
    }

    // Find sprint and validate ownership
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Get project details
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Update sprint properties
    sprint.name = name;
    sprint.description = description;
    sprint.startDate = startDate;
    sprint.endDate = endDate;
    sprint.status = status || sprint.status;
    sprint.goal = goal;

    const updatedSprint = await sprint.save();
    
    // Populate sprint data
    const populatedSprint = await Sprint.findById(updatedSprint._id)
      .populate("createdBy", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate("project", "name");
    
    // Gửi thông báo real-time qua socket
    // 1. Emit to project room
    global.io.to(`project:${projectId}`).emit("sprint_updated", {
      sprint: populatedSprint,
      updater: {
        id: req.user.id,
        name: req.user.name
      }
    });

    // 2. Emit to sprint room
    global.io.to(`sprint:${sprintId}`).emit("sprint_details_updated", {
      sprint: populatedSprint,
      updater: {
        id: req.user.id,
        name: req.user.name
      }
    });
    
    // Create notifications for all sprint members
    // Get sprint members with populated user IDs
    const sprintWithMembers = await Sprint.findById(sprintId)
      .populate("members.user", "_id");
    
    // Prepare members array for notification
    const membersToNotify = sprintWithMembers.members.map(member => member.user._id);
    
    // Send notification to each member
    for (const userId of membersToNotify) {
      await createNotification({
        userId,
        type: "project_milestone",
        message: `Sprint "${updatedSprint.name}" đã được cập nhật`,
        link: `/projects/${projectId}/sprints/${updatedSprint._id}`,
        projectId,
        senderId: req.user.id,
      });
    }

    res.json({
      success: true,
      data: updatedSprint,
      message: "Cập nhật sprint thành công",
    });
  } catch (error) {
    console.error("Error in updateSprint:", error);
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

    // Find sprint and check if it exists
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Get project details for notification
    const project = await Project.findById(projectId)
      .populate("members.user", "_id")
      .populate("owner", "_id");
    
    // Store sprint name for notification
    const sprintName = sprint.name;
    
    // Delete the sprint
    await Sprint.deleteOne({ _id: sprintId });
    
    // Remove sprint reference from all tasks
    await Task.updateMany(
      { sprint: sprintId },
      { $unset: { sprint: "" } }
    );
    
    // Prepare members array for notification (all project members and owner)
    const membersToNotify = [
      ...project.members.map(member => member.user._id),
      project.owner._id
    ];
    
    // Send notification to each member
    for (const userId of membersToNotify) {
      await createNotification({
        userId,
        type: "project_milestone",
        message: `Sprint "${sprintName}" đã bị xóa khỏi dự án ${project.name}`,
        link: `/projects/${projectId}`,
        projectId,
        senderId: req.user.id,
      });
    }

    res.json({
      success: true,
      message: "Xóa sprint thành công",
    });
  } catch (error) {
    console.error("Error in deleteSprint:", error);
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
    const { projectId, sprintId } = req.params;
    const { taskId } = req.body;

    // Check if task exists and belongs to the project
    const task = await Task.findOne({ _id: taskId, project: projectId })
      .populate("assignees", "name");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại hoặc không thuộc dự án này",
      });
    }

    // Check if sprint exists
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại hoặc không thuộc dự án này",
      });
    }

    // Check if task is already in another sprint
    if (task.sprint && task.sprint.toString() !== sprintId) {
      return res.status(400).json({
        success: false,
        message: "Task đã thuộc về một sprint khác",
      });
    }

    // Add task to sprint
    task.sprint = sprintId;
    await task.save();

    // Get project details
    const project = await Project.findById(projectId);
    
    // Get sprint members with populated user IDs
    const sprintWithMembers = await Sprint.findById(sprintId)
      .populate("members.user", "_id");
    
    // Notify assignees and sprint members
    const assigneeIds = task.assignees.map(assignee => assignee._id.toString());
    const sprintMemberIds = sprintWithMembers.members.map(member => member.user._id.toString());
    
    // Combine and remove duplicates
    const membersToNotify = [...new Set([...assigneeIds, ...sprintMemberIds])];
    
    // Send notification to each member
    for (const userId of membersToNotify) {
      await createNotification({
        userId,
        type: "task_updated",
        message: `Task "${task.title}" đã được thêm vào sprint "${sprint.name}"`,
        link: `/projects/${projectId}/tasks/${taskId}`,
        projectId,
        taskId,
        senderId: req.user.id,
      });
    }

    res.json({
      success: true,
      data: task,
      message: "Task đã được thêm vào sprint thành công",
    });
  } catch (error) {
    console.error("Error in addTaskToSprint:", error);
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
    const { projectId, sprintId } = req.params;
    const { taskId } = req.body;

    // Check if task exists and belongs to the project
    const task = await Task.findOne({ _id: taskId, project: projectId })
      .populate("assignees", "name");
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task không tồn tại hoặc không thuộc dự án này",
      });
    }

    // Check if sprint exists
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại hoặc không thuộc dự án này",
      });
    }

    // Check if task is part of the sprint
    if (!task.sprint || task.sprint.toString() !== sprintId) {
      return res.status(400).json({
        success: false,
        message: "Task không thuộc về sprint này",
      });
    }

    // Store task title and sprint name for notification
    const taskTitle = task.title;
    const sprintName = sprint.name;

    // Remove task from sprint
    task.sprint = undefined;
    await task.save();

    // Get sprint members with populated user IDs
    const sprintWithMembers = await Sprint.findById(sprintId)
      .populate("members.user", "_id");
    
    // Notify assignees and sprint members
    const assigneeIds = task.assignees.map(assignee => assignee._id.toString());
    const sprintMemberIds = sprintWithMembers.members.map(member => member.user._id.toString());
    
    // Combine and remove duplicates
    const membersToNotify = [...new Set([...assigneeIds, ...sprintMemberIds])];
    
    // Send notification to each member
    for (const userId of membersToNotify) {
      await createNotification({
        userId,
        type: "task_updated",
        message: `Task "${taskTitle}" đã được gỡ khỏi sprint "${sprintName}"`,
        link: `/projects/${projectId}/tasks/${taskId}`,
        projectId,
        taskId,
        senderId: req.user.id,
      });
    }

    res.json({
      success: true,
      message: "Task đã được gỡ khỏi sprint thành công",
    });
  } catch (error) {
    console.error("Error in removeTaskFromSprint:", error);
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
    const { userId, role } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Check if user is a member of the project
    const isProjectMember = project.members.some(
      (member) => member.user.toString() === userId
    );
    const isProjectOwner = project.owner.toString() === userId;

    if (!isProjectMember && !isProjectOwner) {
      return res.status(400).json({
        success: false,
        message: "Người dùng không phải là thành viên của dự án",
      });
    }

    // Check if sprint exists
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Check if user is already a member of the sprint
    const isSprintMember = sprint.members.some(
      (member) => member.user.toString() === userId
    );
    if (isSprintMember) {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã là thành viên của sprint",
      });
    }

    // Add user to sprint with role
    sprint.members.push({
      user: userId,
      role: role || "member", // Default role is 'member'
    });

    await sprint.save();
    
    // Get existing sprint members for notification
    const sprintWithMembers = await Sprint.findById(sprintId)
      .populate("members.user", "_id name");
      
    // Prepare list of members for notification (excluding the newly added member)
    const existingMembers = sprintWithMembers.members
      .filter(member => member.user._id.toString() !== userId)
      .map(member => member.user._id);
    
    // Notify the added member
    await createNotification({
      userId,
      type: "project_role",
      message: `Bạn đã được thêm vào sprint "${sprint.name}" trong dự án ${project.name}`,
      link: `/projects/${projectId}/sprints/${sprintId}`,
      projectId,
      senderId: req.user.id,
    });
    
    // Notify existing members
    for (const memberId of existingMembers) {
      await createNotification({
        userId: memberId,
        type: "project_milestone",
        message: `${user.name} đã được thêm vào sprint "${sprint.name}"`,
        link: `/projects/${projectId}/sprints/${sprintId}`,
        projectId,
        senderId: req.user.id,
      });
    }

    res.json({
      success: true,
      message: "Thêm thành viên vào sprint thành công",
    });
  } catch (error) {
    console.error("Error in addMemberToSprint:", error);
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
    const { projectId, sprintId } = req.params;
    const { userId } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Check if sprint exists
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Check if user is a member of the sprint
    const isSprintMember = sprint.members.some(
      (member) => member.user.toString() === userId
    );
    if (!isSprintMember) {
      return res.status(400).json({
        success: false,
        message: "Người dùng không phải là thành viên của sprint",
      });
    }

    // Store user name and sprint name for notification
    const userName = user.name;
    const sprintName = sprint.name;

    // Get project details
    const project = await Project.findById(projectId);
    const projectName = project.name;
    
    // Get all sprint members before removing the user
    const otherSprintMembers = sprint.members
      .filter(member => member.user.toString() !== userId)
      .map(member => member.user);

    // Remove user from sprint
    sprint.members = sprint.members.filter(
      (member) => member.user.toString() !== userId
    );
    await sprint.save();
    
    // Notify the removed member
    await createNotification({
      userId,
      type: "project_removed",
      message: `Bạn đã bị xóa khỏi sprint "${sprintName}" trong dự án ${projectName}`,
      link: `/projects/${projectId}`,
      projectId,
      senderId: req.user.id,
    });
    
    // Notify other sprint members
    for (const memberId of otherSprintMembers) {
      await createNotification({
        userId: memberId,
        type: "project_milestone",
        message: `${userName} đã bị xóa khỏi sprint "${sprintName}"`,
        link: `/projects/${projectId}/sprints/${sprintId}`,
        projectId,
        senderId: req.user.id,
      });
    }

    res.json({
      success: true,
      message: "Xóa thành viên khỏi sprint thành công",
    });
  } catch (error) {
    console.error("Error in removeMemberFromSprint:", error);
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

// Lấy tất cả sprint của người dùng hiện tại
export const getUserSprints = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("=== DEBUG getUserSprints Controller ===");
    console.log("UserId:", userId);

    // Tìm tất cả sprint mà người dùng là thành viên
    const memberSprints = await Sprint.find({
      "members.user": userId
    })
    .populate("project", "name description avatar avatarBase64")
    .populate("createdBy", "name email avatar")
    .sort({ startDate: 1 });

    console.log("Found Member Sprints:", memberSprints.length);

    // Tìm tất cả dự án mà người dùng tham gia với vai trò owner, admin hoặc project manager
    const userProjects = await Project.find({
      $or: [
        { owner: userId },
        { "members.user": userId, "members.role": { $in: [ROLES.ADMIN, ROLES.PROJECT_MANAGER] } }
      ]
    }).select("_id");

    console.log("Found User Projects:", userProjects.length);
    const projectIds = userProjects.map(p => p._id);

    // Tìm tất cả sprint trong các dự án mà người dùng có quyền admin/manager
    const managerSprints = await Sprint.find({
      project: { $in: projectIds },
      "members.user": { $ne: userId } // Lấy các sprint mà người dùng chưa là thành viên
    })
    .populate("project", "name description avatar avatarBase64")
    .populate("createdBy", "name email avatar")
    .sort({ startDate: 1 });

    console.log("Found Manager Sprints:", managerSprints.length);

    // Kết hợp 2 danh sách và loại bỏ trùng lặp
    const allSprintIds = new Set();
    const allSprints = [];

    memberSprints.forEach(sprint => {
      if (!allSprintIds.has(sprint._id.toString())) {
        allSprintIds.add(sprint._id.toString());
        allSprints.push({
          ...sprint.toObject(),
          userRole: "member"
        });
      }
    });

    managerSprints.forEach(sprint => {
      if (!allSprintIds.has(sprint._id.toString())) {
        allSprintIds.add(sprint._id.toString());
        allSprints.push({
          ...sprint.toObject(),
          userRole: "manager"
        });
      }
    });

    // Thêm số lượng task cho mỗi sprint
    const sprintsWithTaskCount = await Promise.all(
      allSprints.map(async (sprint) => {
        const taskCount = await Task.countDocuments({ sprint: sprint._id });
        const completedTaskCount = await Task.countDocuments({
          sprint: sprint._id,
          status: "done",
        });
        return {
          ...sprint,
          taskCount: {
            total: taskCount,
            completed: completedTaskCount,
          },
        };
      })
    );

    console.log("Total User Sprints:", sprintsWithTaskCount.length);
    console.log("=== END DEBUG getUserSprints Controller ===");

    return res.json({
      success: true,
      data: sprintsWithTaskCount,
      message: "Lấy danh sách sprint của người dùng thành công",
    });
  } catch (error) {
    console.error("Error in getUserSprints:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message
    });
  }
};
