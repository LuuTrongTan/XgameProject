const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activities");
const { errorHandler } = require("./middleware/errorMiddleware");

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

// Routes
app.use("/api/users", userRoutes);
app.use("/api/activities", activityRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
