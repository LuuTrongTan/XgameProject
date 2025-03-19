import express from "express";
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Các API xác thực và quản lý tài khoản
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@example.com"
 *         avatar:
 *           type: string
 *           example: "default-avatar.png"
 *         role:
 *           type: string
 *           enum: [member, admin]
 *           example: "member"
 *         position:
 *           type: string
 *           example: "Developer"
 *         department:
 *           type: string
 *           example: "IT"
 *         phoneNumber:
 *           type: string
 *           example: "0123456789"
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["JavaScript", "React", "Node.js"]
 *         isEmailVerified:
 *           type: boolean
 *           example: true
 *         status:
 *           type: string
 *           enum: [active, inactive, blocked]
 *           example: "active"
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T12:00:00.000Z"
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *         error:
 *           type: string
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token được trả về sau khi đăng nhập thành công
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng nhập
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: Thông tin đăng nhập không chính xác
 *       500:
 *         description: Lỗi server
 */
router.post("/login", login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Đăng ký tài khoản mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [admin, project_manager, member]
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *
 *         description: Lỗi server
 */
router.post("/register", register);

/**
 * @swagger
 * /api/auth/verify-email/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Xác thực email
 *     description: API để xác thực email sau khi đăng ký
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token xác thực email
 *     responses:
 *       200:
 *         description: Xác thực email thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Xác thực email thành công"
 *       400:
 *         description: Token xác thực không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Token xác thực không hợp lệ hoặc đã hết hạn"
 *               error: "Invalid Token"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/verify-email/:token", verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Gửi lại email xác thực
 *     description: API để gửi lại email xác thực cho tài khoản chưa được xác thực
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email cần gửi lại xác thực
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Gửi lại email xác thực thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email xác thực đã được gửi lại thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     verificationToken:
 *                       type: string
 *                       description: Token xác thực (chỉ trả về trong môi trường development)
 *                       example: "abc123..."
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-02T12:00:00.000Z"
 *       400:
 *         description: Email không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Email không tồn tại hoặc đã được xác thực"
 *               error: "Bad Request"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/resend-verification", resendVerification);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Lấy thông tin người dùng hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Lỗi server
 */
router.get("/me", protect, getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     tags: [Auth]
 *     summary: Đổi mật khẩu
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       401:
 *         description: Mật khẩu hiện tại không đúng
 *       500:
 *         description: Lỗi server
 */
router.put("/change-password", protect, changePassword);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Quên mật khẩu
 *     description: API để gửi email đặt lại mật khẩu cho tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email của tài khoản cần đặt lại mật khẩu
 *                 example: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Gửi email đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email đặt lại mật khẩu đã được gửi thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: Token đặt lại mật khẩu (chỉ trả về trong môi trường development)
 *                       example: "abc123..."
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-02T12:00:00.000Z"
 *       404:
 *         description: Email không tồn tại
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Email không tồn tại trong hệ thống"
 *               error: "Not Found"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Đặt lại mật khẩu
 *     description: API để đặt lại mật khẩu mới cho tài khoản
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token đặt lại mật khẩu nhận được từ email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Mật khẩu mới (tối thiểu 6 ký tự)
 *                 example: "newpass123"
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Đặt lại mật khẩu thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-01-01T12:00:00.000Z"
 *       400:
 *         description: Token không hợp lệ hoặc mật khẩu không đủ mạnh
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"
 *               error: "Bad Request"
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/reset-password/:token", resetPassword);

export default router;
