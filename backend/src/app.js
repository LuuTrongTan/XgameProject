import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
import cookieParser from "cookie-parser";

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
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/timelogs", timelogsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sprints", sprintRoutes);
app.use("/api/users", userRoutes);

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
