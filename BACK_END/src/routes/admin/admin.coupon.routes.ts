/**
 * FILE: BACK_END/src/routes/admin/admin.coupon.routes.ts
 *
 * NHIỆM VỤ:
 * - Định tuyến API quản trị Coupon và CouponUsage.
 * - Mount tại: /api/admin/coupons
 * - Toàn bộ API yêu cầu đăng nhập và quyền Admin.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import validate from "../../middlewares/validate.middleware";

import {
  couponIdParamValidator,
  createCouponValidator,
  updateCouponValidator,
  adminCouponsQueryValidator,
} from "../../validators/coupon.validator";

import * as couponController from "../../controllers/coupon.controller";

const router = Router();

// Tất cả API trong router yêu cầu đăng nhập và quyền Admin.
router.use(authMiddleware, roleMiddleware("admin"));

router.get(
  "/",
  adminCouponsQueryValidator,
  validate,
  couponController.getAllCouponsAdmin,
);

router.post(
  "/",
  createCouponValidator,
  validate,
  couponController.createCoupon,
);

router.get(
  "/:id",
  couponIdParamValidator,
  validate,
  couponController.getCouponByIdAdmin,
);

router.put(
  "/:id",
  updateCouponValidator,
  validate,
  couponController.updateCoupon,
);

router.patch(
  "/:id/status",
  couponIdParamValidator,
  validate,
  couponController.toggleCouponStatus,
);

router.delete(
  "/:id",
  couponIdParamValidator,
  validate,
  couponController.deleteCoupon,
);

router.get(
  "/:id/usages",
  couponIdParamValidator,
  validate,
  couponController.getCouponUsages,
);

export default router;
