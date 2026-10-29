
/**
 * =========================================================
 * FILE: BACK_END/src/routes/statistics/admin.statistics.routes.ts
 * =========================================================
 *
 * NHIỆM VỤ:
 * - Định tuyến API thống kê User dành cho Admin.
 * - Xác thực JWT + quyền Admin (roleMiddleware dùng chung toàn hệ thống).
 * =========================================================
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";

import {
  getAdminUserStatistics,
} from "../../controllers/statistics/admin.statistics.controller";

const router = Router();

// Tất cả API trong router yêu cầu đăng nhập và quyền Admin.
router.use(authMiddleware, roleMiddleware("admin"));

// Thống kê User.
router.get("/users", getAdminUserStatistics);

export default router;
