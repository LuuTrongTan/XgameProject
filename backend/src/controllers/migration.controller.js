import Task from '../models/task.model.js';

// Migration để thêm vị trí cho các task đã tồn tại
export const migrateTaskPositions = async (req, res) => {
  try {
    console.log("[Migration] Starting task position migration...");
    
    // Lấy tất cả các trạng thái task có thể có
    const statuses = ["todo", "inProgress", "review", "done"];
    let totalMigrated = 0;
    
    // Xử lý từng trạng thái một
    for (const status of statuses) {
      // Đếm số task chưa có trường position trong status này
      const tasksMissingPosition = await Task.countDocuments({
        status,
        $or: [
          { position: { $exists: false } },
          { position: null }
        ]
      });
      
      if (tasksMissingPosition > 0) {
        console.log(`[Migration] Found ${tasksMissingPosition} tasks with status '${status}' missing position`);
        
        // Lấy tất cả tasks theo status và sắp xếp theo thời gian tạo
        const tasks = await Task.find({ status })
          .sort({ createdAt: 1 });
        
        // Cập nhật position cho từng task
        for (let i = 0; i < tasks.length; i++) {
          await Task.updateOne(
            { _id: tasks[i]._id },
            { $set: { position: i } }
          );
          totalMigrated++;
        }
        
        console.log(`[Migration] Updated ${tasks.length} tasks in '${status}' column`);
      } else {
        console.log(`[Migration] No tasks with status '${status}' need position update`);
      }
    }
    
    console.log(`[Migration] Completed - Total tasks migrated: ${totalMigrated}`);
    
    return res.json({
      success: true,
      message: `Migration completed successfully. Updated positions for ${totalMigrated} tasks.`
    });
  } catch (error) {
    console.error('[Migration Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
}; 