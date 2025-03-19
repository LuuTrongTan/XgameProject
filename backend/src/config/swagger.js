import swaggerJsdoc from "swagger-jsdoc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "QuanLyXGame API Documentation",
      version: "1.0.0",
      description: "API documentation cho hệ thống quản lý XGame",
    },
    servers: [
      {
        url: "http://localhost:3002/api",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication operations",
      },
      {
        name: "Projects",
        description: "Quản lý dự án",
      },
      {
        name: "Tasks",
        description: "Quản lý công việc",
      },
    ],
    components: {
      schemas: {
        User: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            _id: {
              type: "string",
              description: "ID của người dùng",
              example: "507f1f77bcf86cd799439011",
            },
            name: {
              type: "string",
              description: "Tên người dùng",
              example: "John Doe",
            },
            email: {
              type: "string",
              format: "email",
              description: "Email người dùng",
              example: "john.doe@example.com",
            },
            password: {
              type: "string",
              description: "Mật khẩu đã được mã hóa",
              example: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR",
            },
            avatar: {
              type: "string",
              description: "URL ảnh đại diện",
              example: "uploads/avatar.jpg",
            },
            isVerified: {
              type: "boolean",
              description: "Trạng thái xác thực email",
              example: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Thời điểm tạo",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Thời điểm cập nhật cuối",
            },
          },
        },
        Project: {
          type: "object",
          required: ["name", "description"],
          properties: {
            _id: {
              type: "string",
              description: "ID của dự án",
              example: "507f1f77bcf86cd799439012",
            },
            name: {
              type: "string",
              description: "Tên dự án",
              example: "Dự án XGame",
            },
            description: {
              type: "string",
              description: "Mô tả dự án",
              example: "Phát triển hệ thống quản lý game",
            },
            status: {
              type: "string",
              enum: ["Active", "Completed", "Archived"],
              description: "Trạng thái dự án",
              example: "Active",
            },
            avatar: {
              type: "string",
              description: "URL ảnh đại diện dự án",
              example: "uploads/project-avatar.jpg",
            },
            owner: {
              $ref: "#/components/schemas/User",
            },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: {
                    $ref: "#/components/schemas/User",
                  },
                  role: {
                    type: "string",
                    enum: ["Admin", "Project Manager", "Member"],
                    example: "Member",
                  },
                },
              },
            },
            isArchived: {
              type: "boolean",
              description: "Trạng thái lưu trữ",
              example: false,
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Thời điểm tạo",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Thời điểm cập nhật cuối",
            },
          },
        },
        Task: {
          type: "object",
          required: ["title", "description", "projectId"],
          properties: {
            _id: {
              type: "string",
              description: "ID của công việc",
              example: "507f1f77bcf86cd799439013",
            },
            title: {
              type: "string",
              description: "Tiêu đề công việc",
              example: "Thiết kế giao diện",
            },
            description: {
              type: "string",
              description: "Mô tả công việc",
              example: "Thiết kế giao diện người dùng cho module quản lý",
            },
            project: {
              $ref: "#/components/schemas/Project",
            },
            assignee: {
              $ref: "#/components/schemas/User",
            },
            status: {
              type: "string",
              enum: ["todo", "in_progress", "review", "done"],
              description: "Trạng thái công việc",
              example: "todo",
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Độ ưu tiên",
              example: "medium",
            },
            dueDate: {
              type: "string",
              format: "date",
              description: "Hạn hoàn thành",
              example: "2024-12-31",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Thời điểm tạo",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Thời điểm cập nhật cuối",
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [path.resolve(__dirname, "../routes/*.js")],
};

// Force Swagger to reload the routes
const specs = swaggerJsdoc({
  ...options,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "list",
    filter: true,
    showCommonExtensions: true,
  },
});

export { specs };
