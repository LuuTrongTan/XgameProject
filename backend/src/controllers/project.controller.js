import Project from "../models/project.model.js";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Comment from "../models/comment.model.js";
import sendEmail from "../utils/sendEmail.js";
import { ROLES } from "../config/constants.js";
import crypto from "crypto";

// Validate dữ liệu đầu vào
const validateProjectData = (data) => {
  const errors = [];

  // Log dữ liệu đầu vào
  console.log("Validating project data:", data);

  // Validate name
  if (!data.name || typeof data.name !== "string") {
    errors.push("Tên dự án là bắt buộc");
  } else if (data.name.trim().length < 3 || data.name.trim().length > 100) {
    errors.push("Tên dự án phải từ 3-100 ký tự");
  }

  // Validate description
  if (!data.description || typeof data.description !== "string") {
    errors.push("Mô tả dự án là bắt buộc");
  } else if (
    data.description.trim().length < 5 ||
    data.description.trim().length > 2000
  ) {
    errors.push("Mô tả dự án phải từ 5-2000 ký tự");
  }

  // Validate status
  const validStatuses = ["Đang hoạt động", "Hoàn thành", "Đóng"];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push("Trạng thái dự án không hợp lệ");
  }

  // Validate dates
  if (data.startDate && data.dueDate) {
    const start = new Date(data.startDate);
    const due = new Date(data.dueDate);
    if (isNaN(start.getTime()) || isNaN(due.getTime())) {
      errors.push("Ngày không hợp lệ");
    } else if (start > due) {
      errors.push("Ngày bắt đầu phải trước ngày kết thúc");
    }
  }

  // Log kết quả validation
  console.log("Validation errors:", errors);
  return errors;
};

// Kiểm tra quyền của người dùng trong dự án
const checkPermission = (project, userId, requiredRoles = []) => {
  if (project.owner.toString() === userId.toString()) return true;
  const member = project.members.find(
    (m) => m.user.toString() === userId.toString()
  );
  return (
    member &&
    (requiredRoles.length === 0 || requiredRoles.includes(member.role))
  );
};

// Lấy danh sách tất cả dự án mà user có quyền truy cập
export const getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = {
      $or: [{ owner: req.user }, { "members.user": req.user }],
    };

    // Lọc theo trạng thái
    if (status) query.status = status;

    // Tìm kiếm theo tên hoặc mô tả
    if (search) {
      query.$and = [
        query, // Giữ điều kiện quyền truy cập
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    // Truy vấn dự án
    const projects = await Project.find(query)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ createdAt: -1 });

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
        return {
          ...project.toObject(),
          stats,
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithStats,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách dự án",
      error: error.message,
    });
  }
};

// Lấy thông tin chi tiết của một dự án
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar position department")
      .populate({
        path: "documents",
        populate: { path: "uploadedBy", select: "name email avatar" },
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền truy cập: chỉ cho phép owner, project-manager hoặc thành viên của dự án
    const isMember = project.members.some(
      (member) =>
        member.user._id.toString() === req.user.id &&
        ["member", "project_manager"].includes(member.role)
    );

    if (!(req.user.id === project.owner._id.toString() || isMember)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập dự án này",
      });
    }

    // Lấy thống kê dự án
    const stats = {
      totalTasks: await Task.countDocuments({ project: project._id }),
      completedTasks: await Task.countDocuments({
        project: project._id,
        status: "done",
      }),
      totalMembers: project.members.length,
      totalDocuments: project.documents.length,
      recentActivities: await getRecentActivities(project._id),
    };

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết dự án",
      error: error.message,
    });
  }
};

// Tạo dự án mới
export const createProject = async (req, res) => {
  try {
    console.log(
      "==================== DEBUG CREATE PROJECT ===================="
    );
    console.log("Request body:", req.body);
    console.log("Request user:", req.user);

    const { name, description, status, members } = req.body;

    // Xác nhận tính hợp lệ của dữ liệu
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Tên và mô tả dự án là bắt buộc",
      });
    }

    console.log("Tạo project mới với thông tin:", {
      name,
      description,
      status,
    });

    // Tạo dự án mới
    const project = new Project({
      name,
      description,
      status: status || "Đang hoạt động",
      owner: req.user.id,
      members: [
        { user: req.user.id, role: "project_manager", joinedAt: new Date() },
      ],
    });

    console.log("Created project object:", project);

    // Xử lý danh sách thành viên nếu có
    if (members && Array.isArray(JSON.parse(members))) {
      console.log("Processing members:", JSON.parse(members));
      const memberList = JSON.parse(members);

      // Bỏ qua việc gửi lời mời qua email - chỉ thêm thành viên trực tiếp
      for (const member of memberList) {
        // Kiểm tra email hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(member.email)) {
          console.log(`Invalid email: ${member.email}`);
          continue; // Bỏ qua email không hợp lệ
        }

        // Kiểm tra role hợp lệ
        if (!Object.values(ROLES).includes(member.role)) {
          console.log(`Invalid role: ${member.role}`);
          continue; // Bỏ qua role không hợp lệ
        }

        // Thêm thành viên vào dự án
        const user = await User.findOne({ email: member.email });
        if (user) {
          console.log(`Found user for email ${member.email}: ${user._id}`);
          // Kiểm tra xem đã là thành viên chưa
          if (
            !project.members.some(
              (m) => m.user.toString() === user._id.toString()
            )
          ) {
            project.members.push({
              user: user._id,
              role: member.role,
              joinedAt: new Date(),
            });
            console.log(`Added member ${user._id} with role ${member.role}`);
          }
        } else {
          console.log(`User not found for email: ${member.email}`);
        }
      }
    }

    console.log("Final project members:", project.members);

    // Lưu dự án vào database
    await project.save();
    console.log("Project saved successfully with ID:", project._id);

    // Trả về dự án đã tạo
    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    console.log("Returning populated project:", populatedProject._id);
    console.log("==================== END DEBUG ====================");

    res.status(201).json({
      success: true,
      message: "Dự án đã được tạo thành công",
      data: populatedProject,
    });
  } catch (error) {
    console.error(
      "==================== ERROR CREATING PROJECT ===================="
    );
    console.error("Error details:", error);
    console.error("Stack trace:", error.stack);
    console.error("==================== END ERROR ====================");

    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo dự án: " + error.message,
      error: error.message,
    });
  }
};

// Cập nhật thông tin dự án
export const updateProject = async (req, res) => {
  try {
    console.log("Received update request with body:", req.body);
    console.log("Request headers:", req.headers);
    console.log("Content-Type:", req.headers["content-type"]);

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    if (!checkPermission(project, req.user.id, ["Admin", "Project Manager"])) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền chỉnh sửa dự án này",
      });
    }

    // Kiểm tra xem dữ liệu có phải là FormData không
    const isFormData = req.headers["content-type"]?.includes(
      "multipart/form-data"
    );
    let projectData;

    if (isFormData) {
      // Xử lý dữ liệu từ FormData
      projectData = {
        name: req.body.name?.trim(),
        description: req.body.description?.trim(),
        status: req.body.status || project.status,
        startDate: req.body.startDate || project.startDate,
        dueDate: req.body.dueDate || project.dueDate,
        members: req.body.members
          ? JSON.parse(req.body.members)
          : project.members,
      };

      // Log chi tiết dữ liệu nhận được
      console.log("FormData received:", {
        name: req.body.name,
        description: req.body.description,
        status: req.body.status,
        startDate: req.body.startDate,
        dueDate: req.body.dueDate,
        members: req.body.members,
      });

      // Log dữ liệu đã xử lý
      console.log("Processed FormData:", projectData);
    } else {
      // Xử lý dữ liệu JSON
      projectData = req.body;
    }

    // Validate dữ liệu
    const errors = validateProjectData(projectData);
    console.log("Validation errors:", errors);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
        errors,
      });
    }

    // Cập nhật thông tin dự án
    const updatedFields = [
      "name",
      "description",
      "status",
      "startDate",
      "dueDate",
      "members",
    ];

    console.log("Current project:", {
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      dueDate: project.dueDate,
      members: project.members,
    });

    updatedFields.forEach((field) => {
      if (projectData[field] !== undefined) {
        if (field === "members") {
          // Xử lý đặc biệt cho trường members
          project.members = projectData.members.map((member) => ({
            user: member.user,
            role: member.role || ROLES.MEMBER,
            joinedAt: member.joinedAt || new Date(),
          }));
        } else {
          project[field] = projectData[field];
        }
      }
    });

    // Nếu dự án hoàn thành, cập nhật completedAt
    if (projectData.status === "Hoàn thành" && !project.completedAt) {
      project.completedAt = new Date();
    }

    console.log("Project before save:", project);
    await project.save();
    console.log("Project after save:", project);

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    // Gửi thông báo cập nhật
    global.io.emit("project_updated", {
      project: populatedProject,
      updater: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật dự án thành công",
      data: populatedProject,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật dự án:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      body: req.body,
      headers: req.headers,
    });
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật dự án",
      error: error.message,
    });
  }
};

// Xóa dự án và dữ liệu liên quan
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    if (!checkPermission(project, req.user.id, ["Admin"])) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa dự án này",
      });
    }

    // Xóa tất cả dữ liệu liên quan
    await Task.deleteMany({ project: project._id });
    await Comment.deleteMany({ project: project._id });
    await project.deleteOne();

    // Gửi thông báo xóa dự án
    global.io.emit("project_deleted", {
      projectId: project._id,
      deletedBy: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Đã xóa dự án và tất cả dữ liệu liên quan",
    });
  } catch (error) {
    console.error("Lỗi khi xóa dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa dự án",
      error: error.message,
    });
  }
};

// gửi lời mời tham gia dự án
export const inviteMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id).populate(
      "members.user",
      "email"
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    if (
      !checkPermission(project, req.user.id, [
        ROLES.ADMIN,
        ROLES.PROJECT_MANAGER,
      ])
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền mời thành viên",
      });
    }

    // Kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Kiểm tra role hợp lệ
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ",
      });
    }

    // Kiểm tra nếu email đã là thành viên
    const existingMember = project.members.some(
      (member) => member.user.email === email
    );
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã là thành viên của dự án",
      });
    }

    // Tạo mã mời
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteLink = `${process.env.FRONTEND_URL}/projects/join/${project._id}?token=${inviteToken}`;

    // Gửi email lời mời
    try {
      await sendEmail(
        email,
        "Lời mời tham gia dự án",
        `Bạn được mời tham gia dự án "${project.name}" với vai trò ${role}. 
        Nhấp vào liên kết sau để tham gia: ${inviteLink}`
      );
    } catch (emailError) {
      console.error("Lỗi khi gửi email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email lời mời",
      });
    }
    if (!project.invitations) {
      project.invitations = []; // Khởi tạo mảng nếu chưa có
    }

    // Lưu lời mời vào dự án
    project.invitations.push({
      email,
      role,
      token: inviteToken,
      invitedBy: req.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Hết hạn sau 7 ngày
    });

    await project.save();

    res.json({
      success: true,
      message: "Đã gửi lời mời thành công",
    });
  } catch (error) {
    console.error("Lỗi khi gửi lời mời:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi gửi lời mời",
      error: error.message,
    });
  }
};

// thêm thành viên trực tiếp vào dự án
export const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findById(req.params.id).populate(
      "members.user",
      "email"
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    if (
      !checkPermission(project, req.user.id, [
        ROLES.ADMIN,
        ROLES.PROJECT_MANAGER,
      ])
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thêm thành viên",
      });
    }

    // Kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Email không hợp lệ",
      });
    }

    // Kiểm tra role hợp lệ
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ",
      });
    }

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng với email này",
      });
    }

    // Kiểm tra nếu user đã là thành viên
    const existingMember = project.members.some(
      (member) => member.user.toString() === user._id.toString()
    );
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Người dùng đã là thành viên của dự án",
      });
    }

    // Thêm thành viên mới vào dự án
    project.members.push({
      user: user._id,
      role: role,
      joinedAt: new Date(),
    });

    await project.save();

    // Gửi thông báo realtime nếu có
    if (global.io) {
      global.io.emit("member_joined", {
        project: project._id,
        member: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: role,
        },
      });
    }

    // Populate thông tin thành viên mới
    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    res.json({
      success: true,
      message: "Đã thêm thành viên thành công",
      data: populatedProject,
    });
  } catch (error) {
    console.error("Lỗi khi thêm thành viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi thêm thành viên",
      error: error.message,
    });
  }
};

// Chấp nhận lời mời tham gia dự án
export const acceptInvitation = async (req, res) => {
  try {
    const { projectId, token } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Tìm lời mời
    const invitation = project.invitations.find(
      (inv) => inv.token === token && inv.email === req.user.email
    );

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: "Lời mời không hợp lệ hoặc đã hết hạn",
      });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Lời mời đã hết hạn",
      });
    }

    // Thêm thành viên mới
    project.members.push({
      user: req.user.id,
      role: invitation.role,
      joinedAt: new Date(),
    });

    // Xóa lời mời
    project.invitations = project.invitations.filter(
      (inv) => inv.token !== token
    );

    await project.save();

    // Gửi thông báo có thành viên mới
    global.io.emit("member_joined", {
      project: project._id,
      member: {
        id: req.user.id,
        name: req.user.name,
        role: invitation.role,
      },
    });

    res.json({
      success: true,
      message: "Tham gia dự án thành công",
      data: project,
    });
  } catch (error) {
    console.error("Lỗi khi chấp nhận lời mời:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi chấp nhận lời mời",
      error: error.message,
    });
  }
};

// Xóa thành viên khỏi dự án
export const removeMember = async (req, res) => {
  try {
    const { id: projectId, userId: memberId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền (chỉ Admin hoặc Project Manager mới được phép xóa thành viên)
    if (!checkPermission(project, req.user.id, ["Admin", "Project Manager"])) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền xóa thành viên",
      });
    }

    // Không cho phép xóa chủ sở hữu dự án
    if (project.owner.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa chủ sở hữu dự án",
      });
    }

    // Không cho phép xóa chính mình
    if (req.user.id === memberId) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự xóa chính mình khỏi dự án",
      });
    }

    // Đảm bảo danh sách thành viên tồn tại trước khi xóa
    if (!project.members || project.members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dự án không có thành viên để xóa",
      });
    }

    // Kiểm tra xem thành viên có tồn tại trong danh sách không
    const memberExists = project.members.some(
      (member) => member.user.toString() === memberId
    );
    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: "Thành viên không tồn tại trong dự án",
      });
    }

    // Xóa thành viên khỏi danh sách
    project.members = project.members.filter(
      (member) => member.user.toString() !== memberId
    );

    await project.save();

    // Gửi thông báo xóa thành viên qua WebSocket
    global.io.emit("member_removed", {
      project: project._id,
      memberId,
      removedBy: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Đã xóa thành viên khỏi dự án",
      data: project,
    });
  } catch (error) {
    console.error("Lỗi khi xóa thành viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa thành viên",
      error: error.message,
    });
  }
};

// Cập nhật quyền của thành viên
export const updateMemberRole = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    if (!checkPermission(project, req.user.id, [ROLES.ADMIN])) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật role thành viên",
      });
    }

    // Kiểm tra role hợp lệ
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role không hợp lệ",
      });
    }

    // Cập nhật role
    const memberIndex = project.members.findIndex(
      (member) => member.user.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thành viên trong dự án",
      });
    }

    project.members[memberIndex].role = role;
    await project.save();

    // Gửi thông báo cập nhật role
    global.io.emit("member_role_updated", {
      project: project._id,
      memberId,
      newRole: role,
      updatedBy: {
        id: req.user.id,
        name: req.user.name,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật role thành công",
      data: project,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật role thành viên:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật role thành viên",
      error: error.message,
    });
  }
};

// Lấy hoạt động gần đây của dự án
const getRecentActivities = async (projectId) => {
  const activities = [];

  // Lấy các task mới
  const recentTasks = await Task.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("createdBy", "name");

  recentTasks.forEach((task) => {
    activities.push({
      type: "task_created",
      task: task.title,
      user: task.createdBy.name,
      date: task.createdAt,
    });
  });

  // Lấy các comment mới
  const recentComments = await Comment.find({ project: projectId })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("author", "name");

  recentComments.forEach((comment) => {
    activities.push({
      type: "comment_added",
      content: comment.content,
      user: comment.author.name,
      date: comment.createdAt,
    });
  });

  // Sắp xếp theo thời gian gần nhất
  return activities.sort((a, b) => b.date - a.date).slice(0, 10);
};

// Archive project
export const archiveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền
    if (!checkPermission(project, req.user.id, ["Admin", "Project Manager"])) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền archive dự án này",
      });
    }

    // Archive project
    project.isArchived = true;
    project.status = "Đóng";
    await project.save();

    res.json({
      success: true,
      message: "Dự án đã được archive",
      data: project,
    });
  } catch (error) {
    console.error("Lỗi khi archive dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi archive dự án",
      error: error.message,
    });
  }
};

// Restore project
export const restoreProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Dự án không tồn tại",
      });
    }

    // Kiểm tra quyền
    if (!checkPermission(project, req.user.id, ["Admin", "Project Manager"])) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền restore dự án này",
      });
    }

    // Restore project
    project.isArchived = false;
    project.status = "Đang hoạt động";
    await project.save();

    res.json({
      success: true,
      message: "Dự án đã được restore",
      data: project,
    });
  } catch (error) {
    console.error("Lỗi khi restore dự án:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi restore dự án",
      error: error.message,
    });
  }
};
