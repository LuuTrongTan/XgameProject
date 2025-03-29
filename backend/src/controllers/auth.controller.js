import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

// Tạo JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "7d",
  });
};
// Register a new user
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Log dữ liệu nhận được
    console.log("Received registration data:", { name, email });

    // Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Email không hợp lệ" });
    }

    // Validate password strength
    if (password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    // Check existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email đã tồn tại trong hệ thống" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user with default role "member"
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      status: "pending",
      role: "member",
    });

    // Generate email verification token
    const token = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = token;
    user.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 phút
    await user.save();

    // Tạo link xác thực
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    // Template HTML cho email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">Xác thực tài khoản Xgame Management</h2>
        <p>Xin chào ${name},</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại Xgame Management. Vui lòng nhấp vào nút bên dưới để xác thực email của bạn:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Xác thực Email
          </a>
        </div>
        <p>Hoặc copy và paste link sau vào trình duyệt:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>Link này sẽ hết hạn sau 15 phút.</p>
        <p>Nếu bạn không yêu cầu xác thực email này, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          Email này được gửi tự động, vui lòng không trả lời.
        </p>
      </div>
    `;

    try {
      // Gửi email xác thực
      await sendEmail(
        email,
        "Xác thực tài khoản Xgame Management",
        `Vui lòng nhấp vào link sau để xác thực email của bạn: ${verificationUrl}`,
        htmlContent
      );

      res.status(201).json({
        success: true,
        message:
          "Đăng ký thành công, vui lòng kiểm tra email để xác thực tài khoản",
        data: { token, user },
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Nếu gửi email thất bại, vẫn cho phép đăng ký thành công
      res.status(201).json({
        success: true,
        message:
          "Đăng ký thành công, nhưng không thể gửi email xác thực. Vui lòng liên hệ admin để được hỗ trợ.",
        data: { token, user },
      });
    }
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực không hợp lệ hoặc đã hết hạn",
      });
    }

    // Kiểm tra nếu email đã xác thực trước đó
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email đã được xác thực trước đó",
      });
    }

    // Kiểm tra token có hết hạn không
    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã xác thực đã hết hạn",
      });
    }

    // Cập nhật trạng thái xác thực email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Tạo accessToken
    const accessToken = generateToken(user._id);

    res.json({
      success: true,
      message: "Xác thực email thành công",
      data: {
        accessToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    console.error("🔥 [Verify Email Error]:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};

// Resend verification
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản với email này",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email này đã được xác thực",
      });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    await sendEmail(
      email,
      "Xác thực email",
      `Mã xác thực mới của bạn là: ${emailVerificationToken}`
    );

    res.json({
      success: true,
      message: "Đã gửi lại mã xác thực, vui lòng kiểm tra email",
      data: {
        verificationToken:
          process.env.NODE_ENV === "development"
            ? emailVerificationToken
            : undefined,
      },
    });
  } catch (error) {
    console.error("🔥 [Resend Verification Error]:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }

    // Find user with password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.DOMAIN
          : "localhost",
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: userResponse,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới",
      });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không chính xác",
      });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};

// Quên mật khẩu
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp email",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản với email này",
      });
    }

    // Tạo token đặt lại mật khẩu
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 phút
    await user.save();

    // Gửi email
    await sendEmail(
      email,
      "Đặt lại mật khẩu",
      `Mã đặt lại mật khẩu của bạn là: ${resetToken}`
    );

    res.json({
      success: true,
      message: "Đã gửi email hướng dẫn đặt lại mật khẩu",
    });
  } catch (error) {
    console.error("🔥 [Forgot Password Error]:", error);
    res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};

// Đặt lại mật khẩu

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Kiểm tra token
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token không được để trống",
      });
    }

    // Kiểm tra mật khẩu
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ mật khẩu và xác nhận mật khẩu",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp",
      });
    }

    // Tìm người dùng với token hợp lệ
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn",
      });
    }

    // Hash mật khẩu mới
    user.password = await bcrypt.hash(password, 12);

    // Xóa token sau khi đặt lại mật khẩu
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    console.error("🔥 [Reset Password Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại sau",
    });
  }
};
