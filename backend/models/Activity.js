const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["project", "task", "comment"],
    required: true,
  },
  action: {
    type: String,
    enum: ["created", "updated", "completed", "deleted"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Activity", ActivitySchema);
