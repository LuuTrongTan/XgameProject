import express from "express";
const router = express.Router();

router.get("/health-check", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

export default router;
