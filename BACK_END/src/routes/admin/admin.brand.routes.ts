/**
 * FILE: BACK_END/src/routes/admin/admin.brand.routes.ts
 *
 * NHIỆM VỤ:
 * - Định tuyến API quản trị Brand.
 * - Mount tại: /api/admin/brands
 * - Toàn bộ API yêu cầu đăng nhập và quyền Admin.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import validate from "../../middlewares/validate.middleware";

import {
  brandIdParamValidator,
  createBrandValidator,
  updateBrandValidator,
  toggleBrandStatusValidator,
  queryBrandValidator,
} from "../../validators/brand.validator";

import * as brandController from "../../controllers/brand.controller";

const router = Router();

// Tất cả API trong router yêu cầu đăng nhập và quyền Admin.
router.use(authMiddleware, roleMiddleware("admin"));

// Route tĩnh khai báo trước /:id để không bị /:id bắt nhầm.
router.get(
  "/all",
  queryBrandValidator,
  validate,
  brandController.getAdminBrands,
);

router.post(
  "/",
  createBrandValidator,
  validate,
  brandController.createBrand,
);

router.get(
  "/:id",
  brandIdParamValidator,
  validate,
  brandController.getAdminBrandById,
);

router.put(
  "/:id",
  updateBrandValidator,
  validate,
  brandController.updateBrand,
);

router.patch(
  "/:id/status",
  toggleBrandStatusValidator,
  validate,
  brandController.toggleBrandStatus,
);

router.delete(
  "/:id",
  brandIdParamValidator,
  validate,
  brandController.deleteBrand,
);

export default router;
