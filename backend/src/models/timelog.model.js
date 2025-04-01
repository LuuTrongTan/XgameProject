import mongoose from "mongoose";

const TimelogSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: Date,
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TimelogSchema.index({ task: 1 });
TimelogSchema.index({ user: 1 });

const Timelog = mongoose.model("Timelog", TimelogSchema);
export default Timelog;
