
/**
 * FILE: BACK_END/src/routes/admin/admin.review.routes.ts
 *
 * NHIỆM VỤ:
 * - Khai báo API quản lý đánh giá.
 * - Yêu cầu đăng nhập và quyền admin.
 * - Validate request trước khi gọi controller.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";

import {
    getAdminReviews,
    getAdminReviewById,
    updateAdminReviewApproval,
    deleteAdminReview,
} from "../../controllers/admin/admin.review.controller";

import {
    getAdminReviewsValidator,
    adminReviewIdValidator,
    updateAdminReviewApprovalValidator,
    validateAdminReviewRequest,
} from "../../validators/admin/admin.review.validator";

const router = Router();

router.use(authMiddleware, roleMiddleware("admin"));

/**
 * GET /
 * Danh sách đánh giá.
 */
router.get(
    "/",
    getAdminReviewsValidator,
    validateAdminReviewRequest,
    getAdminReviews
);

/**
 * PATCH /:id/approval
 * Duyệt hoặc ẩn đánh giá.
 */
router.patch(
    "/:id/approval",
    updateAdminReviewApprovalValidator,
    validateAdminReviewRequest,
    updateAdminReviewApproval
);

/**
 * DELETE /:id
 * Xóa đánh giá.
 */
router.delete(
    "/:id",
    adminReviewIdValidator,
    validateAdminReviewRequest,
    deleteAdminReview
);

/**
 * GET /:id
 * Chi tiết đánh giá.
 */
router.get(
    "/:id",
    adminReviewIdValidator,
    validateAdminReviewRequest,
    getAdminReviewById
);

export default router;
