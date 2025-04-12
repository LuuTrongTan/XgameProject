// CommonJS import
console.log("Starting test script");

try {
  // Import mongoose
  const mongoose = require('mongoose');
  console.log("Mongoose imported");

  // Connect to MongoDB
  mongoose.connect('mongodb://localhost:27017/qlxgame1')
    .then(() => {
      console.log("MongoDB connected");
      
      // Import models
      const Task = require('./src/models/task.model.js');
      const User = require('./src/models/user.model.js');
      const Project = require('./src/models/project.model.js');
      console.log("Models imported");
      
      // Find a user and project
      return Promise.all([
        User.findOne(),
        Project.findOne()
      ]);
    })
    .then(([user, project]) => {
      if (!user || !project) {
        throw new Error("User or project not found");
      }
      
      console.log("User ID:", user._id);
      console.log("Project ID:", project._id);
      
      // Create a task with actualTime
      const Task = mongoose.model('Task');
      const task = new Task({
        title: 'Test Task with Time',
        description: 'This is a test task with actualTime for testing dashboard',
        project: project._id,
        status: 'done',
        estimatedTime: 4,
        actualTime: 5.5,
        createdBy: user._id,
        assignees: [user._id]
      });
      
      return task.save();
    })
    .then(task => {
      console.log("Task created with ID:", task._id);
      console.log("actualTime =", task.actualTime);
      
      // Find all tasks with actualTime > 0
      const Task = mongoose.model('Task');
      return Task.find({ actualTime: { $gt: 0 } }).select('title actualTime');
    })
    .then(tasks => {
      console.log("Tasks with actualTime > 0:", tasks.length);
      console.log("Total actualTime:", tasks.reduce((sum, t) => sum + t.actualTime, 0));
      
      // Disconnect from MongoDB
      return mongoose.disconnect();
    })
    .then(() => {
      console.log("MongoDB disconnected");
    })
    .catch(err => {
      console.error("Error:", err);
      mongoose.disconnect();
    });
} catch (e) {
  console.error("Uncaught error:", e);
} 