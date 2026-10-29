import { Router } from "express";

import {
  attributeIdParamValidator,
} from "../validators/attribute.validator";

import validate from "../middlewares/validate.middleware";

import * as attributeController from "../controllers/attribute.controller";

/**
 * PUBLIC ROUTES — mount tại: /api/attributes
 * Các API quản trị nằm tại: /api/admin/attributes (admin.attribute.routes.ts)
 */
const router = Router();

router.get("/", attributeController.getAllAttributes);

router.get(
  "/:id",
  attributeIdParamValidator,
  validate,
  attributeController.getAttributeById,
);

export default router;
