import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";

// Cấu hình Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hệ thống Quản lý Task API",
      version: "1.0.0",
      description:
        "API documentation cho hệ thống quản lý task với đầy đủ các chức năng CRUD",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
      "x-postman-collection": {
        name: "Task Management API Collection",
        description: "Postman collection for Task Management API",
        version: "1.0.0",
      },
    },
    servers: [
      {
        url: "http://localhost:3002/api",
        description: "Local Development Server",
      },
      {
        url: "https://api-staging.example.com",
        description: "Staging Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: "Tasks",
        description: "API endpoints cho quản lý tasks",
      },
      {
        name: "Users",
        description: "API endpoints cho quản lý người dùng",
      },
    ],
  },
  apis: ["./src/routes/*.js", "./src/models/*.js"], // Bao gồm cả models để swagger có thể đọc các schema
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const swaggerUiOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Task Management API Documentation",
  customfavIcon: "/assets/favicon.ico",
  explorer: true,
};

// Tạo thư mục docs nếu chưa tồn tại
const docsPath = path.join(process.cwd(), "docs");
if (!fs.existsSync(docsPath)) {
  fs.mkdirSync(docsPath);
}

// Lưu OpenAPI specification vào file
fs.writeFileSync(
  path.join(docsPath, "openapi.json"),
  JSON.stringify(swaggerDocs, null, 2)
);

export default (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocs, swaggerUiOptions)
  );

  // Endpoint để tải OpenAPI specification
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocs);
  });
};
