const express = require("express");
const router = express.Router();
const Activity = require("../models/Activity");
const auth = require("../middleware/auth");

// @route   GET /api/activities/recent
// @desc    Get recent activities of the user
// @access  Private
router.get("/recent", auth, async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user.id })
      .sort({ timestamp: -1 })
      .limit(10);

    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/activities
// @desc    Create a new activity
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const { type, action, title, description } = req.body;

    const activity = new Activity({
      user: req.user.id,
      type,
      action,
      title,
      description,
      timestamp: Date.now(),
    });

    await activity.save();
    res.json(activity);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
