import { Router } from "express";

import {
  brandIdParamValidator,
  brandSlugParamValidator,
  queryBrandValidator,
} from "../validators/brand.validator";

import validate from "../middlewares/validate.middleware";

import * as brandController from "../controllers/brand.controller";

/**
 * PUBLIC ROUTES — mount tại: /api/brands
 * Các API quản trị nằm tại: /api/admin/brands (admin.brand.routes.ts)
 */
const router = Router();

router.get(
  "/",
  queryBrandValidator,
  validate,
  brandController.getPublicBrands,
);

router.get(
  "/slug/:slug",
  brandSlugParamValidator,
  validate,
  brandController.getPublicBrandBySlug,
);

router.get(
  "/:id",
  brandIdParamValidator,
  validate,
  brandController.getPublicBrandById,
);

export default router;
