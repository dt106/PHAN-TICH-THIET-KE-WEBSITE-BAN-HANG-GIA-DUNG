/**
 * FILE: BACK_END/src/routes/admin/admin.attribute.routes.ts
 *
 * NHIỆM VỤ:
 * - Định tuyến API quản trị Attribute và AttributeValue.
 * - Mount tại: /api/admin/attributes
 * - Toàn bộ API yêu cầu đăng nhập và quyền Admin.
 */

import { Router } from "express";

import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";
import validate from "../../middlewares/validate.middleware";

import {
  attributeIdParamValidator,
  attributeValueIdParamValidator,
  createAttributeValidator,
  updateAttributeValidator,
  createAttributeValueValidator,
  updateAttributeValueValidator,
} from "../../validators/attribute.validator";

import * as attributeController from "../../controllers/attribute.controller";

const router = Router();

// Tất cả API trong router yêu cầu đăng nhập và quyền Admin.
router.use(authMiddleware, roleMiddleware("admin"));

// Route tĩnh khai báo trước /:id để không bị /:id bắt nhầm.
router.post(
  "/",
  createAttributeValidator,
  validate,
  attributeController.createAttribute,
);

router.put(
  "/values/:valueId",
  updateAttributeValueValidator,
  validate,
  attributeController.updateAttributeValue,
);

router.delete(
  "/values/:valueId",
  attributeValueIdParamValidator,
  validate,
  attributeController.deleteAttributeValue,
);

router.post(
  "/:id/values",
  createAttributeValueValidator,
  validate,
  attributeController.createAttributeValue,
);

router.put(
  "/:id",
  updateAttributeValidator,
  validate,
  attributeController.updateAttribute,
);

router.delete(
  "/:id",
  attributeIdParamValidator,
  validate,
  attributeController.deleteAttribute,
);

export default router;
