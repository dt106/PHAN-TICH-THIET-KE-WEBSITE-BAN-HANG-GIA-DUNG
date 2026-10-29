/**
 * FILE: BACK_END/src/routes/admin/admin.category.routes.ts
 *
 * NHIỆM VỤ:
 * - Định tuyến API quản trị Category.
 * - Mount tại: /api/admin/categories
 * - Toàn bộ API yêu cầu đăng nhập và quyền Admin.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import validate from "../../middlewares/validate.middleware";

import {
  categoryIdParamValidator,
  createCategoryValidator,
  updateCategoryValidator,
  toggleCategoryStatusValidator,
  updateSortOrderValidator,
  queryCategoryValidator,
} from "../../validators/category.validator";

import * as categoryController from "../../controllers/category.controller";

const router = Router();

// Tất cả API trong router yêu cầu đăng nhập và quyền Admin.
router.use(authMiddleware, roleMiddleware("admin"));

// Route tĩnh khai báo trước /:id để không bị /:id bắt nhầm.
router.get(
  "/all",
  queryCategoryValidator,
  validate,
  categoryController.getAdminCategories,
);

router.post(
  "/",
  createCategoryValidator,
  validate,
  categoryController.createCategory,
);

router.put(
  "/sort-order",
  updateSortOrderValidator,
  validate,
  categoryController.updateSortOrder,
);

router.get(
  "/:id",
  categoryIdParamValidator,
  validate,
  categoryController.getAdminCategoryById,
);

router.put(
  "/:id",
  updateCategoryValidator,
  validate,
  categoryController.updateCategory,
);

router.patch(
  "/:id/status",
  toggleCategoryStatusValidator,
  validate,
  categoryController.toggleCategoryStatus,
);

router.delete(
  "/:id",
  categoryIdParamValidator,
  validate,
  categoryController.deleteCategory,
);

export default router;
