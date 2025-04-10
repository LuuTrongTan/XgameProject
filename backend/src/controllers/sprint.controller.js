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
      .populate("assignees", "name email avatar")
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

    await sprint.save();

    console.log("Sprint created:", sprint);
    console.log("Sprint members count:", sprint.members.length);

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

    console.log("\n=== DEBUG addMemberToSprint ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);
    console.log("UserId to add:", userId);
    console.log("Requester:", req.user.id, req.user.email);
    console.log("ProjectRole:", req.projectRole);

    // Kiểm tra quyền đã được xử lý bởi middleware checkPermission
    // Lấy thông tin project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
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

    console.log("Sprint trước khi thêm thành viên:", JSON.stringify({
      _id: sprint._id,
      name: sprint.name,
      membersCount: sprint.members ? sprint.members.length : 0,
      membersArray: Array.isArray(sprint.members),
      members: sprint.members
    }, null, 2));

    // Kiểm tra xem user có tồn tại không
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    console.log("User to add:", JSON.stringify({
      _id: user._id,
      name: user.name,
      email: user.email
    }, null, 2));

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

    // Đảm bảo sprint.members là một mảng
    if (!sprint.members) {
      sprint.members = [];
      console.log("Khởi tạo mảng members mới vì nó chưa tồn tại");
    } else if (!Array.isArray(sprint.members)) {
      console.log("Warning: sprint.members không phải là mảng!", typeof sprint.members);
      sprint.members = [];
    }

    // Kiểm tra xem user đã là thành viên của sprint chưa
    const isMemberOfSprint = sprint.members.some(
      (member) => member.user && member.user.toString() === userId.toString()
    );

    if (isMemberOfSprint) {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã là thành viên của sprint",
      });
    }

    // Xác định vai trò của thành viên mới
    let memberRole = "member";
    
    // Nếu là người tạo sprint hoặc chủ dự án, vai trò là project_manager
    if (sprint.createdBy.toString() === userId.toString() || 
        project.owner.toString() === userId.toString()) {
      memberRole = ROLES.PROJECT_MANAGER;
    } else {
      // Lấy vai trò của người dùng trong dự án
      const memberInProject = project.members.find(
        (member) => member.user.toString() === userId.toString()
      );
      if (memberInProject && 
          (memberInProject.role === ROLES.PROJECT_MANAGER || 
           memberInProject.role === ROLES.ADMIN)) {
        memberRole = memberInProject.role;
      }
    }

    // Thêm user vào sprint
    const newMember = {
      user: userId,
      role: memberRole,
      addedAt: new Date(),
      addedBy: req.user.id,
    };
    
    console.log("Thành viên mới sẽ thêm:", JSON.stringify(newMember, null, 2));
    
    // Sử dụng updateOne thay vì save() để đảm bảo hoạt động đúng
    console.log("Cập nhật sprint bằng updateOne...");
    const updateResult = await Sprint.updateOne(
      { _id: sprintId },
      { $push: { members: newMember } }
    );
    
    console.log("Kết quả updateOne:", updateResult);

    // Kiểm tra lại xem thành viên đã được thêm chưa
    const updatedSprint = await Sprint.findById(sprintId).populate("members.user", "name email avatar");
    console.log("Sprint sau khi query lại:", JSON.stringify({
      _id: updatedSprint._id,
      name: updatedSprint.name,
      membersCount: updatedSprint.members ? updatedSprint.members.length : 0,
      membersArray: Array.isArray(updatedSprint.members),
      members: updatedSprint.members
    }, null, 2));

    console.log("=== END DEBUG addMemberToSprint ===\n");

    res.json({
      success: true,
      message: "Thêm thành viên vào sprint thành công",
      data: { 
        userId, 
        sprintId,
        member: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          },
          role: memberRole,
          addedAt: new Date()
        }
      },
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
    const { projectId, sprintId, memberId } = req.params;

    console.log("\n=== DEBUG removeMemberFromSprint ===");
    console.log("ProjectId:", projectId);
    console.log("SprintId:", sprintId);
    console.log("MemberId to remove:", memberId);
    console.log("Requester:", req.user.id, req.user.email);
    console.log("ProjectRole:", req.projectRole);

    // Kiểm tra quyền đã được xử lý bởi middleware checkPermission

    // Kiểm tra xem sprint có tồn tại không
    const sprint = await Sprint.findOne({ _id: sprintId, project: projectId });
    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: "Sprint không tồn tại",
      });
    }

    // Không cho phép xóa người tạo sprint khỏi danh sách thành viên
    if (sprint.createdBy.toString() === memberId) {
      return res.status(403).json({
        success: false,
        message: "Không thể xóa người tạo sprint khỏi danh sách thành viên",
      });
    }

    // Kiểm tra xem user có phải là thành viên của sprint không
    const memberIndex = sprint.members.findIndex(
      (member) => member.user.toString() === memberId
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
    console.log("=== END DEBUG removeMemberFromSprint ===\n");

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
