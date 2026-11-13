import { Router } from "express";

import {
  productIdParamValidator,
  mediaIdParamValidator,
  createMediaValidator,
  createBatchMediaValidator,
  updateMediaValidator,
  updateSortOrderValidator,
  deleteBatchMediaValidator,
} from "../validators/product-media.validator";

import validate from "../middlewares/validate.middleware";
import authMiddleware from "../middlewares/auth.middleware";
import roleMiddleware from "../middlewares/role.middleware";
import {
  uploadMultipleImagesMiddleware,
} from "../middlewares/upload.middleware";

import * as mediaController from "../controllers/product-media.controller";

const router = Router();

router.get(
  "/products/:productId/media",
  productIdParamValidator,
  validate,
  mediaController.getMediaByProduct
);

router.get(
  "/admin/products/:productId/media",
  authMiddleware,
  roleMiddleware("admin"),
  productIdParamValidator,
  validate,
  mediaController.getMediaByProduct
);

router.post(
  "/admin/products/:productId/media",
  authMiddleware,
  roleMiddleware("admin"),
  createMediaValidator,
  validate,
  mediaController.createMedia
);

router.post(
  "/admin/products/:productId/media/batch",
  authMiddleware,
  roleMiddleware("admin"),
  createBatchMediaValidator,
  validate,
  mediaController.createBatchMedia
);

router.put(
  "/admin/media/:id",
  authMiddleware,
  roleMiddleware("admin"),
  updateMediaValidator,
  validate,
  mediaController.updateMedia
);

router.patch(
  "/admin/media/:id/primary",
  authMiddleware,
  roleMiddleware("admin"),
  mediaIdParamValidator,
  validate,
  mediaController.setPrimaryMedia
);

router.put(
  "/admin/products/:productId/media/sort-order",
  authMiddleware,
  roleMiddleware("admin"),
  updateSortOrderValidator,
  validate,
  mediaController.updateMediaSortOrder
);

router.delete(
  "/admin/media/:id",
  authMiddleware,
  roleMiddleware("admin"),
  mediaIdParamValidator,
  validate,
  mediaController.deleteMedia
);

router.delete(
  "/admin/products/:productId/media",
  authMiddleware,
  roleMiddleware("admin"),
  deleteBatchMediaValidator,
  validate,
  mediaController.deleteBatchMedia
);
// Upload một hoặc nhiều ảnh từ máy tính.
router.post(
  "/admin/products/:productId/media/upload",
  authMiddleware,
  roleMiddleware("admin"),
  uploadMultipleImagesMiddleware.array("files", 20),
  productIdParamValidator,
  validate,
  mediaController.uploadMediaFiles,
);

export default router;
