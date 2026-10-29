import { Router } from "express";

import authMiddleware from "../middlewares/auth.middleware";
import validate from "../middlewares/validate.middleware";

import {
  checkCouponValidator,
} from "../validators/coupon.validator";

import * as couponController from "../controllers/coupon.controller";

/**
 * PUBLIC + CUSTOMER ROUTES — mount tại: /api/coupons
 * Các API quản trị nằm tại: /api/admin/coupons (admin.coupon.routes.ts)
 */
const router = Router();

router.get("/public", couponController.getPublicCoupons);

router.post(
  "/check",
  authMiddleware,
  checkCouponValidator,
  validate,
  couponController.checkCoupon
);

export default router;
