import express from 'express';
import { protect, admin } from '../middlewares/auth.middleware.js';
import { migrateTaskPositions } from '../controllers/migration.controller.js';

const router = express.Router();

// Chỉ admin mới có quyền truy cập các route này
router.use(protect);
router.use(admin);

// Migration routes
router.post('/migrations/task-positions', migrateTaskPositions);

export default router; 