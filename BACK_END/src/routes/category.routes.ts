import { Router } from "express";

import {
  categoryIdParamValidator,
  categorySlugParamValidator,
  queryCategoryValidator,
} from "../validators/category.validator";

import validate from "../middlewares/validate.middleware";

import * as categoryController from "../controllers/category.controller";

/**
 * PUBLIC ROUTES — mount tại: /api/categories
 * Các API quản trị nằm tại: /api/admin/categories (admin.category.routes.ts)
 */
const router = Router();

router.get(
  "/",
  queryCategoryValidator,
  validate,
  categoryController.getPublicCategories,
);

router.get("/tree", categoryController.getPublicCategoryTree);

router.get(
  "/slug/:slug",
  categorySlugParamValidator,
  validate,
  categoryController.getPublicCategoryBySlug,
);

router.get(
  "/:id",
  categoryIdParamValidator,
  validate,
  categoryController.getPublicCategoryById,
);

export default router;
