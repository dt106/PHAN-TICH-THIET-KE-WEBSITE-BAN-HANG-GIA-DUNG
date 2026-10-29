/**
 * FILE: BACK_END/src/routes/admin/admin.product.routes.ts
 *
 * NHIỆM VỤ:
 * - Định tuyến API quản trị Product.
 * - Mount tại: /api/admin/products
 * - Toàn bộ API yêu cầu đăng nhập và quyền Admin.
 * - Variant và media của sản phẩm định tuyến riêng:
 *   /api/admin/products/:productId/variants, /api/admin/products/:productId/media.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import validate from "../../middlewares/validate.middleware";

import {
  productIdParamValidator,
  createProductValidator,
  updateProductValidator,
  toggleProductStatusValidator,
  toggleProductFeaturedValidator,
  queryProductValidator,
} from "../../validators/product.validator";

import * as productController from "../../controllers/product.controller";

const router = Router();

// Tất cả API trong router yêu cầu đăng nhập và quyền Admin.
router.use(authMiddleware, roleMiddleware("admin"));

// Route tĩnh khai báo trước /:id để không bị /:id bắt nhầm.
router.get(
  "/all",
  queryProductValidator,
  validate,
  productController.getAdminProducts,
);

router.post(
  "/",
  createProductValidator,
  validate,
  productController.createProduct,
);

router.get(
  "/:id",
  productIdParamValidator,
  validate,
  productController.getAdminProductById,
);

router.put(
  "/:id",
  updateProductValidator,
  validate,
  productController.updateProduct,
);

router.patch(
  "/:id/status",
  toggleProductStatusValidator,
  validate,
  productController.toggleProductStatus,
);

router.patch(
  "/:id/featured",
  toggleProductFeaturedValidator,
  validate,
  productController.toggleProductFeatured,
);

router.delete(
  "/:id",
  productIdParamValidator,
  validate,
  productController.deleteProduct,
);

export default router;
