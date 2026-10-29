/**
 * FILE: BACK_END/src/routes/admin/admin.customer.routes.ts
 *
 * NHIỆM VỤ:
 * - Khai báo các API quản lý khách hàng.
 * - Bắt buộc đăng nhập và quyền admin (roleMiddleware dùng chung toàn hệ thống).
 * - Chạy validator trước controller.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";

import {
  getAdminCustomers,
  getAdminCustomerById,
  updateAdminCustomerStatus,
} from "../../controllers/admin/admin.customer.controller";

import {
  getAdminCustomersValidator,
  getAdminCustomerByIdValidator,
  updateAdminCustomerStatusValidator,
  validateAdminCustomerRequest,
} from "../../validators/admin/admin.customer.validator";

const router = Router();

// Tất cả endpoint bên dưới đều yêu cầu đăng nhập và quyền admin.
router.use(authMiddleware, roleMiddleware("admin"));

/**
 * GET /
 * Danh sách khách hàng có tìm kiếm, lọc, phân trang.
 */
router.get(
  "/",
  getAdminCustomersValidator,
  validateAdminCustomerRequest,
  getAdminCustomers
);

/**
 * PATCH /:id/status
 * Khóa, ngừng hoạt động hoặc khôi phục tài khoản.
 */
router.patch(
  "/:id/status",
  updateAdminCustomerStatusValidator,
  validateAdminCustomerRequest,
  updateAdminCustomerStatus
);

/**
 * GET /:id
 * Chi tiết một khách hàng.
 */
router.get(
  "/:id",
  getAdminCustomerByIdValidator,
  validateAdminCustomerRequest,
  getAdminCustomerById
);

export default router;
