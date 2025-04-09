import express from "express";
import cors from "cors";
import userRoutes from "./src/routes/user.routes.js";
import activityRoutes from "./src/routes/activity.routes.js";
import { errorHandler } from "./src/middlewares/error.middleware.js";

const app = express();

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:3001", // Frontend URL
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware
app.use((req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);

// Error handling
app.use(errorHandler);

export default app;
