import express from 'express';
import { getTaskHistory } from '../controllers/task.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { logAction } from '../middlewares/auditlog.middleware.js';

const router = express.Router();

// Lấy lịch sử thay đổi của một task
router.get(
  '/projects/:projectId/sprints/:sprintId/tasks/:taskId/history',
  protect,
  logAction(
    'Task',
    'view',
    (req) => req.params.taskId,
    (req) => ({
      viewedBy: req.user.id,
      viewedAt: new Date()
    })
  ),
  getTaskHistory
);

export default router; 