import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Lấy __dirname từ ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
// Import các routes
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import searchRoutes from "./routes/search.routes.js";
import timelogsRoutes from "./routes/timelogs.routes.js";
import reportRoutes from "./routes/report.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import sprintRoutes from "./routes/sprint.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import connectDB from "./config/database.js";

const app = express();
const port = process.env.PORT || 5002;

// Enable CORS for all routes
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400,
  })
);

// Middleware để parse JSON và cookies
app.use(express.json());
app.use(cookieParser());

// Phục vụ tệp tĩnh từ thư mục uploads với CORS headers
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory:", uploadsDir);
}

// Middleware đảm bảo thư mục uploads có thể truy cập
app.use("/uploads", (req, res, next) => {
  // Thêm CORS headers
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  // Thêm cache headers cho hiệu suất
  res.header("Cache-Control", "public, max-age=86400"); // Cache 1 ngày
  
  next();
}, express.static(uploadsDir));

console.log("Serving static files from:", uploadsDir);

// Route kiểm tra kết nối
app.get("/", (req, res) => {
  res.json({ message: "API đang hoạt động" });
});

// ✅ Tạo HTTP server từ Express
const server = http.createServer(app);

// ✅ Khởi tạo WebSocket
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log(`🔗 [Socket] User connected: ${socket.id}`);

  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`✅ [Socket] User ${userId} joined their private room`);
  });

  socket.on("disconnect", () => {
    console.log("❌ [Socket] User disconnected");
  });
});

// ✅ Middleware
app.use(morgan("dev"));

// API Documentation - Đặt trước các routes
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "QuanLyXGame API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "list",
      filter: true,
      showCommonExtensions: true,
    },
  })
);

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api", taskRoutes);
app.use("/api", commentRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/timelogs", timelogsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api", sprintRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/activities", activityRoutes);

// API test file để kiểm tra nội dung file và quyền truy cập
app.get('/api/test-file/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    const fileInfo = {
      filename: filename,
      exists: fs.existsSync(filePath),
      stats: fs.existsSync(filePath) ? fs.statSync(filePath) : null,
      accessible: false,
      url: `/uploads/${filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}/uploads/${filename}`
    };
    
    // Kiểm tra quyền truy cập
    try {
      if (fs.existsSync(filePath)) {
        fs.accessSync(filePath, fs.constants.R_OK);
        fileInfo.accessible = true;
      }
    } catch (accessError) {
      fileInfo.accessError = accessError.message;
    }
    
    res.json({
      success: true,
      message: 'File information',
      data: fileInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting file information',
      error: error.message
    });
  }
});

// Add debug endpoint for file system testing
app.get('/api/test-files', (req, res) => {
  try {
    const uploadDirInfo = {
      path: uploadsDir,
      exists: fs.existsSync(uploadsDir),
      files: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).slice(0, 20) : [],
      serving: '/uploads'
    };
    
    res.json({
      success: true,
      message: 'File system information',
      data: {
        uploadDirInfo,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          BACKEND_URL: process.env.BACKEND_URL || null,
          host: req.get('host'),
          protocol: req.protocol
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting file system information',
      error: error.message
    });
  }
});

// API test tệp uploads
app.get('/api/test-upload-system', (req, res) => {
  try {
    // Đường dẫn thư mục uploads
    const uploadsInfo = {
      path: uploadsDir,
      url: '/uploads',
      exists: fs.existsSync(uploadsDir),
      isDirectory: fs.existsSync(uploadsDir) ? fs.statSync(uploadsDir).isDirectory() : false,
      permissions: fs.existsSync(uploadsDir) ? fs.statSync(uploadsDir).mode.toString(8) : null,
      files: []
    };
    
    // Kiểm tra file trong thư mục (tối đa 10 file)
    if (uploadsInfo.exists && uploadsInfo.isDirectory) {
      const files = fs.readdirSync(uploadsDir).slice(0, 10);
      uploadsInfo.files = files.map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          permissions: stats.mode.toString(8),
          url: `/uploads/${file}`,
          fullUrl: `${req.protocol}://${req.get('host')}/uploads/${file}`,
        };
      });
    }
    
    // Kiểm tra model Upload
    res.json({
      success: true,
      message: 'File system information',
      data: {
        uploadsInfo,
        server: {
          env: process.env.NODE_ENV || 'development',
          baseUrl: `${req.protocol}://${req.get('host')}`,
          cors: {
            origin: res.getHeader('Access-Control-Allow-Origin') || '*',
            methods: res.getHeader('Access-Control-Allow-Methods') || 'GET, POST, PUT, DELETE',
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in test-upload-system:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking upload system',
      error: error.message
    });
  }
});

// ✅ Xử lý lỗi 404 (API không tồn tại)
app.use((req, res) => {
  console.log(`🚫 [404] ${req.method} ${req.url}`);
  res.status(404).json({ message: "🚫 API route not found" });
});

// ✅ Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("🔥 [Error]", err.message);
  res.status(500).json({ message: "🚨 Internal Server Error" });
});

// ✅ Khởi động server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(port, () => {
      console.log(`🚀 [Server] Running on port: ${port}`);
      console.log(
        `📚 [Swagger] API Documentation available at: http://localhost:${port}/api-docs`
      );
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

startServer();

export default app;
