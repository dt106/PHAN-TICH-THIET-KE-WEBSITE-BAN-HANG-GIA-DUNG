
/**
 * =========================================================
 * FILE: BACK_END/src/routes/statistics/customer.statistics.routes.ts
 * =========================================================
 *
 * Prefix được đăng ký trong app.ts:
 * /api/customer/statistics
 * =========================================================
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";

import {
  getCustomerStatistics,
  getCustomerOrderStatistics,
  getCustomerReviewStatistics,
} from "../../controllers/statistics/customer.statistics.controller";

const router = Router();

/**
 * Tất cả API trong router đều yêu cầu:
 * 1. JWT hợp lệ.
 * 2. Role customer (roleMiddleware dùng chung toàn hệ thống).
 */
router.use(authMiddleware, roleMiddleware("customer"));

router.get("/overview", getCustomerStatistics);
router.get("/orders", getCustomerOrderStatistics);
router.get("/reviews", getCustomerReviewStatistics);

export default router;
