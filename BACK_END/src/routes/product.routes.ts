import { Router } from "express";

import {
  productIdParamValidator,
  productSlugParamValidator,
  featuredProductsQueryValidator,
  queryProductValidator,
} from "../validators/product.validator";

import validate from "../middlewares/validate.middleware";

import * as productController from "../controllers/product.controller";

/**
 * PUBLIC ROUTES — mount tại: /api/products
 * Các API quản trị nằm tại: /api/admin/products (admin.product.routes.ts)
 * Variant công khai: /api/products/:productId/variants (product-variant.routes.ts)
 */
const router = Router();

router.get(
  "/",
  queryProductValidator,
  validate,
  productController.getPublicProducts,
);

router.get(
  "/featured",
  featuredProductsQueryValidator,
  validate,
  productController.getFeaturedProducts,
);

router.get(
  "/related/:id",
  productIdParamValidator,
  validate,
  productController.getRelatedProducts,
);

router.get(
  "/slug/:slug",
  productSlugParamValidator,
  validate,
  productController.getPublicProductBySlug,
);

router.get(
  "/:id",
  productIdParamValidator,
  validate,
  productController.getPublicProductDetail,
);

export default router;
